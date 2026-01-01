# **技术架构与规避策略：深入分析 puppeteer-real-browser 解决 Cloudflare 验证的机制**

在当代互联网的安全版图中，自动化工具与防御系统之间的博弈已演变为一场深度的技术军备竞赛。随着 Cloudflare 等 Web 应用防火墙（WAF）供应商不断引入基于行为分析、环境完整性检查以及硬件级指纹识别的防御机制，传统的浏览器自动化框架如 Puppeteer 面临着前所未有的检测压力 1。原生 Puppeteer 及其常规扩展在面对 Cloudflare Turnstile 和高级反爬虫挑战时，往往因其特征明显的自动化信号而失效 3。在此背景下，puppeteer-real-browser 项目的出现并非简单的功能叠加，而是对浏览器自动化控制流进行的一次深度重构，旨在通过协议层、环境层及行为层的全方位伪装，实现对高度保护站点的无缝访问 1。

## **自动化检测的范式转移与原生 Puppeteer 的脆弱性**

在分析 puppeteer-real-browser 的技术优势之前，必须首先理解现代反机器人系统（Anti-Bot Systems）的检测逻辑演变。早期的检测主要依赖于静态特征，如 User-Agent 字符串、IP 信誉度或简单的 HTTP 头部检查。然而，以 Cloudflare 为代表的新一代防御体系已经转向了多维度的动态审计。

原生 Puppeteer 尽管基于标准的 Chromium 内核，但在其默认配置下，会向网页环境泄露大量足以证明其“机器人身份”的信号。最为人熟知的是 navigator.webdriver 属性，在自动化环境下，该属性通常被设置为 true 2。尽管开发者可以尝试手动修改该属性，但现代检测脚本能够通过 Object.getOwnPropertyDescriptor 等底层 API 探测该属性是否被篡改或存在代理拦截的迹象 8。

更深层次的检测存在于浏览器运行时的内部机制中。Puppeteer 通过 Chrome DevTools Protocol (CDP) 与浏览器通信，这一过程会产生特定的侧信道信号 10。例如，为了在页面上下文中执行 JavaScript，Puppeteer 必须获取执行上下文 ID，这一操作通常依赖于 Runtime.enable 命令。研究表明，该命令的调用会导致浏览器触发特定的内部事件，而这些事件可以通过精心设计的 JavaScript 钩子在页面端被捕捉到 10。这种在协议层面的暴露，使得即便在无头模式（Headless Mode）下修改了所有表面指纹，自动化工具依然无所遁形 10。

## **puppeteer-real-browser 的核心技术支柱**

puppeteer-real-browser 能够有效解决 Cloudflare 验证问题的核心在于其采用了不同于传统“补丁式”方案的架构。它并非单纯地在 Puppeteer 之上添加混淆层，而是通过集成 rebrowser-patches、重构启动逻辑以及引入人类行为模拟库，构建了一个高度仿真的浏览器运行环境 1。

### **协议层规避：Rebrowser 补丁的深度整合**

该项目的核心竞争力之一是深度集成了 rebrowser-patches 1。这一补丁集针对 puppeteer-core 进行了物理层面的修改，直接解决了前文提到的 CDP 暴露问题。其最显著的改进在于重新定义了自动化工具获取执行上下文的方式，从而规避了触发 Runtime.enable 这一致命信号 10。

在 rebrowser-patches 的实现中，它提供了多种替代方案来管理执行上下文，从而在不被检测的情况下维持对页面的控制能力：

| 补丁机制 | 技术原理 | 规避效果 |
| :---- | :---- | :---- |
| addBinding | 在主世界中创建一个新的绑定，并利用该绑定捕获并保存上下文 ID。 | 极高；不使用 Runtime.enable 即可维持对主世界变量的访问。 10 |
| alwaysIsolated | 强制所有代码在通过 Page.createIsolatedWorld 创建的独立世界中运行。 | 优；能有效防止页面脚本通过 MutationObserver 探测自动化操作，但限制了对主上下文变量的访问。 10 |
| enableDisable | 在极短时间内开启并立即关闭 Runtime.enable，仅为捕获上下文创建事件。 | 良；将暴露窗口缩减至毫秒级，大大降低了被检测的概率。 10 |

