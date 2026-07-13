# ajin.blog 前端优化方案（实施版 v1）

> 状态：已确认并完成实现与响应式 QA
> 日期：2026-07-13
> 范围：首屏四个入口图片、两层文章筛选、文章详情阅读版式

## 0. 本轮共同原则

- 保留当前首页首屏，不重做 Hero 的视觉方向。
- 保留黑色背景、黑白版画、暖白文字和少量金色强调的现有品牌语言。
- 四个入口图片只承担入口识别，不承载文字；入口标题和操作文字继续由 HTML 渲染。
- 内容域、工作阶段、项目、作者、时间和主题标签分层管理，不再把所有标签平铺成同一级筛选项。
- 文章详情页以全站内部主容器 `.section-shell` 为宽度真相源。
- 本文档已作为图片生产、内容迁移、前端实现和 QA 的验收基线。

---

## 1. 首屏四个入口图片

### 1.1 当前问题

| 入口 | 当前图片策略 | 问题 |
|---|---|---|
| Blog Archive | 跟随置顶文章或历史兜底封面 | 图片会变化，入口识别不稳定 |
| Private Diary | 跟随最新日记封面 | 图片会变化，容易与文章卡混淆 |
| AI Team | 彩色角色头像 | 与黑白版画体系明显断裂 |
| chenjin.ai | 放大的 CJ 图标 | 信息量不足，与其他三张图不在同一视觉层级 |

### 1.2 目标策略

- 四张入口图全部改为固定资产。
- 四张图使用同一生成规格和同一视觉世界，但主体必须明显不同。
- 共同年代气质定位为“19 世纪蒸汽时代 / 工业革命工程美学”：铸铁、黄铜、铆钉、皮带传动、压力表、蒸汽管道、机械制图和旧式工坊光线。
- 蒸汽时代只作为材质、机械结构和时代氛围，不做奇幻蒸汽朋克角色扮演。
- 推荐输出尺寸：`2048 × 1152`，比例 `16:9`。
- 推荐格式：生成阶段保留 PNG，接入前转为优化后的 JPG/WebP。
- 推荐目录：`public/entry-cards/`。
- 图片内部禁止生成文字、按钮、Logo 和水印，避免与网页真实文案冲突。

建议文件名：

```text
public/entry-cards/blog-archive.jpg
public/entry-cards/private-diary.jpg
public/entry-cards/ai-team.jpg
public/entry-cards/chenjin-official.jpg
```

### 1.3 四张图的独立生成提示词

以下提示词均提供中文和英文完整版本，可独立复制生成，不依赖其他图片。两种语言表达的是同一套视觉要求，实际生成时选择其中一种即可，不需要中英文同时提交。

#### A. Blog Archive

##### 中文提示词

```text
用途分类：风格化概念图
资产类型：个人博客档案入口使用的 16:9 网站导航卡片图片
主要请求：创作一幅安静、严肃的黑白复古版画，主题是一间蒸汽时代的编辑档案室与印刷工作间。画面中包含高耸且带索引结构的书架、整齐堆放的期刊、一本打开的目录账簿、一台由皮带与飞轮驱动的蒸汽印刷机、活字抽屉、铆接铸铁结构、少量蒸汽管道和一盏阅读灯。整体应传达长期记录、持续出版，以及一座仍在不断生长的档案馆。
风格与媒介：真实的 19 世纪工业革命时期蚀刻版画、木刻和旧报刊插画；细密交叉排线；高对比墨线；高级、克制、以思想为中心，而不是单纯怀旧装饰。
构图与画幅：横向 16:9 构图，阅读动线明确，前景与背景有清晰层次；重要物件保持在画面中间 80% 的安全区域内，确保响应式裁切后仍然完整。
光线与氛围：安静的博物馆式氛围，受控的明暗对比，沉静、审慎、具有权威感。
色彩：黑色墨线、暖象牙纸张，只允许非常轻微的旧纸色调变化。
材质与纹理：版画墨线、纸张纤维、深色木材、铸铁、黄铜、铆钉、皮带传动结构、金属活字和旧式精装期刊。
约束：只生成图片；不要文字、不要可辨认字母、不要 Logo、不要 UI、不要水印；不要出现正视镜头的人物；边缘干净，并保持足够对比度以适配黑色网站背景。
避免：高光摄影、浓重棕褐色滤镜、动漫、奇幻魔法、护目镜与礼帽式蒸汽朋克服装、飞艇、武器、发光机械、霓虹、渐变、3D 渲染、杂乱拼贴和无法辨认的伪文字。
```

