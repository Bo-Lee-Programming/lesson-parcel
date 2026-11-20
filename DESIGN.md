# Lesson Parcel — 设计说明

> 2026-11-08 起草，11-09 更新。
> 截止：2026-11-20 17:00 ET = 14:00 PST。

## 1. 一句话
老师在网页编辑器里写一节短课，导出成**一个自包含的 HTML 文件**（约 10–20 KB），通过 WhatsApp、蓝牙或 U 盘转发；学生在旧手机上离线打开就能读、听、做题；做完生成一串**短进度码**，用普通短信发回给老师，老师把短信粘贴进编辑器，就能看到全班每道题第一次作答的结果。

## 2. 学习者和门槛（评分项 Barrier Removed）
- **学习者**：初中生，家里几个人共用一部旧安卓手机，预付费流量，家里信号时有时无。
- **任务**：课后练习一个小知识点（例如等值分数），并让老师知道练得怎么样。
- **门槛**：现有远程学习材料大多是视频或在线平台，要么几十 MB，要么要一直联网、要账号；离线平台又要学校先架一台服务器。学生拿不到、做不了，老师也不知道谁卡在哪里。

## 3. 方案
| 部件 | 作用 |
|---|---|
| 编辑器 `docs/index.html`（另有单文件离线版 `docs/lesson-parcel-editor.html`） | 写课（讲解段落 + 单选题 + 每题解析）→ 预览 → 导出单文件课包；也可以打开已有课包继续编辑；粘贴短信进度码 → 显示全班结果表 |
| 课包（导出的 `.html`） | 不联网、不安装、不要账号；朗读（用手机自带的语音合成）、调字号、高对比度、全程能用键盘；同一部手机上多个学习者分别存进度；生成进度码，一键打开短信 App |
| 进度码 | 格式 `课程码-学生昵称缩写-每题首次作答-校验位`，例如 `FRAC-AMI-2301-K`；只含大写字母、数字和连字符，适合短信传送 |

### 关键设计取舍
- **单个文件，不用 PWA 或 Service Worker**：PWA 要先联网打开一次才能缓存，而单个文件转发后一直都能用。代价是文件靠 `file://` 或聊天 App 的内置浏览器打开，所以存储要有兜底：localStorage 不可用时退回到内存保存，并明确提示学生。
- **课包运行代码和编辑器同源**：编辑器导出时把自己的运行函数序列化后写进课包，不需要构建步骤，也不会出现两份代码不一致。
- **记录第一次作答**：学生可以改答案、看解析，但进度码只记第一次的答案。这样老师看到的是学生原本的理解，而不是试出来的结果。
- **用短信回传，不用网络**：短信在只有 2G 信号、没有流量的地方也能发；进度码不含真实姓名，只有学生自己输入的昵称前 3 个字母。
- **不用大模型或付费 API**：纯前端，GitHub Pages 免费托管编辑器；朗读用浏览器自带的 Web Speech API。

## 4. 同行工作（2026-11-08 核实）
| 项目 | 是什么 | 部署成本 | 学生需要的设备 | 进度怎样回到老师 | 体积 |
|---|---|---|---|---|---|
| **Kolibri**（Learning Equality，MIT 许可） | 离线优先的学习平台：内容库 + 教练工具 + 测验 | 需要一台服务器（Linux 推荐 1 GB 内存，Windows 2 GB+；少于 30 台设备时树莓派就够）或每台设备装 App；需要有人安装、导入频道 | 局域网里的浏览器，或 Kolibri 安卓 App（Android 8+） | 平台内的教练面板；多台设备之间要在**同一局域网**内同步；联网同步到 Data Portal 需要合同 | 安卓 App 本身约 200 MB，另加导入的内容（视频更大） |
| **Kolibri 的 MIT Solve 条目**（solutions/44212） | 同上，描述大规模部署 | 预装好课程的平板 + 学校服务器 | 平板 | 条目写明老师通过 SMS、WhatsApp 等**旁路渠道**跟进学生，这不是内置功能 | — |
| **Kiwix** | 离线阅读 ZIM 格式的维基百科等资料 | 安卓 App 免费；ZIM 要先下载 | 手机或电脑上的 Kiwix 阅读器 | 无（只读参考资料，没有练习和进度） | App 约 55–80 MB；英文维基 mini 约 12 GB，完整版约 115 GB；有更小的专题包 |
| **Internet-in-a-Box**（IIAB） | 树莓派做成 Wi-Fi 热点，提供 Kiwix、Kolibri、Moodle 等离线内容 | 树莓派 4/5（$35–45+）+ 大容量存储卡，需要会刷镜像 | 连上热点的手机、平板或电脑浏览器（Pi 热点约 32 台） | 内容库本身没有；装了 Kolibri 或 Moodle 后在热点范围内记录 | 视选装的内容包而定，通常几十 GB 起 |
| **RACHEL**（World Possible） | 预装开放教育资源的离线热点服务器 | 早年 RACHEL-Pi 约 $169（2019）；RACHEL-Plus 约 $500–749 | 连热点的设备浏览器（Pi 版 1–10 人，Plus 10–50 人） | 基础内容库没有；要靠服务器上的附加模块 | Pi 版 32–64 GB，Plus 500 GB |
| **Eneza / Shupavu**（参考：短信学习） | 功能机通过 USSD 和短信做测验 | 要和运营商合作；学生按天付费（约 $0.03/天） | 功能机 | 平台自己的短信后台 | 无文件 |
| **LocalQuiz** 等单文件测验（参考） | 一个 HTML 文件里的单选测验 | 无 | 浏览器 | 无 | 几 KB |
| **Lesson Parcel（本作品）** | 老师自己写课 → 单文件课包 → 短信进度码回传 | **0**：老师只需要一个浏览器；编辑器托管在 GitHub Pages | 任何有浏览器的手机，**包括多人共用的旧手机**；不需要服务器、热点或 App | **普通短信**：学生发一串码，老师粘贴进编辑器自动解码成全班结果表 | 每节课约 10–20 KB |

