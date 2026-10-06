# 开发者教程

面向有编程基础的人。假设你熟悉 HTML / CSS / JS，能读懂 IIFE、闭包、`localStorage`。

行号基于当前 `index.html`（约 4800 行）。**行号会漂移，用 `Ctrl+F` 搜代码片段更可靠** —— 每个小节都给了搜索关键词。

---

## 1. 整体架构

整个应用是**一个 HTML 文件里的三段独立 `<script>`**：

| script       | 作用                                        |
| ------------ | ----------------------------------------- |
| #1（约 2700 行） | 核心：数据、状态机、渲染、动画。包在一个 IIFE 里，**不暴露任何全局变量** |
| #2（34 行）     | 人脸定位钩子（当前是空实现，见 §9）                       |
| #3（约 330 行）  | 照片/模板自定义面板的 UI 逻辑                         |

页面 DOM 大部分在 HTML 里静态写死，JS 负责填内容和驱动动画。

**为什么值得知道**：没有 `var` 泄漏到 `window`，所以你在控制台敲 `bands` 是 `undefined` 的。这是刻意的（避免命名冲突），但意味着**调试时不能直接在控制台改状态** —— 得先在代码里加临时 `window.__debug = { bands, currentIdx, ... }`。

---

## 2. 数据流：一条清晰的单向链

这是理解整个模板的主线：

```
singersRawOrder  （你编辑的源数据，20 条）
      ↓
singersRaw       （浅拷贝 [...singersRawOrder]）
      ↓  loadFromStorage() 覆盖分数和 honors
      ↓  globalMax 重算（注意：在 load 之后）
bands            （带排名的最终对象，渲染层只认这个）
      ↓
switchToBand() / switchToBandBest()
      ↓
Canvas 2D 雷达图 + DOM 面板
```

**关键设计：`bands` 是渲染层唯一的数据源。** 任何界面上的东西都从 `bands[i]` 取，改 `bands` 就改了界面。

### `bands[i]` 的字段

```js
{
    name: "项目1",                    // 条目名
    points: [...],                    // 6 个维度的原始分数（0~10）
    rawWeightedTotal: 8.7,            // 排序用的原始加权分（未映射）
    weightedTotal: "8.70",            // 显示用的映射后总分（字符串）
    honors: [...],                    // 成就文案
    color: "#F3A6C8",                 // 主题色，按 idx 取自 themePalette
    bg1: "#1a1a0a", bg2: "#0d0d02",   // 背景渐变
    duration: 10000,                  // 时间轴占宽（毫秒）
    precisions: [...],                // 各维度的显示精度（小数位）
    championDims: [...],              // 在哪些维度上并列第一（→ BEST）
    showRank: 20,                     // 显示名次（totalCount - idx）
}
```

`championDims` 是关键 —— 它同时驱动雷达图的高亮、BEST 标记、转场判定。**并列第一会全部进这个数组**，没有暗箱取舍。

---

## 3. 排序：整数加权，避免浮点陷阱

搜 `weightedScoreUnits`。

```js
const rankingWeightPercent = [25, 20, 20, 13, 10, 12];
const rankingWeights = rankingWeightPercent.map(weight => weight / 100);

function weightedScoreUnits(points) {
    return points.reduce((sum, score, dimension) =>
        sum + Math.round(score * 100) * rankingWeightPercent[dimension], 0);
}
```

**为什么先 `Math.round(score * 100)`**：把浮点转成整数再累加。如果直接用 `0.1 + 0.2` 那种浮点误差累加，会出现"两个条目算出来数学上相等，但 JS 认为不等"导致的**误排序** —— 而且这种 bug 极难排查。

`rankingWeightPercent` 总和必须为 100（模板里也用于界面显示）。

### 显示口径 ≠ 排序口径

搜 `displayWeightedScore`。显示总分走一段三段线性映射，锚点：

```js
const DISPLAY_TOTAL_MIN_RAW = 7.83;
const DISPLAY_TOTAL_ANCHOR_RAW = 8.5;   // 基准：8.5 进 8.5 出，基准不动
const DISPLAY_TOTAL_MAX_OUT = 10.5;
```

8.5 分以上那一段斜率被拉长，让头部维度更外溢。

**这段映射绝不参与排序。** 名次、并列关系、相对档位只由 `weightedScoreUnits` 决定。你可以随便调视觉呈现，不会意外改变排名 —— 这是刻意设计。