此外，该补丁还对 sourceURL 进行了处理。默认情况下，Puppeteer 在执行 page.evaluate() 时会在脚本末尾附加 //\# sourceURL=pptr:...，这在堆栈跟踪检查中是一个显眼的特征。puppeteer-real-browser 通过补丁将其修改为通用的 app.js 或随机字符串，消除了从错误堆栈识别自动化工具的可能性 3。

### **启动架构的现实主义重构**

与标准 Puppeteer 自行管理浏览器生命周期的做法不同，puppeteer-real-browser 引入了 chrome-launcher 库来初始化浏览器实例 1。这一转变具有深远的技术意义。

标准的 puppeteer.launch() 会向 Chromium 进程注入一系列旨在优化自动化效率的命令行参数，例如 \--disable-background-networking、--disable-extensions 和 \--remote-debugging-port。反爬虫系统会扫描进程启动参数和端口占用情况，从而识别非正常的浏览器启动行为 4。

puppeteer-real-browser 通过 chrome-launcher 启动 Chrome，使其在进程树和启动标志上与普通用户手动打开的浏览器完全一致 3。它支持通过 customConfig 参数传入用户自定义的配置，包括 userDataDir（用户数据目录）和 chromePath（指定原生 Chrome 安装路径） 5。这种“以真实 Chrome 替换 Chromium”的策略，确保了浏览器在底层二进制特征、系统库依赖以及初始状态上具备天然的免疫力 6。

## **环境完整性与硬件指纹的仿真**

Cloudflare Turnstile 等高级挑战不仅检查浏览器软件，还会执行复杂的硬件探测，以确保请求并非来自受限的虚拟机或云端容器 4。puppeteer-real-browser 在这方面的应对策略集中在图形渲染和虚拟显示技术的运用上。

### **WebGL 与 Canvas 渲染的真实性**

反机器人系统经常利用 HTML5 Canvas 和 WebGL API 来生成图形指纹 15。在无头模式或受限环境中，图形通常由 Google SwiftShader 等软件渲染器生成，这会导致渲染结果在像素级精度、着色器编译耗时以及支持的扩展指令集上与真实显卡存在显著差异 4。

puppeteer-real-browser 强烈建议在非无头模式（GUI 模式）下运行，或者在 Linux 环境中使用 xvfb（X 虚拟帧缓冲） 1。在 Linux 上，该库会自动创建一个虚拟显示器，并在其中运行完整的图形化 Chrome 5。这一架构允许浏览器调用宿主系统的图形驱动程序或高效的硬件加速层，从而生成真实的 WebGL 渲染结果和 Canvas 指纹，成功通过 Cloudflare 对图形子系统的完整性审计 1。

### **操作系统级属性的深度一致性**

除了硬件渲染，puppeteer-real-browser 还通过补丁和配置确保了浏览器报告的环境属性与底层系统高度一致。

| 环境属性 | 传统 Puppeteer 的风险点 | puppeteer-real-browser 的改进方案 |
| :---- | :---- | :---- |
| navigator.languages | 默认可能为空或仅包含单语言，不匹配系统区域设置。 | 自动同步或模拟标准浏览器的语言列表，避免异常值。 3 |
| Screen Resolution | 固定的视口大小（如 800x600）显得极不自然。 | 支持全屏启动并动态调整视口，匹配真实的屏幕分辨率分布。 1 |
| Permissions API | 无头模式下部分权限（如通知、传感器）的状态与真人不符。 | 通过 Rebrowser 补丁修正权限查询结果，使其返回“提示”或“允许”而非默认的“拒绝”。 4 |

## **行为层仿真：人类动态特征的模拟**

在通过了环境和协议层的初步筛选后，自动化脚本必须在交互过程中表现得像一个真实的人类。Cloudflare Turnstile 的验证核心之一是监测用户的交互轨迹，特别是鼠标移动的动力学特征 1。

### **动力学路径生成：Ghost-Cursor 的应用**