**结论**：Kolibri、IIAB、RACHEL 解决的是"一个地点有大量内容"，前提是有服务器或热点，学生要在现场。Kiwix 只提供阅读材料。短信平台要和运营商合作，并且按次收费。Lesson Parcel 填的是剩下的空缺：**老师自己写的一节课**能离开学校走到学生家里的旧手机上，结果还能通过最便宜的渠道回到老师手里。Solve 条目里老师用 SMS、WhatsApp 跟进只是旁路沟通，Lesson Parcel 把这一步变成了结构化的进度码。

**不夸大的地方**：单文件测验本身不新（例如 LocalQuiz）；Lesson Parcel 不是内容库，不能替代 Kolibri。它可以作为 Kolibri 等平台的补充，覆盖"学生离开局域网之后"这一段。

## 5. 对照评分项
| 评分项 | 证据 |
|---|---|
| Barrier Removed | 前后对比：文件大小（MB → KB）、飞行模式下完整走一遍、短信回传 |
| Learning Value | 3 节合成样课；每题都有解析；老师端能看到全班哪题错得多 |
| Inclusive Experience | 朗读、字号、高对比度、全程键盘、读屏测试、Lighthouse 无障碍评分、界面多语言（英语、西班牙语） |
| Working Prototype & Explanation | GitHub Pages 在线编辑器 + 可下载样课 + 测试记录 + 如实写明局限和 AI 协助 |

## 6. 局限（如实写）
- 朗读依赖设备上装的语音；有些手机没有某些语言的声音。
- 某些聊天 App 的内置浏览器禁用存储，这时进度不能保存（会提示学生）。
- 进度码只有校验位，没有防伪，适合用来了解学情，不适合正式打分。
- 目前只支持讲解段落和单选题，不支持图片和视频（图片会大幅增加文件体积）。
- 没有在真实课堂试用，只做了作者自测。

## 7. 来源
- Kolibri：https://github.com/learningequality/kolibri （MIT）；用户指南 https://kolibri.readthedocs.io （硬件要求、局域网同步、Android 8+、App 约 200 MB）；PyPI https://pypi.org/project/kolibri/ 。另一个文档站 https://learningequality-kolibri.mintlify.app/introduction 在 2026-11-08 返回 404。
- MIT Solve 上的 Kolibri 条目：https://solve.mit.edu/solutions/44212
- Kiwix：https://en.wikipedia.org/wiki/Kiwix ；英文维基 ZIM 体积 https://www.makeuseof.com/way-to-have-entire-wikipedia-offline-smaller-than-youd-expect/
- Internet-in-a-Box：https://wiki.iiab.io/go/FAQ ；https://internet-in-a-box.org/
- RACHEL：https://worldpossible.org/ ；https://www.engineeringforchange.org/solutions/product/rachel/ ；巴布亚新几内亚研究 https://www.researchgate.net/publication/335421122
- Eneza：https://www.unesco.org/en/dtc-financing-toolkit/eneza-education
- LocalQuiz：https://github.com/robineckebracht/LocalQuiz