---

## 4. 雷达图：非线性半径映射

搜 `dimensionRadiusRatio`。

```js
const RADAR_MAX_SCORE = 10;
const RADAR_NONLINEAR_POWER = 1.8;
const RADAR_OVERFLOW_THRESHOLD = 8.5;
```

`score / 10` 先走 `pow(x, 1.8)` 让中低分更靠外，8.5 分以上再接一段线性拉长，保证 10 分时图形不溢出画布。

**这个映射只改视觉半径，不改原始分数，也不改排名。** 坐标轴永远固定 0~10。

---

## 5. 改数据：唯一需要动的三处

### 5.1 条目数据

搜 `singersRawOrder`（约 1692 行）：

```js
const singersRawOrder = [
    {
        name: "项目1",                    // 条目名（照片匹配靠它）
        points: [8, 7, 8.5, 9, 9, 5.5],   // 6 个维度，顺序同 dimNames
        honors: ["🏆 成就一", "🎤 成就二", "💿 成就三", "📈 成就四"],
        duration: 10000                   // 时间轴占宽（毫秒）
    },
    // ... 增删条目直接增删这一行
];
```

**增删条目是安全的** —— 配色（`themeColorAt(idx)`）、默认成就（`achievementAt(group, idx)`）都按索引取，条目数变化会自动适配，超过 20 个会循环取色。

**注意 `points` 数量必须和 `dimNames` 一致**，否则 `points[6]` 是 `undefined`，后续 `Math.round(undefined * 100)` 得到 `NaN`，排序会崩。

### 5.2 维度定义

搜 `dimNames`（约 2447 行）：

```js
const dimNames = ["全年热度","爆曲战绩","体量与商务","专业荣誉","现场实力","原创能力"];
```

搜 `dimDescriptions`（约 1925 行）—— 开场规则页的说明文案，**顺序必须和 `dimNames` 对应**。

搜 `rankingWeightPercent`（约 1871 行）—— 权重，**总和必须为 100**。

**改这三个数组，界面全局同步。** 开场规则页的维度明细、雷达图标签、分数面板都是同源生成的（`renderRulesPanel()`，搜约 4297 行），不会出现"改了维度名，规则页还显示旧名"的不同步。

### 5.3 配色

搜 `themePalette`（约 1627 行）：

```js
const themePalette = [
    "#F3A6C8", "#7C3AED", "#9B6DFF", "#3557D4", "#20B8CD",
    // ... 共 20 个
];
```

**按排名顺序取色，不按名字索引。** 这是刻意的 —— 名字会被改写、增删、调顺序，按名字索引会全部失配（这是本模板从旧版本继承并修掉的一个 bug）。相邻条目颜色必定可辨识。

### 5.4 默认文案

搜 `achievementDefaults`（约 1729 行）—— 三组成就文案（综合荣誉 / 代表作 / 数据亮点），按索引取。  
搜 `albumTexts` / `mvpTexts`（约 2979 / 2985 行）—— 成绩标签的两个短句。

---

## 6. 持久化

搜 `LS_KEY_`（约 1813 行）：

```js
const DATA_VERSION = "1.0.0";          // 改动初始数据结构后手动 +1
const LS_KEY_VER  = 'radarChart_version';
const LS_KEY_ACH  = 'radarChart_achievements';
const LS_KEY_PTS  = 'radarChart_points';
const LS_KEY_HON  = 'radarChart_honors';
```

| key                           | 存什么         |
| ----------------------------- | ----------- |
| `radarChart_points`           | 每个条目的 6 个分数 |
| `radarChart_honors`           | 每个条目的成就文案   |
| `radarChart_achievements`     | 三组可编辑成就     |
| `radarChart_portraits`        | 条目卡片照片      |
| `radarChart_best_photos`      | BEST 转场照片   |
| `radarChart_best_backgrounds` | BEST 背景图    |
| `radarChart_version`          | 数据版本号       |

**关键机制**（搜 `checkVersion`）：启动时对比 `DATA_VERSION`，不一致就清空所有用户数据。所以 ——

> ⚠️ **你改了 `singersRawOrder` 之后，必须把 `DATA_VERSION` 也改掉（比如 `"1.0.1"`），否则用户浏览器里的旧分数会覆盖你的新数据。**

这是最容易踩的坑。改初始数据 = 必须 bump 版本号。

清空用户数据：搜 `clearStorage()`，或者界面上点「↺ 重置全部」。