##### English Prompt

```text
Use case: stylized-concept
Asset type: 16:9 website navigation card image for a personal blog archive
Primary request: Create a calm, serious black-and-white vintage engraving of a Steam Age editorial archive and print room. Show tall indexed shelves, carefully stacked journals, an open catalog ledger, a steam-powered printing press driven by belts and flywheels, drawers of type, riveted cast-iron structures, restrained steam pipes, and a single reading lamp. The scene should communicate long-term records, published work, and an archive that is actively growing.
Style/medium: authentic Industrial Revolution-era 19th-century etching, woodcut, and old editorial illustration; fine cross-hatching; high-contrast ink drawing; premium and idea-led, not nostalgic decoration.
Composition/framing: horizontal 16:9 composition, strong central reading path, clear foreground and background depth, important objects kept inside the middle 80% safe area so the image can be cropped responsively.
Lighting/mood: quiet museum-like atmosphere, controlled chiaroscuro, thoughtful and authoritative.
Color palette: black ink, warm ivory paper, very subtle aged-paper tonal variation only.
Materials/textures: engraved ink lines, paper fibers, dark wood, cast iron, brass, rivets, belt-drive mechanisms, metal type, and old bound journals.
Constraints: image only; no text, no readable letters, no logo, no UI, no watermark; no people looking at the camera; maintain clean edges and enough contrast for display on a black website.
Avoid: glossy photography, sepia color cast, anime, fantasy magic, goggle-and-top-hat steampunk costumes, airships, weapons, glowing machinery, neon, gradients, 3D render, cluttered collage, illegible fake typography.
```

#### B. Private Diary

##### 中文提示词

```text
用途分类：风格化概念图
资产类型：私人日记入口使用的 16:9 网站导航卡片图片
主要请求：创作一幅私密、安静的黑白复古版画，主题是蒸汽时代夜晚窗边的一张私人写作桌。画面中包含一本打开的手写日记，所有字迹必须抽象且不可辨认；同时放置一支钢笔、一封折好的私人信件、一把小钥匙、黄铜机械钟和一个关闭的抽屉。窗边可以轻微出现铸铁暖气管、远处工厂烟囱或铁路蒸汽的轮廓，但不能抢走日记主体。整体应传达隐私、反思、记忆，以及只有在主动选择后才会被打开的个人记录。
风格与媒介：真实的蚀刻版画和旧书插画；细密交叉排线；暖象牙纸张背景；优雅、克制的编辑视觉。
构图与画幅：横向 16:9，使用亲近的编辑式局部构图；打开的日记是主角，但不要填满整个画面；保留负空间，并将重要物件放在画面中间 80% 的安全区域内。
光线与氛围：柔和的月光明暗关系，安静、私密、受保护、具有沉思感，但不要煽情。
色彩：只使用黑色墨线和暖象牙纸张，并带轻微纸张颗粒。
材质与纹理：哑光纸张、深色木材、黄铜机械钟、铸铁管道、金属笔尖、没有符号的蜡封质感。
约束：只生成图片；不要可读文字、不要标题、不要 Logo、不要 UI、不要水印、不要出现人脸。
避免：浪漫爱情陈词、鲜花、明亮蜡烛、哥特恐怖、高光摄影、动漫、奇幻、护目镜与礼帽式蒸汽朋克人物、飞艇、发光机械、道具堆积和浓重棕褐色滤镜。
```

##### English Prompt