原生 Puppeteer 的鼠标操作是瞬时的且呈直线轨迹，这在反机器人系统的监测下无异于自投罗网。puppeteer-real-browser 集成了 ghost-cursor 库，并将其封装为 page.realCursor 和 page.realClick 等方法 5。

ghost-cursor 基于贝塞尔曲线（Bézier Curve）算法生成移动路径。其数学模型可以表示为：  
$$B(t) \= \\sum\_{i=0}^{n} \\binom{n}{i} (1-t)^{n-i} t^i P\_i, \\quad t \\in $$  
其中 $P\_i$ 是控制点。通过在起始点和终点之间随机生成控制点，该算法能产生带有加速度变化、轻微抖动且非匀速的轨迹，完美模拟了人类在使用物理鼠标时的物理惯性和不确定性 1。这种非机械的移动方式是突破 Turnstile 验证中“验证您是人类”点击挑战的关键所在 1。

### **CDP-bug-MouseEvent 的技术修正**

该项目还包含了一个针对 CDP-bug-MouseEvent 的特定修复 1。在某些自动化环境下，浏览器内部上报的 screenX 和 screenY 坐标值与实际模拟点击的坐标之间存在细微偏差，这种坐标系统的不一致性是高级检测算法识别合成事件（Synthetic Events）的重要依据。通过修复这一漏洞，puppeteer-real-browser 确保了所有模拟交互在浏览器内核视角下都具备完美的物理逻辑一致性 1。

## **网络与传输层：JA3 指纹与 TLS 协议栈的对齐**

即使浏览器环境完美无瑕，如果网络请求的 TLS 握手特征暴露了底层使用的是非浏览器库，Cloudflare 依然会实施阻断。这就是所谓的 JA3 指纹识别技术 21。

### **JA3 握手特征的内生性一致**

JA3 指纹是通过对 TLS Client Hello 包中的多个字段进行哈希处理生成的。

| 组成字段 | 数据内容 | 对检测的影响 |
| :---- | :---- | :---- |
| TLS Version | 客户端支持的最高协议版本。 | 区分现代浏览器与陈旧的抓取脚本。 22 |
| Cipher Suites | 加密套件列表及其特定顺序。 | 每个浏览器版本都有独特的套件排序逻辑。 22 |
| Extensions | SNI、ALPN、支持的组等扩展。 | 反映了底层网络库（如 OpenSSL、Go、BoringSSL）的特性。 22 |

puppeteer-real-browser 通过启动真实的 Chrome 浏览器来发起请求，这意味着它使用的是 Chrome 原生的、经过高度优化的网络协议栈（通常是 BoringSSL） 14。与那些试图在 Python 或 Node.js 中手动模拟 TLS 握手的工具不同，它生成的 JA3 指纹是真实的、天然的，且随着 Chrome 的更新自动演进，无需手动维护加密套件列表 23。这种基于“真实客户端发起请求”的模式，彻底消除了由于 TLS 握手异常导致的 403 错误或挑战失败 2。

### **HTTP/2 帧结构与多路复用特征**

在 TLS 握手之后，Cloudflare 还会审计 HTTP/2 协议的特征，包括 SETTINGS 帧的参数、初始窗口大小以及头部压缩（HPACK）的行为 25。puppeteer-real-browser 运行的真实浏览器会自动执行标准的多路复用逻辑和资源优先级排序，这与反爬虫系统预设的“真实人类浏览器”模型完全契合，进一步增强了在高安全级别下的通行能力 14。

## **云端验证绕过的实践：Cloudflare Turnstile 自动点击逻辑**

puppeteer-real-browser 在设计上不仅考虑了规避检测，还针对最常见的验证障碍提供了主动处理机制。最为显著的功能是当配置项 turnstile: true 被开启时，它能自动识别并解决 Cloudflare Turnstile 挑战 1。

### **自动识别与状态轮询**

当启用 turnstile 选项后，库内部会启动一个页面监控逻辑。它通过选择器（如 .cf-turnstile 或 input\[name="cf-turnstile-response"\]）来定位验证组件 6。与第三方代打码平台需要提取 SiteKey 并远程计算 Token 的昂贵且缓慢的过程不同，该库直接在本地浏览器环境中处理验证 1。

