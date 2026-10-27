# 拾光 · 个人博客

一个纯静态中文博客，GitHub Actions 每小时从 Notion 同步已发布文章并部署到 GitHub Pages。

## 本地预览

在仓库根目录运行：

    python -m http.server 8787 --directory dist

打开 http://127.0.0.1:8787。

## 用 Notion 写文章

在 Notion 建一个文章数据库，属性名称和类型如下：

| 属性 | 类型 | 用途 |
| --- | --- | --- |
| 标题 | 标题 | 文章标题 |
| 日期 | 日期 | 文章日期 |
| 摘要 | 文本 | 列表页摘要 |
| 标签 | 多选 | 文章标签 |
| 已发布 | 复选框 | 勾选后发布，未勾选则为草稿 |

正文写在数据库条目页面中。发布的文章会在下一次工作流运行时同步；也可以在仓库 Actions → Deploy blog to GitHub Pages → Run workflow 手动运行。

## 一次性连接设置

1. 在 Notion Developer Portal 创建 Internal Integration，并授予读取内容的能力。
2. 在文章数据库的分享/连接设置中，将 integration 添加为连接。
3. 在 GitHub 仓库 Settings → Secrets and variables → Actions 添加：
   - Repository secret：NOTION_API_KEY，填 Notion integration secret。不要把它提交到仓库或发在聊天中。
   - Repository variable：NOTION_DATABASE_ID，填文章数据库 URL 中的数据库 ID。
4. 在 Actions 页面手动运行一次部署。

属性也可用英文名 Title、Date、Summary、Tags；发布复选框名称需为 已发布。工作流会跳过未配置连接的同步步骤，并照常部署示例文章。