```text
Use case: stylized-concept
Asset type: 16:9 website navigation card image for a private diary
Primary request: Create an intimate black-and-white vintage engraving of a private writing desk beside a quiet window at night during the Steam Age. Show one open handwritten diary with all writing abstract and unreadable, a fountain pen, a folded personal letter, a small key, a brass mechanical clock, and a closed drawer. Subtle cast-iron heating pipes and a distant silhouette of factory chimneys or railway steam may appear outside the window, but they must not compete with the diary. The image should communicate privacy, reflection, memory, and a personal record that is opened deliberately.
Style/medium: authentic etching and old book illustration; fine cross-hatching; warm ivory paper background; elegant editorial restraint.
Composition/framing: horizontal 16:9, close editorial crop, the open diary is the main subject but does not fill the entire frame; preserve negative space and keep important objects within the middle 80% safe area.
Lighting/mood: soft moonlit contrast, quiet, personal, protected, contemplative rather than sentimental.
Color palette: black ink and warm ivory only, with subtle paper grain.
Materials/textures: matte paper, dark wood, brass clockwork, cast-iron pipes, metal pen nib, wax-seal texture without symbols.
Constraints: image only; no readable text, no title, no logo, no UI, no watermark, no human face.
Avoid: romance clichés, flowers, bright candles, gothic horror, glossy photography, anime, fantasy, goggle-and-top-hat steampunk characters, airships, glowing machinery, excessive props, sepia wash.
```

#### C. AI Team

##### 中文提示词

```text
用途分类：风格化概念图
资产类型：AI Agent 团队入口使用的 16:9 网站导航卡片图片
主要请求：创作一幅黑白复古编辑版画，主题是一间蒸汽时代协同工坊。多位外形与职责明确不同的机械助手围绕同一张规划桌协作，每位助手承担不同任务：通过电报与气动管路由消息、起草计划、检查工作、研究文档和维护知识账簿。使用一套由黄铜齿轮、压力表、皮带传动和机械指示器构成的中央交换台连接整个团队，表现协调关系，但不要让某一个角色压过其他成员。
风格与媒介：工业革命时期的旧式科学版画、技术蚀刻、木刻和编辑插画；线条精确；蒸汽机械细节可信；严肃、聪明、克制。
构图与画幅：横向 16:9，采用群像构图，包含 6–8 位职责不同且能够清楚区分的协作者；共享工作桌靠近中心；视觉层级平衡；重要角色保持在画面中间 80% 的安全区域内。
光线与氛围：纪律明确的工作坊氛围，冷静协作、目标清楚，不制造戏剧化 spectacle。
色彩：黑色墨线、暖象牙纸张、高对比，不使用其他颜色。
材质与纹理：只用黑白版画表现的黄铜齿轮、铸铁骨架、铆钉、压力表、皮带轮、气动管、纸质计划、线缆和档案抽屉。
约束：只生成图片；不要文字、不要标签、不要 Logo、不要 UI、不要水印；协作者必须像承担不同职责的团队，而不是一排相同机器人。
避免：人形科幻机器人、发光眼睛、赛博朋克、高光金属、动漫、可爱吉祥物、未来仪表盘、护目镜与礼帽式蒸汽朋克服装、飞艇、武器、战斗场面，以及紫色或蓝色光效。
```

##### English Prompt

```text
Use case: stylized-concept
Asset type: 16:9 website navigation card image for an AI agent team
Primary request: Create a black-and-white vintage editorial engraving of a coordinated Steam Age workshop where several distinct mechanical assistants collaborate around one shared planning table. Each assistant performs a different role: routing messages through telegraph and pneumatic tubes, drafting plans, inspecting work, researching documents, and maintaining a knowledge ledger. A central switchboard built from brass gears, pressure gauges, belt drives, and mechanical indicators connects the team, showing coordination without making one character dominate the scene.
Style/medium: Industrial Revolution-era scientific engraving, technical etching, woodcut, and editorial illustration; precise line work; believable steam machinery; serious and intelligent.
Composition/framing: horizontal 16:9, ensemble composition with 6 to 8 clearly separated collaborators, shared table near the center, balanced visual hierarchy, important figures inside the middle 80% safe area.
Lighting/mood: disciplined workshop atmosphere, calm cooperation, purposeful activity, no spectacle.
Color palette: black ink, warm ivory paper, high contrast, no additional colors.
Materials/textures: brass gears rendered in monochrome, cast-iron frames, rivets, pressure gauges, belt pulleys, pneumatic tubes, paper plans, cables, and archive drawers.
Constraints: image only; no text, no labels, no logo, no UI, no watermark; collaborators must feel like a team with different responsibilities, not identical robots in a row.
Avoid: humanoid sci-fi robots, glowing eyes, cyberpunk, glossy metal, anime, cute mascots, futuristic dashboard, goggle-and-top-hat steampunk costumes, airships, weapons, battle scenes, purple or blue effects.
```

#### D. chenjin.ai

