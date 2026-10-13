import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 模型提供商配置：DeepSeek / Kimi(Moonshot) 均为 OpenAI 兼容格式
const PROVIDERS = {
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    key: process.env.DEEPSEEK_API_KEY || '',
  },
  kimi: {
    label: 'Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    key: process.env.MOONSHOT_API_KEY || '',
  },
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// 核心接口：把前端请求流式转发到对应上游模型
app.post('/api/chat', async (req, res) => {
  const { provider, model, messages, temperature, max_tokens } = req.body || {}

  const conf = PROVIDERS[provider]
  if (!conf) {
    return res.status(400).json({ error: `未知的模型提供商：${provider}` })
  }
  if (!conf.key) {
    return res
      .status(500)
      .json({ error: `${conf.label} 的 API Key 未配置，请在 server/.env 中填写` })
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages 不能为空' })
  }

  let upstream
  try {
    upstream = await fetch(`${conf.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${conf.key}`,
      },
      body: JSON.stringify({
        model: model || conf.defaultModel,
        messages,
        stream: true,
        temperature: temperature ?? 0.7,
        ...(max_tokens ? { max_tokens } : {}),
      }),
    })
  } catch (err) {
    return res.status(502).json({ error: `无法连接上游服务：${err.message}` })
  }

  if (!upstream.ok) {
    const text = await upstream.text()
    return res.status(upstream.status).json({ error: `上游错误 (${upstream.status})：${text}` })
  }

  // 将上游 SSE 数据流原样透传给浏览器
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(decoder.decode(value, { stream: true }))
    }
  } catch {
    // 客户端提前断开时，读取上游会抛错，静默结束
  } finally {
    res.end()
  }
})

// 生产环境：托管前端构建产物（执行 npm run build 后，npm run start 即可单端口部署）
const distDir = path.join(__dirname, '..', 'client', 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`[proxy] 服务已启动：http://localhost:${PORT}`)
})