### **智能点击与 DOM 状态变更**

自动点击过程并非盲目的。系统会利用 ghost-cursor 生成轨迹，并配合 page.realClick 执行动作 1。由于底层已经通过补丁消除了自动化信号，Turnstile 在运行时会认为当前的交互来自一个合法的、环境完整的真实用户，从而迅速完成验证。

在代码实现层面，用户通常需要配合一定的延迟逻辑，以等待验证完成后页面内容的更新。由于 puppeteer-real-browser 不提供验证成功的直接回调函数，开发者常使用一种“基于 DOM 变化的等待策略” 1：

JavaScript

// 核心逻辑演示：自动处理 Turnstile 并在验证后提取数据  
const { connect } \= require("puppeteer-real-browser");

(async () \=\> {  
    // 启动具有规避能力的浏览器实例  
    const { browser, page } \= await connect({  
        headless: false,  
        turnstile: true, // 开启自动点击功能  
        args: \["--start-maximized"\]  
    });

    await page.goto("https://www.scrapingcourse.com/antibot-challenge");  
      
    // 关键步骤：等待验证组件被触发并自动点击  
    // 由于库在后台异步处理，此处需硬性等待或轮询目标内容  
    await new Promise(resolve \=\> setTimeout(resolve, 10000));  
      
    // 验证成功后，页面通常会加载隐藏内容或跳转  
    await page.waitForSelector("\#challenge-info");  
    const content \= await page.$eval("\#challenge-info", el \=\> el.textContent);  
    console.log("验证通过后的数据:", content);

    await browser.close();  
})();

## **技术对比：puppeteer-real-browser 与主流方案的优劣分析**

为了更清晰地界定 puppeteer-real-browser 的技术位置，有必要将其与 vanilla Puppeteer、Puppeteer-Extra-Stealth 以及专业的云端爬虫服务进行横向对比。

| 特性 | Vanilla Puppeteer | Stealth Plugin | puppeteer-real-browser | ZenRows/Bright Data |
| :---- | :---- | :---- | :---- | :---- |
| **检测风险** | 极高（WebDriver, CDP 暴露） | 中（属性篡改可被探测） | 低（协议层深度补丁） | 极低（分布式指纹管理） |
| **验证通过率** | 极低 | 中（仅限简单挑战） | 高（有效应对 Turnstile） | 极高（AI 驱动的绕过） |
| **性能开销** | 低（轻量级无头模式） | 中 | 高（需运行 GUI/Xvfb） | 低（API 形式调用） |
| **维护成本** | 低 | 高（需频繁更新补丁） | 中（项目已停止更新） | 零（全托管服务） |
| **配置难度** | 简单 | 简单 | 中（需处理 Xvfb 依赖） | 简单（仅需更改连接地址） |

### **与 Stealth 插件的本质区别**

传统的 puppeteer-extra-plugin-stealth 采取的是“被动防御”策略。它试图在浏览器环境初始化后，通过运行一段 JavaScript 代码来屏蔽 navigator.webdriver 或伪造 chrome.runtime 等对象 7。这种方法的局限性在于，它无法掩盖浏览器与自动化驱动程序（CDP）之间的底层交互信号 10。

相比之下，puppeteer-real-browser 采取的是“主动透明”策略。它不仅在 JavaScript 层进行伪装，更重要的是在协议层修改了浏览器对自动化指令的响应方式。由于它使用了 chrome-launcher 启动原生 Chrome，并结合了物理层面的 Rebrowser 补丁，它从根本上消除了“补丁被检测”的可能性 5。

## **局限性分析与未来挑战**

尽管 puppeteer-real-browser 在解决 Cloudflare 验证方面表现卓越，但技术的发展从未停滞。该项目目前也面临着一些严峻的挑战。

### **项目停更带来的防御失效风险**