**数据只存在本地浏览器，不上传任何服务器。**

---

## 7. BEST 判定

搜索 `hasBestDim`（约 2463 行）。**BEST 判定有两条路径，都指向同一结果，但数据源不同** —— 改这块时务必看清你在改哪条。

**路径 A：`globalMax` 数组**（`bands` 构造时用，约 1991 行）

```js
const champDims = [];
for (let i = 0; i < dimCount; i++) {
    if (Math.abs(s.points[i] - globalMax[i]) < 0.001) champDims.push(i);
}
```

用 `Math.abs(...) < 0.001` 而不是 `===` —— 容差比较，避免浮点误差让"本该并列"判成不并列。`champDims` 存进 `bands[i]`，驱动雷达图高亮。

**路径 B：`getMaxScoreInDim` 实时计算**（`isBestInDim` 用，约 2452 行）

```js
function getMaxScoreInDim(dimIdx) {
    return Math.max(...singersRaw.map(s => s.points[dimIdx] || 0));
}
function isBestInDim(singerName, dimIdx) {
    const maxScore = getMaxScoreInDim(dimIdx);
    if (maxScore === 0) return false;              // 整列都是 0 时不标 BEST
    const singer = singersRaw.find(s => s.name === singerName);
    if (!singer) return false;
    return singer.points[dimIdx] === maxScore;     // 严格相等 → 并列全部标记
}
```

`globalMax` 有三处赋值，时机都正确：

| 位置   | 时机                         | 数据源                    |
| ---- | -------------------------- | ---------------------- |
| 1719 | 启动初始化                      | `singersRawOrder`（源数据） |
| 1870 | `loadFromStorage()` **之后** | `singersRaw`（含用户编辑）    |
| 2517 | `commitScoreEdit()` 里      | 重新 `getMaxScoreInDim`  |

所以**用户改分数后 BEST 会跟着变**，不需要手动重算。如果你发现 BEST 不跟着分数变，八成是这三处之一被挪动或删掉了。

`getMaxScoreInDim` 每次实时 `Math.max` 遍历（只有 20×6，开销可忽略），不用缓存 —— 换来"永远不会因为缓存没更新而判错"。`isBestInDim` 的 `maxScore === 0` 守卫是有意的：某一维全为 0 时不该有人被标 BEST。

---

## 8. 图片管线（性能核心）

这块处理过大基数下的切换卡顿，值得单独讲。

### 8.1 dataURL → blob URL

搜 `dataUrlToBlobUrl`（约 2732 行）。

直接把几十 MB 的 base64 塞进 `<img src>`，浏览器每次切换都要在主线程同步做 base64 解码 + 图像解码 —— 必然掉帧。方案是**一次性转成 `blob:` URL 并缓存**（`blobUrlCache`），后续复用。

### 8.2 预解码 + LRU

搜 `getDecodedImage`（约 2763 行）。

用 `img.decode()` 提前完成解码，替换 `src` 时基本不再付出解码代价。`decodedImageCache` 是 LRU，`MAX_DECODED_IMAGES = 6` —— 只保留最近 6 张解码位图，防止内存堆积。

同一个地址的并发请求共用一次解码（`decodeTasks`）。

### 8.3 空闲预取

搜 `schedulePrefetch` / `drainPrefetchQueue`。

`requestIdleCallback` 逐个预取，启动瞬间不抢主线程和带宽。降级分支：

```js
const idle = window.requestIdleCallback
    ? (fn) => requestIdleCallback(fn, { timeout: 900 })
    : (fn) => setTimeout(fn, 120);
```

### 8.4 转场令牌

搜 `photoLoadToken` / `transitionToken` / `bestPhotoToken`。

切换是异步的（要等解码）。如果用户在解码完成前又切了一次，旧回调不能生效 —— 所以每次切换 `token++`，异步回调里先比对 `if (token !== photoLoadToken) return;`。

**这是这套代码里最容易出错的地方**：新增任何异步图片操作时，都要用同样的 token 守卫，否则会出现"快速连按方向键，图错位"的 bug。

### 8.5 批量配图

搜 `extractSingerName`（约 1648 行）+ `loadLocalPhotos`（约 1653 行）。

文件名去扩展名去空格后与条目名匹配。精确匹配优先，失败则去空格做模糊匹配（兼容中英文差异）。所以 `项目1.jpg` 和 `项目1 .jpg` 都能配给「项目1」。

