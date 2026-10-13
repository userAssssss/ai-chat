import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { handleChat } from '../api/chat.js'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function nodeToWebRequest(req, abortController) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      const headers = new Headers()
      for (const [key, value] of Object.entries(req.headers)) {
        if (value == null) continue
        headers.set(key, Array.isArray(value) ? value.join(', ') : String(value))
      }
      const method = req.method || 'GET'
      const body = method === 'GET' || method === 'HEAD' ? undefined : Buffer.concat(chunks)
      resolve(
        new Request('http://local/api/chat', {
          method,
          headers,
          body,
          signal: abortController.signal,
        }),
      )
    })
    req.on('error', reject)
  })
}

async function writeWebResponse(webRes, res) {
  res.statusCode = webRes.status
  webRes.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })
  if (!webRes.body) {
    res.end()
    return
  }
  const reader = webRes.body.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
  } finally {
    res.end()
  }
}

function localApiPlugin() {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0]
        if (pathname === '/api/health') {
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ ok: true }))
          return
        }
        if (pathname !== '/api/chat') {
          next()
          return
        }

        const abortController = new AbortController()
        // req 的 'close' 在 Node 18+ 中请求体读完就会触发（keep-alive 下不代表客户端断开），
        // 必须监听 res 并用 writableEnded 判断客户端是否真的中途断开
        const onClose = () => {
          if (!res.writableEnded) abortController.abort()
        }
        res.on('close', onClose)

        try {
          const webReq = await nodeToWebRequest(req, abortController)
          const webRes = await handleChat(webReq)
          await writeWebResponse(webRes, res)
        } catch (err) {
          if (err.name === 'AbortError') {
            if (!res.writableEnded) res.end()
            return
          }
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: err.message || '服务器错误' }))
            return
          }
          if (!res.writableEnded) res.end()
        } finally {
          res.off('close', onClose)
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '')
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value
  }

  return {
    plugins: [vue(), localApiPlugin()],
    server: {
      port: 5173,
      open: false,
    },
  }
})