##### 中文提示词

```text
用途分类：风格化概念图
资产类型：个人官方网站入口使用的 16:9 网站导航卡片图片
主要请求：创作一幅黑白复古编辑版画，用蒸汽时代的旧式版画语言表现一间具有现代思维的个人创造者工作室。画面中有一位从侧面或背面出现的人，正在一张大型工作台前工作；周围放置产品草图、机械制图、系统图、原型、书籍、圆规、一台小型蒸汽机模型和一套尚未完成的机械装置。背景可出现克制的铸铁梁、蒸汽管道、黄铜压力表和皮带传动结构。整体应传达个人判断、产品创造、持续实验，以及把想法变成可运行系统的过程。
风格与媒介：工业革命时期的高级旧报刊插画、蚀刻版画、木刻、细密交叉排线；虽然使用历史媒介，但整体气质仍然安静、当代、克制。
构图与画幅：横向 16:9，一个明确主角，非对称编辑布局，保留充分负空间，工作桌轮廓清楚；所有重要细节保持在画面中间 80% 的安全区域内。
光线与氛围：专注、独立、善于思考，带安静但明确的进取感。
色彩：只使用黑色墨线和暖象牙纸张；对比清晰，适合放在黑色网站中。
材质与纹理：墨线、纸张、深色木材、铸铁、黄铜、铆钉、压力表、金属工具、笔记本和原型零件。
约束：只生成图片；不要可读文字、不要姓名缩写、不要 Logo、不要 UI、不要水印；不要尝试还原可识别的真人肖像，也不要复制真实人物的脸。
避免：英雄式创始人肖像、企业办公室、笔记本电脑素材照、高光摄影、动漫、奇幻发明家、护目镜与礼帽式蒸汽朋克服装、飞艇、武器、发光机械、霓虹、渐变和过量机械装置。
```

##### English Prompt

```text
Use case: stylized-concept
Asset type: 16:9 website navigation card image for a personal official website
Primary request: Create a black-and-white vintage editorial engraving of a single modern-minded maker's studio interpreted through Steam Age printmaking. Show one person seen from the side or from behind at a large worktable, surrounded by product sketches, mechanical drawings, system diagrams, prototypes, books, a compass, a small model steam engine, and a partially assembled mechanism. Restrained cast-iron beams, steam pipes, brass pressure gauges, and belt-drive structures may appear in the background. The image should communicate personal judgment, product building, experimentation, and turning ideas into working systems.
Style/medium: premium Industrial Revolution-era editorial illustration, etching, woodcut, and fine cross-hatching; calm and contemporary despite the historical medium.
Composition/framing: horizontal 16:9, one clear protagonist, asymmetrical editorial layout, generous negative space, strong desk silhouette, all important details inside the middle 80% safe area.
Lighting/mood: focused, independent, thoughtful, quietly ambitious.
Color palette: black ink and warm ivory paper only; crisp contrast suitable for a black website.
Materials/textures: ink, paper, dark wood, cast iron, brass, rivets, pressure gauges, metal tools, notebooks, and prototype parts.
Constraints: image only; no readable text, no initials, no logo, no UI, no watermark; do not attempt a recognizable portrait or copy a real person's face.
Avoid: heroic founder portrait, corporate office, laptop stock photo, glossy photography, anime, fantasy inventor, goggle-and-top-hat steampunk costumes, airships, weapons, glowing machinery, neon, gradients, excessive machinery.
```

### 1.4 图片验收标准

- [x] 四张图第一眼能区分不同入口。
- [x] 四张图放在一起时属于同一套黑白版画系统。
- [x] 四张图都能看出真实蒸汽时代的工业结构与材质，但没有奇幻蒸汽朋克角色扮演。
- [x] 没有图片内文字、Logo、水印或伪 UI。
- [x] 没有彩色动漫、赛博朋克、霓虹和高光 3D 质感。
- [x] 在 `16:9` 卡片中裁切后，主体仍完整。
- [x] 桌面双列和移动单列都不依赖特定裁切位置才能看懂。

---

## 2. 两层文章筛选

### 2.1 当前数据结论

当前共有 124 篇历史文章。现状不是单纯“标签太多”，而是内容域、工作阶段、项目、平台和主题全部混在同一个 `tags` 字段里：

