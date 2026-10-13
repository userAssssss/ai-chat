# AI Chat

一个基于 Vue 3 的 AI 智能对话助手，支持多模型提供商、流式输出、深度思考展示，可直接部署到 Vercel。
在线使用：https://ai-chat-client-snowy.vercel.app/

## 功能特性

- **多模型提供商**：DeepSeek（V4 Pro / Flash）、Kimi（Moonshot）
- **流式输出**：基于 SSE 的逐字打字机效果
- **深度思考开关**：控制 DeepSeek 的 `effort` 档位（开启 `high` / 关闭 `low`），并实时展示模型的思考过程
- **Markdown 渲染**：支持代码高亮、行内代码、代码块一键复制
- **多会话管理**：会话的新建、重命名、删除，历史记录本地持久化（localStorage）
- **系统预设**：内置角色预设（前端面试官 / 翻译大师 / 代码助手），可自定义 System Prompt 与温度
- **一键部署**：已配置好 Vercel（`vercel.json` + `api/` Serverless Functions）

## 技术栈

- 前端：Vue 3、Vite 5、Pinia、Tailwind CSS
- Markdown：marked + highlight.js + DOMPurify
- 后端：Vercel Serverless / Edge Functions（Web API 风格，无 Node 依赖）
- 工程化：npm workspaces、ESLint、Prettier、Husky、commitlint

## 快速开始

### 环境要求

- Node.js ≥ 18

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入你的 API Key：

```bash
cp .env.example .env
```

`.env` 内容：

```bash
# DeepSeek：https://platform.deepseek.com/ -> API Keys
DEEPSEEK_API_KEY=

# Kimi(Moonshot)：https://platform.moonshot.cn/ -> API Key 管理
MOONSHOT_API_KEY=
```

> 至少填一个提供商即可使用；不填的提供商在界面上切过去会提示 Key 未配置。

### 3. 启动开发服务器

```bash
npm run dev
```

浏览器访问 <http://localhost:5173/>。

> 本地无需单独启动后端：`client/vite.config.js` 内置了一个本地 API 中间件，会把 `/api/chat`、`/api/health` 转发给根目录的 `api/` 函数，并自动读取根目录 `.env`。

## 常用命令

| 命令             | 说明                             |
| ---------------- | -------------------------------- |
| `npm run dev`    | 启动开发服务器                   |
| `npm run build`  | 构建前端（输出到 `client/dist`） |
| `npm run lint`   | 运行 ESLint                      |
| `npm run format` | 运行 Prettier 格式化             |

## 部署到 Vercel

1. 将代码推送到 GitHub
2. 在 [Vercel](https://vercel.com) 中 **Add New → Project → Import Git Repository**，选择仓库（框架会自动识别 Vite 与根目录 `vercel.json`）
3. 在 **Project → Settings → Environment Variables** 中添加环境变量：

   | Name               | Value                     |
   | ------------------ | ------------------------- |
   | `DEEPSEEK_API_KEY` | 你的 DeepSeek Key         |
   | `MOONSHOT_API_KEY` | 你的 Moonshot Key（可选） |

4. Deploy。完成后访问 `https://<项目名>.vercel.app/api/health`，返回 `{"ok":true}` 即部署成功

## 项目结构

```
.
├── api/                    # Vercel Serverless / Edge Functions
│   ├── chat.js             # 对话接口（SSE 流式，代理上游）
│   └── health.js           # 健康检查
├── client/                 # 前端（Vue 3 + Vite）
│   ├── src/
│   │   ├── api/            # 请求封装、SSE 解析
│   │   ├── components/     # UI 组件（设置面板、消息列表等）
│   │   ├── stores/         # Pinia 状态（聊天、设置）
│   │   └── utils/          # 工具函数（存储、token、markdown 等）
│   └── vite.config.js      # 含本地 API 中间件
├── .env.example            # 环境变量模板
├── vercel.json             # Vercel 部署配置
└── package.json            # npm workspaces 根配置
```

## 模型与「深度思考」

- 模型提供商与模型列表定义在 `client/src/stores/settings.js`，服务端提供商配置在 `api/chat.js`，两者需保持一致。
- 「深度思考」开关映射到 DeepSeek 的 `effort` 参数：开启为 `high`，关闭为 `low`。模型返回的 `reasoning_content`（思考过程）会以可折叠区块展示；若想完全不思考，请切换到 `deepseek-flash` 模型。