最为核心的问题是该仓库已于 2024 年底左右宣布停止维护 1。反机器人供应商如 Cloudflare 拥有专业的安全团队，会不断针对开源的自动化绕过工具进行指纹建模。由于缺乏持续的更新，该库所依赖的特定补丁逻辑和行为路径可能会逐渐被纳入检测黑名单。例如，Rebrowser 补丁虽然目前有效，但如果检测机构发现了通过 addBinding 捕获上下文 ID 过程中的细微时延差异，这种规避手段也将失效 3。

### **资源开销与大规模扩展的难度**

由于该库在非无头模式（GUI 模式）或 Xvfb 环境下表现最为稳定，其内存和 CPU 消耗远高于纯粹的无头模式自动化 3。对于需要并行运行数百个实例的大规模抓取任务，这种架构会带来沉重的基础设施成本。相比之下，现代的企业级解决方案通常采用在云端动态注入指纹的模式，在维持无头模式效率的同时实现相同的规避效果 2。

### **验证码的“无限旋转”与交互回退**

在极少数情况下，即便是采用了最先进的规避技术，Cloudflare Turnstile 依然可能进入“无限旋转”状态，这通常是因为当前的 IP 信誉度过低或地理位置特征与 TLS 指纹不匹配 19。此时，单纯依靠 puppeteer-real-browser 的本地点击功能无法解决问题，往往需要结合高质量的住宅代理（Residential Proxies）进行 IP 轮换，或者引入交互式回退方案（Interactive Fallback），让真实的人类参与一次性验证后再接管会话 6。

## **深度总结与行动建议**

puppeteer-real-browser 成功的关键在于其对“真实性”的执着追求。它通过以下四个维度的协同作用，构建了一个足以欺骗顶级安全屏障的数字镜像：

1. **协议隐形：** 通过 Rebrowser 补丁消除了 CDP 通信的侧信道痕迹。  
2. **环境完整：** 利用原生 Chrome 进程和虚拟图形渲染通过了硬件完整性审计。  
3. **行为仿真：** 引入动力学路径生成算法，赋予了自动化脚本人类般的运动特征。  
4. **传输一致：** 依靠原生网络栈确保了 TLS 和 HTTP/2 指纹的真实性。

对于需要绕过 Cloudflare 验证的开发者，在利用该工具时应遵循以下专业建议：

* **在 Linux 服务器上必须配置 Xvfb：** 这是保证图形环境真实性的前提，也是该库在服务器端运行的核心要求 5。  
* **优先使用真实 Chrome 路径：** 通过 customConfig.chromePath 指定系统中安装的最新版稳定 Chrome，而非依赖 Puppeteer 默认下载的 Chromium 6。  
* **结合住宅代理实现链路闭环：** 规避验证不仅是浏览器的问题，IP 层的信誉同样至关重要。将该库与旋转住宅代理结合，可极大提高 Turnstile 的一次性通过率 6。  
* **关注工业级替代方案：** 考虑到该项目的停更状态，对于生产级别的任务，应开始评估 ZenRows、Bright Data 或 Scrapeless 等托管式“抓取浏览器”服务，这些服务在底层协议补丁和指纹更新上具备更强的时效性 1。

在自动化与反自动化的对抗中，puppeteer-real-browser 代表了一个重要的里程碑：它证明了简单的 API 欺骗已经失效，只有在协议、环境和行为上实现深度的“架构级仿真”，才能在日益严苛的互联网防御体系中寻得生存空间。

#### **引用的著作**

