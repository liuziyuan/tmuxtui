# NPM CLI 应用自更新功能设计方案

这是一份可复用的设计文档，用于在 npm CLI 应用中实现自动更新功能。

## 功能概述

添加 `<cli-name> update` 子命令，让全局安装的 npm CLI 工具能够自动检查并更新到最新版本，无需用户手动执行 `npm install -g`。

## 设计方案

### 执行流程

```
<cli-name> update
  │
  ├─ 打印当前版本：Current version: vX.X.X
  ├─ 执行 npm view <package-name> version（获取 registry 最新版）
  │
  ├─ 版本相同 → 打印 "Already up to date." 退出
  │
  └─ 版本不同 → 打印 "Updating to vX.X.X..."
                 执行 npm install -g <package-name>@latest（stdio: inherit）
                 打印 "Done. Updated to vX.X.X" 退出
```

### 关键特性

- **无需用户确认** — 直接执行更新
- **版本检查** — 自动比对当前版本与最新版本
- **错误处理** — 网络失败、npm 命令失败时优雅退出
- **进度反馈** — 显示当前版本、更新提示、最终结果
- **零额外依赖** — 仅使用 Node.js 内置 `execSync` 和系统 npm CLI

## 实现步骤

### 前置条件

- 项目已有版本注入机制（如 esbuild `define`、环保变量等）
- 项目包已发布到 npm public registry
- 项目使用全局安装方式：`npm install -g <package-name>`

### Step 1: 在 CLI 入口文件中添加 update 命令

在命令分发逻辑中增加新分支（与 `version`、`help` 等命令同级）：

```typescript
// ── CLI Entry Point (src/index.ts / bin/cli.ts etc.) ──
import { execSync } from 'child_process';

// 假设 __APP_VERSION__ 已由构建工具注入
declare const __APP_VERSION__: string | undefined;

// ... 其他命令处理 ...

if (args[0] === 'update') {
  const packageName = 'your-package-name'; // 替换为实际包名
  const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
  
  console.log(`Current version: v${currentVersion}`);

  let latestVersion: string;
  try {
    latestVersion = execSync(`npm view ${packageName} version`, { 
      encoding: 'utf8' 
    }).trim();
  } catch {
    console.error('Failed to check latest version. Please check your network connection.');
    process.exit(1);
  }

  if (currentVersion === latestVersion) {
    console.log('Already up to date.');
    process.exit(0);
  }

  console.log(`Updating to v${latestVersion}...`);
  try {
    execSync(`npm install -g ${packageName}@latest`, { 
      stdio: 'inherit'  // 显示 npm 的实时输出
    });
  } catch {
    process.exit(1);
  }
  
  console.log(`Done. Updated to v${latestVersion}`);
  process.exit(0);
}
```

### Step 2: 构建验证

确保版本号能在构建产物中正确注入：

```bash
# 构建
npm run build

# 测试（应显示正确的版本号，而非 'dev'）
node dist/cli.js update
```

### Step 3: 更新文档

在 README 中添加 Commands 章节，记录所有可用 CLI 命令：

#### 英文版本示例

```markdown
### Commands

#### Update — self-update

\`\`\`bash
<cli-name> update
\`\`\`

Checks for the latest version on npm registry and automatically updates to the latest version if available. Shows the current version, and confirms the updated version after completion.
```

#### 中文版本示例

```markdown
### 命令

#### Update — 自动更新

\`\`\`bash
<cli-name> update
\`\`\`

检查 npm 仓库中的最新版本，如有新版本则自动更新。显示当前版本，更新完成后确认新版本号。
```

## 实现检查清单

使用此清单验证实现的完整性：

- [ ] 在 CLI 入口添加 `update` 命令分支
- [ ] 替换 `packageName` 为实际的 npm 包名
- [ ] 版本获取使用 `execSync('npm view <pkg> version')`
- [ ] 版本安装使用 `execSync('npm install -g <pkg>@latest', { stdio: 'inherit' })`
- [ ] 版本相同时显示 "Already up to date."
- [ ] 版本不同时显示更新进度和完成信息
- [ ] 网络错误时捕获并显示错误提示
- [ ] npm 命令失败时以非零退出码退出
- [ ] 构建后二进制文件中版本号正确注入
- [ ] README 中记录 update 命令的说明
- [ ] 测试命令识别、版本检查、更新流程

## 测试方法

### 开发模式测试

```bash
npx tsx src/index.ts update
# 或其他开发运行方式
```

预期：打印当前版本（可能为 'dev'），检查 npm registry，显示更新结果。

### 构建后测试

```bash
npm run build
node dist/cli.js update
```

预期：打印正确的版本号，检查 npm registry，执行更新（如有新版本），显示最终结果。

### 网络失败测试（可选）

临时断网或使用代理阻止 npm registry 访问，验证错误提示。

## 常见问题

### Q: 如何知道应用的版本号？

A: 检查构建配置，查找版本号的注入方式：
- esbuild: 检查 `define` 选项
- webpack: 检查 `DefinePlugin`
- TypeScript + tsx: 可使用 `import.meta.env` 或手动注入
- 环境变量: `process.env.APP_VERSION`

### Q: npm view 命令很慢怎么办？

A: 可考虑用 HTTP 请求替代（参见"替代方案"）。

### Q: 如何支持其他包管理器（yarn、pnpm）？

A: 需要检测当前安装方式，相应调用不同的更新命令。超出本方案范围，建议作为后续增强。

## 替代方案

### 方案 A（推荐）：npm view + npm install（本方案）

**优点**：
- 零额外依赖
- 符合现有 npm 工作流
- 实现简单

**缺点**：
- 网络请求较慢（npm view 启动开销）
- 依赖本地 npm CLI

### 方案 B：直接 HTTP 请求 npm registry

**实现**：
```typescript
const response = await fetch('https://registry.npmjs.org/your-package');
const data = await response.json();
const latestVersion = data['dist-tags'].latest;
```

**优点**：
- 更快（无 npm CLI 启动开销）
- 不依赖本地 npm 可用性

**缺点**：
- 需要网络库（如 `node-fetch` 或 Node 18+ 原生 `fetch`）
- 需要处理 registry URL 变化（私有 registry）

### 方案 C：使用第三方包（如 `update-notifier`）

**优点**：
- 功能齐全、测试充分

**缺点**：
- 引入额外依赖
- 通常设计为"后台通知"而非主动更新

## 版本对比逻辑

当前实现使用字符串相等比对：`currentVersion === latestVersion`

对于语义化版本（semver），如需更精确的版本比较（如检测补丁更新），可引入 `semver` 包或实现自定义比较逻辑。本方案建议保持简单的字符串比对。

## 总结

该方案提供了一个最小化、零依赖的自更新实现，适合大多数 npm CLI 应用。核心代码仅需 ~26 行，易于集成和维护。

---

**创建时间**：2026-04-15  
**设计基础**：tmuxtui 项目实现