### 8.6 存储编码与配额（踩过的坑）

**裁剪结果存 JPEG，不存 PNG。** 搜 `CROP_MIME` / `encodeCrop`。

原因：localStorage 配额实测约 **4.8MB**（约 5.24M 字符，Chrome 按字符计）。720×720 的 PNG 单张可达 800KB，**20 张需要 16MB，必然溢出**。实测第 8 张就开始写不进去。改成 JPEG(0.92) 后单张约 90KB，20 张约 1.9MB。

实测数据（同样内容、720×720）：

| 编码            | 单张        | 20 张合计        |
| ------------- | --------- | ------------- |
| PNG           | 814 KB    | 16.3 MB ❌     |
| **JPEG 0.92** | **93 KB** | **1.86 MB** ✅ |
| JPEG 0.88     | 76 KB     | 1.52 MB ✅     |

需要无损时走「下载 PNG」按钮（`preview.toBlob`），那条路径不受影响。

**写入失败必须报出来。** 搜 `persistJSON`。

原来的实现是：

```js
try { localStorage.setItem('radarChart_portraits', JSON.stringify(localPhotoMap)); } catch (_) {}
```

问题：`QuotaExceededError` 被静默吞掉。而 `localPhotoMap` 是内存对象、**已经改了**，所以当前画面看起来完全正常，状态栏也显示「已保存」—— 但刷新后照片消失。用户永远不知道发生了什么。

现在 `persistJSON` 返回 `{ ok, reason }`，桥接层的 `applyPortrait` / `applyBestPhoto` / `applyBackground` 都把它透传出来，照片面板用 `storageWarning()` 转成状态栏文案。

**用量口径别算错。** 搜 `storageUsageMB`。Chrome 的配额以**字符**计（约 5.24M 字符 ≈ 5MB）。如果按 UTF-16 每字符 2 字节折算，会得到「已用 10MB > 上限 5MB」这种自相矛盾的数字。所以直接 `chars / 1024 / 1024`。

---

## 9. 可选增强：人脸定位

第二个 `<script>` 里有个 `getFacePosition(image)`，**当前是空实现**：

```js
async function getFacePosition(image) {
    return null;   // 返回 null → 调用方回落到默认对齐
}
```

模板**不内置也不联网加载**人脸识别库（早期版本会从 jsdelivr 拉 face-api.js 的模型，但因为页面根本没引入 faceapi，那个请求纯属浪费且构成第三方依赖，已移除）。

想让人像自动对齐到画面特定位置，自己引入库后重写这个函数即可：

```js
async function getFacePosition(image) {
    const detection = await myDetector.detect(image);
    if (!detection) return null;
    return {
        x: (detection.box.xCenter / image.naturalWidth) * 100,
        y: (detection.box.yTop    / image.naturalHeight) * 100
    };
}
```

返回值是**百分比坐标**。CSS 侧预留了一个对齐钩子：

```css
.artist-img.photo-crop[data-crop-focus="lower"] {
    object-position: 50% 65%;
    transform-origin: 50% 65%;
}
```

⚠️ **JS 里目前没有代码设置 `data-crop-focus`** —— 这个属性要你手动加。用途是人像偏下时（半身照、坐姿照），居中 `object-position` 会把头切掉，加这个属性就能把焦点下移：

```js
artistImg.dataset.cropFocus = 'lower';   // 偏下
delete artistImg.dataset.cropFocus;      // 恢复居中
```

需要配合 `photo-crop` class 一起生效（该 class 在检测到 JPEG / `.jpg` 时自动加，见搜 `photo-crop`）。

---

## 10. 界面交互

### 快捷键

| 键              | 作用              |
| -------------- | --------------- |
| `Ctrl+E`       | 开/关六维分数编辑面板     |
| `Ctrl+Shift+P` | 切换展示模式（见 §11.1） |
| `←` / `→`      | 上一条 / 下一条       |
| `空格`           | 暂停 / 继续         |
| `Enter`        | 确认编辑（编辑分数或文案时）  |
| `Esc`          | 取消编辑，恢复原值       |

搜 `'ctrlKey'` 看 `Ctrl+E` 的实现（注意它挂在 `document` 上）。方向键导航用了 `navIdx`  
记录"上一次跳转目标"，这样连续按方向键不会原地踏步 —— 转场还没落地就再按，  
否则会从同一个 `renderedIdx` 重新计算而卡住。

