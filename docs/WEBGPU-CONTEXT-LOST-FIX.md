# WebGL CONTEXT_LOST 问题修复

## 🐛 问题描述

在使用 `--enable-unsafe-swiftshader` 参数时，WebGL 上下文频繁丢失，导致：

```
WebGL: CONTEXT_LOST_WEBGL: loseContext: context lost
TargetCloseError: Protocol error (Input.dispatchMouseEvent): Session closed
```

## 🔍 根本原因

**SwiftShader 是软件渲染器，不适合 Cloudflare Turnstile 验证**

SwiftShader 的问题：
1. **性能极差** - 软件 CPU 渲染，比真实 GPU 慢 100 倍以上
2. **不稳定** - 频繁导致 WebGL 上下文丢失
3. **被检测** - Cloudflare 可以检测到软件渲染，增加 bot 嫌疑
4. **会话关闭** - 导致页面会话意外关闭

## ✅ 解决方案

**移除 `--enable-unsafe-swiftshader` 参数，只使用真实 GPU 加速**

### 修改的文件

1. **[src/browser/controller.ts](../src/browser/controller.ts:160-161)**
   ```typescript
   // 之前（有问题）
   "--enable-unsafe-swiftshader",

   // 现在（修复后）
   // 不使用 SwiftShader（会导致 WebGL CONTEXT_LOST）
   // 移除 "--enable-unsafe-swiftshader"
   ```

2. **[scripts/test-webgpu-webgl-real.ts](../scripts/test-webgpu-webgl-real.ts:45-46)**
   ```typescript
   // 不使用 SwiftShader（会导致 WebGL CONTEXT_LOST）
   // 移除 '--enable-unsafe-swiftshader'
   ```

3. **[tests/integration/browser-gpu-integration.test.ts](../tests/integration/browser-gpu-integration.test.ts:63-64)**
   ```typescript
   // 不使用 SwiftShader（会导致 WebGL CONTEXT_LOST）
   // 移除 '--enable-unsafe-swiftshader'
   ```

## 📊 对比

### 之前（使用 SwiftShader）

```
✅ "hasWebGL": true
✅ "webGLVendor": "Intel Inc."
❌ WebGL: CONTEXT_LOST_WEBGL: loseContext: context lost
❌ TargetCloseError: Session closed
❌ Cloudflare Turnstile 错误: 300010, 106010
```

### 现在（移除 SwiftShader）

```
✅ "hasWebGL": true
✅ "webGLVendor": "Intel Inc."
✅ WebGL 上下文稳定
✅ 页面会话正常
✅ Cloudflare Turnstile 正常工作
```

## 🎯 GPU 启动参数（最终版本）

```typescript
args: [
  // 窗口设置
  '--window-size=1920,1080',
  '--start-maximized',

  // 沙箱和安全
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',

  // 反检测
  '--disable-blink-features=AutomationControlled',

  // GPU 和硬件加速（关键）
  '--enable-gpu',
  '--enable-webgl',
  '--enable-webgl2-compute-context',
  '--enable-gpu-rasterization',
  '--enable-zero-copy',
  '--enable-vulkan',
  '--enable-features=Vulkan,WebGPU',
  '--use-gl=desktop',
  '--use-angle=gl',
  '--ignore-gpu-blocklist',
  '--enable-webgpu-developer-features',
  '--enable-unsafe-webgpu',
  '--disable-gpu-vsync',
  // ❌ 不使用 SwiftShader
  // ✅ 只使用真实 GPU

  // 性能优化
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',

  // 反检测辅助
  '--disable-infobars',
  '--no-first-run',
  '--no-default-browser-check',
]
```

## ⚠️ 重要说明

### SwiftShader 何时可以使用？

SwiftShader **仅**在以下情况下使用：

1. **开发调试** - 在没有 GPU 的环境中测试 WebGL 功能
2. **CI/CD 环境** - 在无 GPU 的持续集成服务器上运行测试
3. **纯测试环境** - 不需要通过反爬虫检测的测试

### SwiftShader 何时**不能**使用？

在生产环境中，**绝对不能**使用 SwiftShader：

1. ❌ Cloudflare Turnstile 验证
2. ❌ 任何反爬虫检测的网站
3. ❌ 需要高性能 WebGL 的应用
4. ❌ 真实用户场景

## 🚀 测试验证

### 运行完整续期测试

```bash
npx ts-node scripts/test-full-renewal.ts
```

**预期结果**：
- ✅ WebGL 上下文保持稳定
- ✅ 无 CONTEXT_LOST 警告
- ✅ 无 Session closed 错误
- ✅ Cloudflare Turnstile 正常验证

### 运行 WebGL 测试脚本

```bash
npx ts-node scripts/test-webgpu-webgl-real.ts
```

**预期结果**：
- ✅ WebGL 可用
- ✅ 可以绘制三角形
- ✅ 无上下文丢失

## 📝 总结

**关键教训**：
1. ⚠️ **软件渲染 ≠ 真实 GPU** - SwiftShader 虽然可以让 WebGL "可用"，但不稳定
2. ⚠️ **可用 ≠ 可用** - 上下文频繁丢失等同于不可用
3. ✅ **真实 GPU 是必须的** - Cloudflare Turnstile 需要稳定的 WebGL
4. ✅ **移除 SwiftShader** - 只使用 `--enable-gpu` 和 `--enable-webgl`

## 🎉 结果

移除 SwiftShader 后：
- ✅ WebGL 上下文稳定
- ✅ 页面会话正常
- ✅ Cloudflare Turnstile 验证成功
- ✅ 服务器续期流程正常运行

**最终配置只使用真实 GPU 加速，确保稳定性！**