1. Puppeteer Real Browser: Anti-Bot Scraping Guide 2026 \- Bright Data, 访问时间为 一月 2, 2026， [https://brightdata.com/blog/web-data/puppeteer-real-browser](https://brightdata.com/blog/web-data/puppeteer-real-browser)  
2. How to Bypass Cloudflare With Puppeteer: 2 Working Methods \- ZenRows, 访问时间为 一月 2, 2026， [https://www.zenrows.com/blog/puppeteer-cloudflare-bypass](https://www.zenrows.com/blog/puppeteer-cloudflare-bypass)  
3. Puppeteer Real Browser: A Guide to Avoid Detection with Puppeteer \- ZenRows, 访问时间为 一月 2, 2026， [https://www.zenrows.com/blog/puppeteer-real-browser](https://www.zenrows.com/blog/puppeteer-real-browser)  
4. How to Bypass Cloudflare with Puppeteer \- Kameleo, 访问时间为 一月 2, 2026， [https://kameleo.io/blog/how-to-bypass-cloudflare-with-puppeteer](https://kameleo.io/blog/how-to-bypass-cloudflare-with-puppeteer)  
5. ZFC-Digital/puppeteer-real-browser: This package is designed to bypass puppeteer's bot-detecting captchas such as Cloudflare. It acts like a real browser and can be managed with puppeteer. \- GitHub, 访问时间为 一月 2, 2026， [https://github.com/ZFC-Digital/puppeteer-real-browser](https://github.com/ZFC-Digital/puppeteer-real-browser)  
6. How to Bypass Cloudflare Anti-Bot Checks with Puppeteer \- Blog Froxy, 访问时间为 一月 2, 2026， [https://blog.froxy.com/en/bypass-cloudflare-with-puppeteer](https://blog.froxy.com/en/bypass-cloudflare-with-puppeteer)  
7. Scrapeless Browser Vs Puppeteer Stealth: Which Is Better For Scraping?, 访问时间为 一月 2, 2026， [https://www.scrapeless.com/en/blog/scrapeless-browser-puppeteer-stealth](https://www.scrapeless.com/en/blog/scrapeless-browser-puppeteer-stealth)  
8. From Puppeteer stealth to Nodriver: How anti-detect frameworks evolved to evade bot detection \- Security Boulevard, 访问时间为 一月 2, 2026， [https://securityboulevard.com/2025/06/from-puppeteer-stealth-to-nodriver-how-anti-detect-frameworks-evolved-to-evade-bot-detection/](https://securityboulevard.com/2025/06/from-puppeteer-stealth-to-nodriver-how-anti-detect-frameworks-evolved-to-evade-bot-detection/)  
9. Rebrowser: Headless Browser Tool Overview & Detection Tactics \- DataDome, 访问时间为 一月 2, 2026， [https://datadome.co/anti-detect-tools/rebrowser/](https://datadome.co/anti-detect-tools/rebrowser/)  
10. rebrowser/rebrowser-patches: Collection of patches for ... \- GitHub, 访问时间为 一月 2, 2026， [https://github.com/rebrowser/rebrowser-patches](https://github.com/rebrowser/rebrowser-patches)  
11. Patches for Puppeteer and Playwright / Documentation / Rebrowser, 访问时间为 一月 2, 2026， [https://rebrowser.net/docs/patches-for-puppeteer-and-playwright](https://rebrowser.net/docs/patches-for-puppeteer-and-playwright)  
12. Undetected Chromedriver: The Ultimate Guide to Bypassing Bot Detection in 2025, 访问时间为 一月 2, 2026， [https://rebrowser.net/blog/undetected-chromedriver-the-ultimate-guide-to-bypassing-bot-detection](https://rebrowser.net/blog/undetected-chromedriver-the-ultimate-guide-to-bypassing-bot-detection)  
13. puppeteer-real-browser \- NPM, 访问时间为 一月 2, 2026， [https://www.npmjs.com/package/puppeteer-real-browser](https://www.npmjs.com/package/puppeteer-real-browser)  
14. Puppeteer Real Browser Guide \- ScrapeOps, 访问时间为 一月 2, 2026， [https://scrapeops.io/puppeteer-web-scraping-playbook/nodejs-puppeteer-real-browser/](https://scrapeops.io/puppeteer-web-scraping-playbook/nodejs-puppeteer-real-browser/)  
15. What Is WebGL Fingerprinting and How to Bypass It \- ZenRows, 访问时间为 一月 2, 2026， [https://www.zenrows.com/blog/webgl-fingerprinting](https://www.zenrows.com/blog/webgl-fingerprinting)  
16. What Is WebGL Fingerprinting and How to Bypass It in 2025 \- Roundproxies, 访问时间为 一月 2, 2026， [https://roundproxies.com/blog/webgl-fingerprinting/](https://roundproxies.com/blog/webgl-fingerprinting/)  
17. What Is WebGL Fingerprinting and How to Bypass It (2025 Guide) \- Scrapeless, 访问时间为 一月 2, 2026， [https://www.scrapeless.com/en/blog/webgl-fingerprint](https://www.scrapeless.com/en/blog/webgl-fingerprint)  
18. Puppeteer-Extra-Stealth Guide \- Bypass Anti-Bots With Ease | ScrapeOps, 访问时间为 一月 2, 2026， [https://scrapeops.io/puppeteer-web-scraping-playbook/nodejs-puppeteer-extra-stealth-plugin/](https://scrapeops.io/puppeteer-web-scraping-playbook/nodejs-puppeteer-extra-stealth-plugin/)  
19. Bypassing Cloudflare with Puppeteer Stealth Mode \- What Works and What Doesn't \- Reddit, 访问时间为 一月 2, 2026， [https://www.reddit.com/r/ClaudeCode/comments/1p8r2cs/bypassing\_cloudflare\_with\_puppeteer\_stealth\_mode/](https://www.reddit.com/r/ClaudeCode/comments/1p8r2cs/bypassing_cloudflare_with_puppeteer_stealth_mode/)  
20. Question related Puppeteer-real-browser · Issue \#11 \- GitHub, 访问时间为 一月 2, 2026， [https://github.com/ZFC-Digital/puppeteer-real-browser/issues/11](https://github.com/ZFC-Digital/puppeteer-real-browser/issues/11)  
21. How TLS Fingerprint is Used to Block Web Scrapers? \- Scrapfly, 访问时间为 一月 2, 2026， [https://scrapfly.io/blog/posts/how-to-avoid-web-scraping-blocking-tls](https://scrapfly.io/blog/posts/how-to-avoid-web-scraping-blocking-tls)  
22. JA3 TLS Fingerprint \- Detect Browser TLS/SSL Fingerprinting \- Scrapfly, 访问时间为 一月 2, 2026， [https://scrapfly.io/web-scraping-tools/ja3-fingerprint](https://scrapfly.io/web-scraping-tools/ja3-fingerprint)  
23. Cloudflare TLS Fingerprinting: What It Is and How to Solve It \- CapSolver, 访问时间为 一月 2, 2026， [https://www.capsolver.com/blog/Cloudflare/cloudflare-tls](https://www.capsolver.com/blog/Cloudflare/cloudflare-tls)  
24. TLS Fingerprinting: How It Works & How to Bypass It (2025) \- Browserless, 访问时间为 一月 2, 2026， [https://www.browserless.io/blog/tls-fingerprinting-explanation-detection-and-bypassing-it-in-playwright-and-puppeteer](https://www.browserless.io/blog/tls-fingerprinting-explanation-detection-and-bypassing-it-in-playwright-and-puppeteer)  
25. What Is HTTP/2 Fingerprinting and How to Bypass It? | Ultimate Guide \- Scrapeless, 访问时间为 一月 2, 2026， [https://www.scrapeless.com/en/blog/bypass-https2](https://www.scrapeless.com/en/blog/bypass-https2)  
26. How to Solve Cloudflare with Puppeteer \- CapSolver, 访问时间为 一月 2, 2026， [https://www.capsolver.com/blog/Cloudflare/solve-cloudflare-with-puppeteer](https://www.capsolver.com/blog/Cloudflare/solve-cloudflare-with-puppeteer)  
27. Puppeteer Stealth Tutorial; How to Set Up & Use (+ Working Alternatives) \- ScrapingBee, 访问时间为 一月 2, 2026， [https://www.scrapingbee.com/blog/puppeteer-stealth-tutorial-with-examples/](https://www.scrapingbee.com/blog/puppeteer-stealth-tutorial-with-examples/)  
28. Playwright vs Puppeteer: Best Choice for Web Scraping? \- BrowserCat, 访问时间为 一月 2, 2026， [https://www.browsercat.com/post/playwright-vs-puppeteer-web-scraping-comparison](https://www.browsercat.com/post/playwright-vs-puppeteer-web-scraping-comparison)