- 首页平铺 15 个筛选标签。
- 14 篇历史文章没有标签。
- 9 篇文章使用了当前白名单外标签。
- `OpenClaw` 被标记 68 次，但只有少量文章真正以 OpenClaw 为标题或摘要主线，已经成为泛化的系统背景标签。
- `Signal Radar`、`LoopHarbor`、`FitLens`、macOS 输入法等近期项目没有完整进入原项目白名单。

因此，最终方案采用“两层筛选”，不再让 `ajin-blog`、`OpenClaw` 等项目或平台名称与内容主题并排成为首页按钮。

### 2.2 第一层：常驻内容域

首页始终只显示一行内容域筛选：

```text
全部 / Agent 与治理 / 运行与维护 / 产品与体验 / 研究与知识
```

这是默认浏览入口，用来回答“我想看哪一类内容”。

| 内容域 | 值 | 对应历史主题 | 当前涉及文章数（可重叠） |
|---|---|---|---:|
| Agent 与治理 | `agent-governance` | 多智能体、系统治理、安全边界 | 73 |
| 运行与维护 | `operations` | 系统运维、博客内容链 | 47 |
| 产品与体验 | `product-experience` | 产品研发、前端体验 | 31 |
| 研究与知识 | `research-knowledge` | 调研决策、知识沉淀 | 31 |

归类口径：

#### Agent 与治理

- Agent 架构、路由、调度、记忆、Skill 和工具调用
- 多 Agent 协作、状态机、评审、证据与治理合同
- 安全边界、权限、只读规则和系统治理

#### 运行与维护

- 定时任务、巡检、监控、告警和运行状态
- 日报、博客内容链、数据发布与例行收口
- 环境恢复、配置维护、依赖升级和故障处理

#### 产品与体验

- 产品定义、需求判断、功能开发和项目交付
- 前端体验、交互设计、视觉迭代和可用性
- 具体产品从想法进入实现和验收的过程

#### 研究与知识

- 技术调研、论文阅读、方案比较和决策依据
- 知识库、记忆、文档沉淀和经验复盘
- 从一次任务提炼长期可复用的方法

### 2.3 第二层：可选精细筛选

第二层默认收起，通过一个“筛选”入口打开。它用于精确查找，不把所有选项铺在首页。

包含四个维度：

```text
工作阶段 / 当前项目 / 作者 / 时间
```

#### 工作阶段

工作阶段回答“这篇文章记录的是哪一种工作过程”。

| 显示名称 | 值 | 典型内容 |
|---|---|---|
| 建设 | `build` | 开发、实现、接入、搭建、重构、上线 |
| 验证 | `validate` | 测试、验收、证据、审计、门禁、收口 |
| 运行 | `operate` | 巡检、自动化、日报、心跳、稳定运行 |
| 修复 | `repair` | 故障、异常、回退、恢复、缺陷修复 |
| 调研 | `research` | 研究、选型、论文、分析和方案判断 |
| 复盘 | `retrospect` | 回顾、沉淀、知识整理和经验总结 |

一篇文章只配置一个主工作阶段。

#### 当前项目

首页二级筛选只显示当前持续项目：

```text
全部项目
Signal Radar
LoopHarbor
FitLens
ajin-blog
macOS 输入法
```

项目分层规则：

| 层级 | 项目 | 首页是否显示 |
|---|---|---|
| 当前项目 | Signal Radar、LoopHarbor、FitLens、ajin-blog、macOS 输入法 | 是 |
| 观察期 | Enterprise Agent Vertical Kit | 否，达到持续标准后再晋升 |
| 历史项目 | Eomji、Figure Vault、api-relay-monitor、Nexora | 否，后续进入项目档案 |
| 平台或技术背景 | OpenClaw、Codex、LangGraph、Dashboard、Netcatty | 否，不作为项目筛选 |

项目进入“当前项目”列表的推荐条件：

1. 至少有 3 篇以该项目为主线的文章；
2. 最近 45 天仍有明确推进记录；
3. 或者被项目负责人明确指定为长期持续项目。

项目名称可以显示在文章卡片上，但不能重新变成首页一级筛选按钮。

#### 作者

作者筛选直接复用现有 frontmatter，不需要新增数据：

```text
全部成员
谷子 / 阿龙 / 阿毛 / 小锦 / 小U / 蛋糕 / 阿商 / 咕咕 / 梨子 / 阿锦
```

