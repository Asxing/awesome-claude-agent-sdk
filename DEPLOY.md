# GitHub Pages 部署说明

本项目已配置为使用 Jekyll 部署到 GitHub Pages。

## 📦 已完成的配置

### 1. Jekyll 配置文件
- ✅ `docs/_config.yml` - Jekyll 核心配置
- ✅ `docs/index.md` - 首页（从 README.md 改造）
- ✅ `docs/assets/css/custom.css` - 自定义样式

### 2. 文档 Front Matter
所有 15 个教程文档已添加 YAML front matter：
- ✅ 00-introduction.md ~ 14-advanced-features.md
- ✅ 导航层级已配置（基础入门、会话管理、输出与提示、工具与扩展、高级特性）

### 3. Git 配置
- ✅ `.gitignore` 已更新，忽略 Jekyll 缓存文件

## 🚀 部署步骤

### 步骤 1：提交代码

```bash
# 添加所有更改
git add docs/_config.yml docs/index.md docs/*.md docs/assets/ .gitignore

# 提交
git commit -m "docs: setup Jekyll for GitHub Pages

- Add Jekyll configuration with just-the-docs theme
- Convert README.md to index.md homepage
- Add front matter to all 15 documentation files
- Create custom CSS for Chinese font optimization
- Update .gitignore for Jekyll cache files"

# 推送到远程仓库
git push origin master
```

### 步骤 2：GitHub 仓库设置

1. 访问 GitHub 仓库：https://github.com/asxing/awesome-claude-agent-sdk
2. 进入 **Settings** → **Pages**
3. **Source** 选择：`Deploy from a branch`
4. **Branch** 选择：
   - Branch: `master`
   - Folder: `/docs`
5. 点击 **Save**

### 步骤 3：等待部署

- GitHub Pages 会自动构建（约 1-2 分钟）
- 构建完成后，访问：https://asxing.github.io/awesome-claude-agent-sdk/

### 步骤 4：验证部署

检查以下功能是否正常：
- [ ] 首页正确显示
- [ ] 侧边栏导航正常
- [ ] 搜索功能可用
- [ ] 所有 15 个文档可访问
- [ ] 代码高亮正确
- [ ] 中文字体显示正常
- [ ] 移动端响应式布局正常

## 🎨 主题说明

使用 **just-the-docs** 主题（v0.8.2）：
- 专为技术文档设计
- 支持搜索、导航、代码高亮
- 响应式设计，移动端友好
- GitHub Pages 原生支持

## 📝 后续更新

添加新文档时，只需：

1. 在 `docs/` 目录创建新的 `.md` 文件
2. 添加 front matter：

```yaml
---
layout: default
title: 文档标题
nav_order: 顺序号
parent: 父级分类
---
```

3. 提交并推送，GitHub Pages 会自动更新

## 🔧 本地预览（可选）

如果需要本地预览（需要 Ruby 环境）：

```bash
# 进入 docs 目录
cd docs

# 创建 Gemfile
cat > Gemfile << EOF
source "https://rubygems.org"
gem "jekyll", "~> 4.3"
gem "just-the-docs", "~> 0.8.2"
gem "jekyll-seo-tag"
gem "jekyll-sitemap"
EOF

# 安装依赖
bundle install

# 本地运行
bundle exec jekyll serve

# 访问 http://localhost:4000/awesome-claude-agent-sdk/
```

**注意：** 本地预览是可选的，不影响 GitHub Pages 线上部署。

## 📚 文档结构

```
docs/
├── _config.yml              # Jekyll 配置
├── index.md                 # 首页
├── 00-introduction.md       # 基础入门
├── 01-streaming-input.md
├── 02-handling-permissions.md
├── 03-user-approvals.md
├── 04-hooks.md
├── 05-session-management.md # 会话管理
├── 06-file-checkpointing.md
├── 07-structured-outputs.md # 输出与提示
├── 08-system-prompts.md
├── 09-mcp-servers.md        # 工具与扩展
├── 10-custom-tools.md
├── 11-subagents.md          # 高级特性
├── 12-slash-commands.md
├── 13-skills.md
├── 14-advanced-features.md
└── assets/
    └── css/
        └── custom.css       # 自定义样式
```

## 🐛 常见问题

### Q: 部署后页面显示 404
A: 检查 GitHub Pages 设置中的分支和目录是否正确（master 分支，/docs 目录）

### Q: 样式不正常
A: 等待 2-3 分钟让 GitHub Pages 完成构建，清除浏览器缓存后重试

### Q: 搜索功能不工作
A: just-the-docs 主题的搜索功能在首次构建后可能需要几分钟才能生效

### Q: 中文字体显示异常
A: 检查 `_config.yml` 中的 `head_custom` 配置是否正确引用了 custom.css

## 📞 支持

如有问题，请：
1. 检查 GitHub Actions 构建日志
2. 查看 [just-the-docs 文档](https://just-the-docs.github.io/just-the-docs/)
3. 提交 Issue 到项目仓库

---

**祝部署顺利！🎉**
