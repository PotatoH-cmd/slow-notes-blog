import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiKey = process.env.NOTION_API_KEY;
const databaseId = process.env.NOTION_DATABASE_ID;
if (!apiKey && !databaseId) {
  console.log('Notion sync skipped; add NOTION_API_KEY and NOTION_DATABASE_ID to enable it.');
  process.exit(0);
}
if (!apiKey || !databaseId) {
  console.error('Both NOTION_API_KEY and NOTION_DATABASE_ID are required.');
  process.exit(1);
}

const apiVersion = '2026-03-11';
const headers = {
  Authorization: 'Bearer ' + apiKey,
  'Notion-Version': apiVersion,
  'Content-Type': 'application/json',
};

async function notion(path, options = {}) {
  const response = await fetch('https://api.notion.com/v1' + path, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error('Notion API ' + response.status + ': ' + (data.message || data.code || 'request failed'));
  }
  return data;
}

function richText(items = []) {
  return items.map((item) => item.plain_text || '').join('');
}

function propertyValue(properties, name, type) {
  const property = properties[name];
  return property && property[type];
}

async function getChildren(blockId, depth = 0) {
  if (depth > 5) return [];
  const blocks = [];
  let cursor;
  do {
    const query = new URLSearchParams({ page_size: '100' });
    if (cursor) query.set('start_cursor', cursor);
    const page = await notion('/blocks/' + blockId + '/children?' + query);
    blocks.push(...page.results);
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);

  const paragraphs = [];
  for (const block of blocks) {
    const content = block[block.type];
    let text = richText(content && content.rich_text);
    if (block.type === 'child_page') text = content.title || '';
    if (block.type === 'image' || block.type === 'video' || block.type === 'file' || block.type === 'pdf') {
      text = content && content.caption ? richText(content.caption) : '';
    }
    if (block.type === 'equation') text = content.expression || '';
    if (block.type === 'bulleted_list_item') text = '• ' + text;
    if (block.type === 'numbered_list_item') text = '1. ' + text;
    if (block.type === 'quote' || block.type === 'callout') text = '「' + text + '」';
    if (block.type === 'code') text = richText(content && content.rich_text);
    if (text.trim()) paragraphs.push(text.trim());
    if (block.has_children) paragraphs.push(...await getChildren(block.id, depth + 1));
  }
  return paragraphs;
}

function toPost(page) {
  const properties = page.properties || {};
  const title = richText(propertyValue(properties, '标题', 'title') || propertyValue(properties, 'Title', 'title') || []);
  const date = (propertyValue(properties, '日期', 'date') && propertyValue(properties, '日期', 'date').start) || (propertyValue(properties, 'Date', 'date') && propertyValue(properties, 'Date', 'date').start) || page.created_time.slice(0, 10);
  const summary = richText(propertyValue(properties, '摘要', 'rich_text') || propertyValue(properties, 'Summary', 'rich_text') || []);
  const tags = propertyValue(properties, '标签', 'multi_select') || propertyValue(properties, 'Tags', 'multi_select') || [];
  return { id: page.id, date, title, summary, tags: tags.map((tag) => tag.name), body: [] };
}

async function main() {
  const database = await notion('/databases/' + databaseId);
  const dataSourceId = database.data_sources && database.data_sources[0] && database.data_sources[0].id;
  if (!dataSourceId) throw new Error('This database has no accessible data source. Share it with the Notion integration and try again.');

  const pages = [];
  let cursor;
  do {
    const result = await notion('/data_sources/' + dataSourceId + '/query', {
      method: 'POST',
      body: JSON.stringify({
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
        filter: { property: '已发布', checkbox: { equals: true } },
      }),
    });
    pages.push(...result.results);
    cursor = result.has_more ? result.next_cursor : undefined;
  } while (cursor);

  const posts = await Promise.all(pages.map(async (page) => {
    const post = toPost(page);
    post.body = await getChildren(page.id);
    return post;
  }));
  posts.sort((a, b) => b.date.localeCompare(a.date));

  const output = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/notion-posts.json');
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(posts, null, 2) + '
', 'utf8');
  console.log('Synced ' + posts.length + ' published Notion article(s) to dist/notion-posts.json.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