当前 10 位作者均已有 8–24 篇文章，数据密度足够成为稳定筛选维度。

#### 时间

```text
本月 / 上月 / 按月份
```

时间筛选直接使用文章 `date`，不新增 frontmatter 字段。

### 2.4 组合筛选逻辑

第一层内容域是主要入口；第二层条件均为可选。

示例：

```text
Agent 与治理
+ 验证
+ LoopHarbor
```

含义：查看 LoopHarbor 项目中，属于 Agent 与治理内容域、主工作阶段为验证的文章。

交互规则：

- 不打开第二层时，只按内容域筛选。
- 不要求用户依次完成多级选择，第二层每个条件都可以独立使用。
- 不同维度之间采用 AND；同一维度只选择一个值。
- 已选的第二层条件以简短摘要显示，并提供“清除”操作。
- 没有结果时显示明确空状态，并允许一键清除精细筛选。

### 2.5 数据模型

建议 Frontmatter：

```yaml
category: "progress"
businessArea: "agent-governance"
workStage: "validate"
projects:
  - "loop-harbor"
tags:
  - "多智能体"
  - "系统治理"
  - "OpenClaw"
author: "guzi"
```

字段职责：

| 字段 | 负责什么 | 规则 |
|---|---|---|
| `category` | 内容类型：`progress / diary` | 单值，保留现有语义 |
| `businessArea` | 首页第一层内容域 | 单值，四选一 |
| `workStage` | 文章主工作阶段 | 单值，六选一 |
| `projects` | 文章实际推进或重点涉及的项目 | 数组，建议 0–3 个 |
| `tags` | 主题和技术背景 | 数组，保留 1–3 个，不再负责项目筛选 |
| `author` | 作者 / Agent 视角 | 单值，复用现有字段 |
| `date` | 时间筛选 | 复用现有字段 |

`OpenClaw`、`Codex` 等平台名称可以保留为技术背景标签，但不会进入 `projects` 或公开项目筛选。

### 2.6 URL 与前端交互规格

建议 URL 参数：

```text
?area=agent-governance
&stage=validate
&project=loop-harbor
&author=guzi
&month=2026-07
```

前端规格：

- 第一层使用单行 segmented filter / tabs。
- 第二层使用独立筛选面板、Popover 或 Drawer，不使用大量平铺 chips。
- 第一层选中项使用 `aria-current="page"`。
- “筛选”入口需要显示当前启用的精细条件数量。
- 每个点击目标最小高度 `44px`。
- 移动端第一层可以横向滚动，但页面本身不能出现横向溢出。
- 项目、作者和月份使用选择器，不把全部选项同时展开。

### 2.7 历史内容迁移

审核通过后单独执行历史归类批次：

1. 为 124 篇文章生成 `businessArea`、`workStage` 和 `projects` 建议清单。
2. 把当前混在 `tags` 里的真实项目名迁移到 `projects`。
3. `OpenClaw`、`Codex`、`LangGraph` 等保留为技术背景标签，不迁入项目列表。
4. 对 14 篇无标签文章和 9 篇白名单外标签文章单独审计。
5. 多项目日报允许配置多个 `projects`，但仍只选择一个主内容域和一个主工作阶段。
6. 对边界不明确的文章列入人工确认清单，不自动强行归类。
7. 确认迁移结果后，再接入首页、`/api/posts` 和空状态。

### 2.8 筛选验收标准

- [x] 首页常驻区域只出现 5 个内容域选项和 1 个“筛选”入口。
- [x] 项目名、作者和月份不会平铺在首页。
- [x] `OpenClaw`、`Codex` 等平台名称不会出现在项目筛选中。
- [x] 当前项目列表不会因为文章中顺带提到某个工具而自动增长。
- [x] 第一层单独使用、第二层单独使用和组合使用都能得到正确结果。
- [x] URL 能完整恢复筛选状态。
- [x] 无结果、加载、错误和清除状态完整。
- [x] 桌面与移动端均满足 44px 点击目标和无横向溢出。

---

## 3. 文章详情阅读版式

### 3.1 附图对齐口径

附图红线标识的是文章页内部主内容栏边界。该边界应与全站顶部导航使用的 `.section-shell` 左右边界一致。

当前差异：

