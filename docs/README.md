# 杭州房价深度分析系统 · 部署指南

## 一、本地运行（开发 / 演示）

由于前端通过 `fetch` 加载 `data/*.json`，**必须通过 HTTP 服务打开**（直接双击 `index.html` 会因浏览器安全策略失败）。

```bash
cd hangzhou-house-platform
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

## 二、替换为真实数据

平台严格遵循"数据真实性"（规格书 7.1）。当前 `data/` 下为**示例数据**，请替换为：

| 文件 | 内容 | 来源建议 |
|------|------|----------|
| `house_price.json` | 小区房价 | 你提供的真实导出（合规源），或后续接入的采集管道 |
| `school_district.json` | 学校 / 学区 | 高德 POI（爬虫生成）或教育局官网 |
| `block_info.json` | 板块 / 配套 | 高德周边搜索（爬虫补全） |

只要把 `is_sample` 字段移除或置为 `false`，顶部"示例数据"横幅会自动消失。

## 三、启用 GitHub Actions 定时爬虫

1. 将本仓库推送到 GitHub。
2. **Settings → Secrets and variables → Actions → New repository secret**：
   - Name: `AMAP_KEY`　Value: 你的高德 Key（见 `docs/API-Key-配置指南.md`）。
3. **Settings → Pages**：Source 选择 `Deploy from a branch` → `main` / `root`（或 `gh-pages`）。
4. 工作流 `.github/workflows/crawler.yml` 将在**每天北京时间 00:00** 自动抓取学校/配套 POI 并提交 JSON；GitHub Pages 自动托管前端。

> 高德 Key 仅存在于 GitHub Actions Secrets 与爬虫服务端，**绝不会进入前端代码**（满足 7.1 安全条款）。

## 四、目录结构

```
hangzhou-house-platform/
├── index.html              # 语义化页面骨架
├── css/style.css           # 布局与视觉规范（BEM / Flex-Grid / 响应式）
├── js/                     # ES6 模块化前端
│   ├── config.js           # 配色 / 色阶 / 规范常量
│   ├── data.js             # 数据加载与存储
│   ├── map.js              # Leaflet 地图（热力/多边形/标记/弹窗/筛选）
│   ├── charts.js           # ECharts 图表
│   ├── schools.js          # 学区筛选与列表
│   ├── facilities.js       # 配套评分（权重体系）
│   ├── ui.js               # 面板 / 标签页 / 交互
│   └── main.js             # 启动入口
├── data/                   # JSON 数据源（被爬虫每日更新）
├── crawler/                # Python 爬虫 + GitHub Actions
└── docs/                   # 本文档与 API Key 指南
```