### 关键函数

| 函数                            | 位置    | 作用                     |
| ----------------------------- | ----- | ---------------------- |
| `switchToBand(band, isFirst)` | ~3058 | 普通条目切换（含过场动画编排）        |
| `switchToBandBest(band)`      | ~3252 | BEST 转场                |
| `applyScoreChange`            | ~2504 | 应用单个维度的分数修改            |
| `commitScoreEdit`             | ~2494 | 分数编辑提交（重算排名 + 重算 BEST） |
| `renderRulesPanel()`          | ~4297 | 生成开场规则页的维度明细           |

---

## 11. 启动配置（几个 style 块）

页面里有几个带语义 id 的 `<style>`，控制启动行为：

| style id                  | 作用                       |
| ------------------------- | ------------------------ |
| `skip-intro-overlay`      | **跳过开屏动画，直接落地规则页**（默认开启） |
| `hide-model-strip`        | 隐藏开屏的署名条（想显示就删掉这条）       |
| `wide-screen-tuning`      | 宽屏布局微调，仅 ≥900px 生效       |
| `ranking-rules-style`     | 规则页样式                    |
| `portrait-tool-style`     | 照片面板样式                   |
| `template-custom-style`   | 自定义面板样式                  |
| `presentation-mode-style` | 展示模式（见 §11.1）            |


### 启动行为怎么改

**开屏动画（`#startOverlay`）在 JS 层是完整的** —— 点击后 `cover.classList.add('hide')` 淡出。  
它只是被 `skip-intro-overlay` 用 `display:none !important` 藏起来了。

引导流程的起点由**开屏页当前是否真的可见**决定（搜 `introCoverVisible`），不是写死的。所以：

| 想要的效果                     | 怎么做                                            |
| ------------------------- | ---------------------------------------------- |
| **恢复开屏动画**（开屏 → 规则页 → 榜单） | 删掉 `skip-intro-overlay` 整个 style 块，其它都不用动      |
| **直接进榜单**（跳过一切引导）         | 把 JS 里的 `AUTO_START` 改成 `true`（搜 `AUTO_START`） |

⚠️ **不要**只加 `#rankingRulesOverlay{display:none!important}` 来试图"直接进榜单"——  
`skip-intro-overlay` 已经把开屏藏了，再把规则页藏掉就**两个 overlay 都不见了**：  
用户看到的是空壳页面，`bandName` 为空，播放根本没开始（实测确认）。  
用 `AUTO_START` 才是可靠做法，它会自己 `introductionStage = 'ranking'` 然后调用 `start()`。

另外 `#startOverlay .model-strip` 那条 CSS 原本挂的是第三方图标，现在内容已换成  
「单文件 · 零依赖 / 离线可用 / 数据本地存储」的静态文字，`hide-model-strip` 会把它一起藏掉。

### 11.1 展示模式

给录屏 / 投屏 / 现场演示用。**实现上刻意做得很轻** —— 只往 `body` 加一个 class，  
不碰任何渲染或数据逻辑，所以不可能影响榜单本身。

搜 `presentation-mode-style` 看 CSS，搜 `radarChart_presentMode` 看 JS。

```css
body.present-mode #template-custom-toggle,
body.present-mode #portrait-tool-toggle,
body.present-mode #template-custom,
body.present-mode #portrait-tool,
body.present-mode #photoLoaderToggle,
body.present-mode #localPhotoBar { display: none !important; }
body.present-mode #editHint { display: none !important; }   /* 编辑器提示，想保留就删这条 */
```

开关逻辑（文件末尾独立 `<script>`）：

- 优先级：**URL 参数 > localStorage 记忆**
  - `?present=1` / `#present` → 强制开
  - `?present=0` → 强制关
  - 都没给 → 读 `radarChart_presentMode`
- `Ctrl+Shift+P` 切换，写入 localStorage

两个实现细节值得注意：

**1. 快捷键监听用捕获阶段 + `stopPropagation`**

```js
window.addEventListener('keydown', event => {
    if (event.ctrlKey && event.shiftKey && (...KeyP...)) {
        event.preventDefault();
        event.stopPropagation();
        apply(!on, true);
    }
}, true);
```

页面本身监听空格 / 方向键做播放控制。组合键必须阻止冒泡，否则可能顺带触发它们。  
顺带一提：分数面板的 `Ctrl+E` 监听挂在 `document` 上，而展示模式挂在 `window` 上 ——  
**自动化测试时注意派发目标**，往 `window` 派发 `Ctrl+E` 是不会触发的（踩过这个坑）。