| 区域 | 当前最大宽度 |
|---|---:|
| 全站 `.section-shell` / 顶部内部导航 | `1200px` |
| 文章顶部提示区 `.detail-announce` | `1080px` |
| 标题与正文 `.detail-page__container` | `790px` |

目标：

```text
顶部提示区、文章元信息、主标题、摘要、正文、互动区和上一篇/下一篇
全部使用同一个 section-shell 宽度体系，桌面最大 1200px。
```

实现口径：

- `.detail-announce`：宽度改为 `100%`，不再单独限制 `1080px`。
- `.detail-page__container`：宽度改为 `100%`，不再单独限制 `790px`。
- `.detail-header`、`.detail-content`、`.detail-response`、`.detail-nav` 继承同一容器宽度。
- 桌面端左右边界与 `.site-header__inner` 对齐。
- 移动端继续使用 `.main-frame` 的 `16px` 页面内边距。
- 详情页 Grid 子项补 `min-width: 0`，代码块、表格和长文本不得撑宽页面。
- 不再用 `body { overflow-x: hidden }` 掩盖内容溢出。

### 3.2 标题字号调整

#### 文章主标题 H1

| 断点 | 当前 | 建议 |
|---|---:|---:|
| 桌面 | 最大约 `70px` | 最大 `56–58px` |
| 平板 | 由统一 clamp 自动放大 | 最大约 `48–50px` |
| 移动 | 最大约 `47px` | 最大 `38–40px` |

建议 CSS 口径：

```css
.detail-header__title {
  font-size: clamp(2.5rem, 4.4vw, 3.6rem);
  line-height: 1.02;
  letter-spacing: -0.035em;
}

@media (max-width: 767px) {
  .detail-header__title {
    font-size: clamp(2.05rem, 9.5vw, 2.5rem);
    line-height: 1.06;
  }
}
```

#### 正文分级标题

| 层级 | 桌面建议 | 移动建议 | 建议行高 |
|---|---:|---:|---:|
| H2 | `32–34px` | `28px` | `1.18` |
| H3 | `25–26px` | `22px` | `1.25` |
| H4 | `20–21px` | `18px` | `1.35` |

#### 正文与摘要

| 元素 | 桌面 | 移动 |
|---|---:|---:|
| 摘要 | `17px / 1.75` | `16px / 1.7` |
| 正文 | `18px / 1.9` | `16px / 1.85` |
| 元信息 | `11px` | `10px` |

### 3.3 长标题与窄屏规则

- 桌面长标题目标控制在 1–3 行，不因追求单行而缩小到不可读。
- 移动端标题允许自然换行，不插入人工 `<br>`。
- 中文标题使用正常断行；英文、URL 和长命令使用 `overflow-wrap: anywhere`。
- 代码块只允许内部横向滚动，不能扩大正文容器。
- 表格使用独立横向滚动容器。

### 3.4 版式验收标准

- [x] 桌面端顶部提示区、标题、正文和分隔线的左右边界与顶部内部导航一致。
- [x] 文章标题桌面最大不超过约 `58px`，移动最大不超过约 `40px`。
- [x] H2、H3 与正文形成清楚但不过度夸张的层级。
- [x] 390px 移动视口下 `scrollWidth === viewport width`。
- [x] 代码块、表格、长英文和 URL 不会撑宽页面。
- [x] 正文、互动区和上一篇/下一篇保持同一宽度体系。

---

## 4. 实施结果

1. 四张入口图已生成并保存至 `public/entry-cards/`，统一为 `2048 × 1152` JPG。
2. `lib/postTaxonomy.ts` 已建立内容域、工作阶段、项目类型和校验函数。
3. 124 篇历史文章已回填 `businessArea`、`workStage`、`projects`，标签统一为 1–3 个标准词。
4. 首页与 `/api/posts` 已支持 `area`、`stage`、`project`、`author`、`month` 查询。
5. 文章公告区、标题、正文、互动区和文章导航已统一到内部主容器宽度。
6. 已完成 1440px 桌面、834px 平板和 390px 移动视口复验。

## 5. 保留边界

- 首页 Hero、Header、About 和 Footer 的信息结构保持不变。
- 历史文章只迁移 frontmatter 分类字段，不改写正文。
- 文章原有封面和来源信息保持不变。
- 四张入口图是独立导航资产，不替代文章封面体系。
