# PsyAI

PsyAI 是一个本地优先的 Windows 桌面应用，包含三条核心 workflow：

- `counseling`：心理咨询
- `simulation`：情境模拟
- `resonance`：同频共振

当前仓库是适合上传 GitHub 的源码版，不包含 `node_modules`、构建产物、打包产物和个人运行时数据。

## 运行环境

- Windows
- Node.js 20 或更高版本
- npm

## 快速开始

```powershell
npm install
npm start
```

`npm start` 会先按 workspace 依赖顺序完整构建，再启动 Electron 桌面端。

## 仓库结构

- `src/`：主源码目录
- `data/knowledge-counseling/`：咨询 workflow 使用的种子知识材料
- `data/knowledge-resonance/`：同频共振 workflow 使用的种子案例与知识材料
- `架构约束/task12/设定库/`：情境模拟运行时需要的人物与环境设定库

以下内容属于运行时自动生成，不建议提交到 GitHub：

- `data/db/`
- `data/indexes/`
- `data/exports/`
- `data/uploads/`
- `data/snapshots/`
- `data/desktop-runtime-config.json`
- 各 workspace 下的 `dist/`
- `node_modules/`

应用启动后会自动创建缺失的数据目录、SQLite 文件和知识库索引。

## DeepSeek 配置

应用支持两种模式：

- 未配置 API Key：回退到本地演示模式
- 已配置 DeepSeek API Key：启用 real assembly + DeepSeek

配置方式：

1. 启动应用
2. 打开“设置”
3. 填写：
   - `providerId = deepseek`
   - `modelName = deepseek-v4-flash`
   - `endpoint = https://api.deepseek.com`
   - `apiKey = 你的 DeepSeek Key`
4. 点击保存

也支持环境变量：

```powershell
$env:DEEPSEEK_API_KEY="sk-..."
npm start
```

## 校验命令

源码版默认保留的可用校验命令：

```powershell
npm run build
npm run check
```

`npm test`、`npm run smoke:*` 在当前源码版中只保留占位说明，不再包含自动化测试资产。

## 发布建议

上传 GitHub 前，建议确认：

1. 本地 `node_modules/` 没有被提交
2. 各 workspace 的 `dist/` 没有被提交
3. `data/db/`、`data/indexes/`、`data/exports/`、`data/uploads/`、`data/snapshots/` 没有被提交
4. `data/knowledge-counseling/` 和 `data/knowledge-resonance/` 中只保留你愿意公开分发的种子材料