**2. 进展示模式时收掉已打开的面板**

否则会出现"面板看不见但还开着、并且还在占用键盘焦点"的状态。  
实现是点一下 `#pt-close`（让照片面板走它自己的关闭流程），自定义面板直接设 `hidden = true`。

---

## 12. 调试建议

因为没有全局变量，调试要靠注入。临时在 `switchToBand` 附近加：

```js
window.__dbg = { get bands() { return bands; }, get idx() { return currentIdx; } };
```

然后在控制台：

```js
__dbg.bands[0].name        // 读
__dbg.bands[0].points[3] = 9;  // 写（需要触发重算才生效）
```

**调试动画卡顿**：`animation` 面板开慢速录制，或临时把转场时长改小。

**看 BEST 判定**：`__dbg.bands.map(b => [b.name, b.championDims])` 一眼看出谁在哪些维度登顶。

**清 localStorage**：

```js
Object.keys(localStorage).filter(k => k.startsWith('radarChart_')).forEach(k => localStorage.removeItem(k));
```

---

## 13. 常见坑

**1. 改了初始数据但用户看到旧数据**  
→ bump `DATA_VERSION`。这是 `checkVersion` 的机制。

**2. 增删条目后维度对不上**  
→ `points` 数量必须等于 `dimNames.length`。

**3. 新增异步图片操作后快速切换会错位**  
→ 用 token 守卫，参考 8.4。

**4. 权重改了但排名没变**  
→ 检查 `rankingWeightPercent` 总和是否为 100。

**5. 规则页维度名和雷达图标签不一致**  
→ 不该发生（已经同源生成）。如果真出现，检查是不是有人手改了生成的 DOM。

**6. 照片配不上**  
→ 文件名必须等于条目名（去扩展名、去空格后精确或模糊匹配）。`项目1.jpg` 可以，`项目一.jpg` 不行。

**7. 照片"存了但刷新就没了"**  
→ 几乎肯定是 localStorage 配额溢出（上限约 4.8MB）。检查有没有 `catch {}` 把  
`QuotaExceededError` 吞掉了 —— 内存里的对象已经改了，所以画面看起来正常，  
但持久化其实失败。正确做法见 §8.6：`persistJSON` 返回结果，UI 明确提示。

**8. 往 `window` 派发 `KeyboardEvent` 测不出 `Ctrl+E`**  
→ `Ctrl+E` 的监听挂在 `document` 上，而展示模式的挂在 `window` 上。  
写自动化测试时派发目标别搞错：`Ctrl+E` 要 `document.dispatchEvent(...)`。

**9. 把两个 overlay 都 `display:none` 后页面空白**  
→ 引导流程需要一个起点。要"直接进榜单"请用 `AUTO_START`，别手动藏 DOM（见 §11）。

---

## 14. 二次开发方向

- **导出静态视频**：现在是 DOM + Canvas 混合渲染，要录成视频得把 canvas 换成离屏渲染，或者用 `MediaRecorder` 抓 canvas 流
- **换配色方案**：`themePalette` 支持 20 色，改成一个完整色板即可；CSS 变量 `--theme-color` 等控制主题
- **加第 7 个维度**：⚠️ 不是只改数组就行。`dimNames` / `dimDescriptions` / `rankingWeightPercent` / 每条 `points` / `rankingWeights` 都要改，而且**有两处硬编码的 60°** 必须一起改：
  - 主体雷达图 `const ang = (i * 60 - 90) * Math.PI / 180;`（约 1991 行）
  - 规则页示意图 `const angle = (index * 60 - 90) * Math.PI / 180;`（约 4274 行）
  建议改成 `const step = Math.PI * 2 / dimCount;` 再统一用 `step`，这样加维度不用再动别处。标签位置那段还有 `index === 0 || index === 3`、`index === 1 || index === 2` 这类硬编码方位判断，也要一起重构。
- **照片改存 IndexedDB**：localStorage 只有约 5MB 且是同步 API。要放大量原图就换 IndexedDB（容量按磁盘配额，异步不阻塞主线程）。当前 JPEG 方案在 20 张规模下够用，再大就该换。
- **接后端**：目前完全靠 localStorage，换成 fetch 只需替换 `loadFromStorage` / `saveToStorage`
