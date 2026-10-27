# 拾光 · 个人博客

一个纯静态的中文个人博客。页面和示例文章在 `dist/index.html`，不需要安装依赖或本地构建。

## 本地预览

在仓库根目录运行：

```powershell
python -m http.server 8787 --directory dist
```

然后打开 `http://127.0.0.1:8787`。

## 发布到 GitHub Pages

仓库默认分支为 `main`。推送到 `main` 后，`.github/workflows/deploy.yml` 会将 `dist/` 发布到 GitHub Pages；也可以在 Actions 页面手动运行 `Deploy blog to GitHub Pages`。

首次发布时，在仓库的 **Settings → Pages → Build and deployment** 中将 **Source** 设为 **GitHub Actions**。工作流需要 `pages: write` 和 `id-token: write` 权限来部署页面。

## 修改文章

编辑 `dist/index.html` 中 `const posts = [...]` 数组。每篇文章包含日期、标题、摘要、标签和正文段落；把关于介绍、年份和文案改成自己的内容即可。
