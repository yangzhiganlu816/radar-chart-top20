# 雷达图 Top20 通用模板

一个**单文件、零依赖、可离线运行**的多维评价榜单可视化模板。用雷达图对比 20 个条目在 6 个维度上的表现，支持逐项播放、分数编辑、成就自定义和 BEST 转场。

打开 `index.html` 就能用 —— 不需要构建、不需要服务器、不发任何网络请求。

![效果预览](preview.png)

## 📖 文档

按你的身份挑一份：

| 文档 | 适合谁 | 内容 |
|---|---|---|
| **[GUIDE.md](GUIDE.md)** | 🤖 **完全不懂编程** | 傻瓜版：把文件丢给 AI 怎么说、怎么配图、常见问题 |
| **[TUTORIAL.md](TUTORIAL.md)** | 💻 **有编程基础** | 开发者教程：数据流、排序算法、图片管线、调试技巧、常见坑 |
| **[ABOUT.md](ABOUT.md)** | 📋 **想快速了解** | 项目介绍：这是什么、能做什么、技术取舍 |

## 特性

- **单文件**：HTML + CSS + JS 全在一个文件里，双击即用
- **零依赖**：无框架、无 CDN、无外部请求，断网也能跑
- **数据可编辑**：分数、成就文案都能在页面上直接改，存在 localStorage
- **图片可填充**：支持批量加载本地文件夹，按文件名自动匹配条目
- **图片性能优化**：base64 转 blob URL、`img.decode()` 预解码、LRU 缓存、空闲时段预取，切换条目不卡顿
- **主题色自动分配**：按顺序取色，相邻条目颜色始终可辨识，新增条目不会撞色
- **BEST 转场**：某条目在任一维度登顶时触发专属过场动画

## 30 秒上手

```
直接双击 index.html
```

**想改成自己的内容？** 别手动改代码 —— 看 [GUIDE.md](GUIDE.md)，里面有可以直接复制给 AI 的提问模板。

**有编程基础？** 看 [TUTORIAL.md](TUTORIAL.md)，讲清楚了数据流、排序算法、图片管线和调试方法。

## 配置速查

所有需要改的东西都集中在文件开头附近（搜这些关键词）：

| 想改什么 | 搜这个 | 注意 |
|---|---|---|
| 条目名字和分数 | `singersRawOrder` | 增删行即可；**改完记得 bump `DATA_VERSION`** |
| 维度名称 | `dimNames` | 顺序要和 `points` 对应 |
| 维度说明文案 | `dimDescriptions` | 顺序同上 |
| 维度权重 | `rankingWeightPercent` | **总和必须为 100** |
| 主题配色 | `themePalette` | 按排名顺序取色，改名/增删不会失配 |
| 默认成就文案 | `achievementDefaults` | 按索引取 |
| 统计区间 | `rankingPeriod` | 显示在开场规则页 |
| 雷达图刻度上限 | `RADAR_MAX_SCORE` | 默认 10 |

⚠️ **最容易踩的坑**：在代码里改了初始数据后，**必须把 `DATA_VERSION` 也改一下**（搜 `DATA_VERSION`）。否则用户浏览器里存的旧分数会覆盖你的新数据 —— 这是 `checkVersion` 的清理机制决定的。

## 快捷键

| 键 | 作用 |
|---|---|
| `Ctrl + E` | 开/关六维分数编辑面板 |
| `←` / `→` | 上一条 / 下一条 |
| `空格` | 暂停 / 继续 |
| `Enter` | 确认编辑 |
| `Esc` | 取消编辑 |

## 数据存在哪

全部在浏览器 localStorage，**不上传任何服务器**：

| key | 内容 |
|---|---|
| `radarChart_points` | 各条目分数 |
| `radarChart_honors` | 各条目成就文案 |
| `radarChart_achievements` | 可编辑成就 |
| `radarChart_portraits` | 条目照片 |
| `radarChart_best_photos` | BEST 转场照片 |
| `radarChart_best_backgrounds` | BEST 背景图 |

界面上点「↺ 重置全部」可清空。**换浏览器或清缓存后图片要重配。**

## 浏览器兼容

需要 `requestIdleCallback`（Chrome / Edge / Safari / Firefox 较新版本），代码里有 `setTimeout` 降级分支。用到 ES2020+ 语法（可选链 `?.`、空值合并 `??`）和 Canvas 2D。

## 许可

MIT，见 [LICENSE](LICENSE)。
## 许可

MIT，见 [LICENSE](LICENSE)。
