const PROVIDERS = {
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    envKey: 'DEEPSEEK_API_KEY',
  },
  kimi: {
    label: 'Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    envKey: 'MOONSHOT_API_KEY',
  },
}

function jsonError(status, error) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

export async function handleChat(request) {
  if (request.method !== 'POST') {
    return jsonError(405, 'Method Not Allowed')
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonError(400, '请求体不是合法 JSON')
  }

  const { provider, model, messages, temperature, effort } = body || {}
  const conf = PROVIDERS[provider]
  if (!conf) {
    return jsonError(400, `未知的模型提供商：${provider}`)
  }

  const key = process.env[conf.envKey] || ''
  if (!key) {
    return jsonError(
      500,
      `${conf.label} 的 API Key 未配置，请在项目根目录 .env 中填写 ${conf.envKey}`,
    )
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError(400, 'messages 不能为空')
  }

  let upstream
  try {
    upstream = await fetch(`${conf.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: model || conf.defaultModel,
        messages,
        stream: true,
        temperature: temperature ?? 0.7,
        // 仅 DeepSeek 支持 effort（low/high/max），其他提供商不传
        ...(provider === 'deepseek' && effort ? { effort } : {}),
      }),
      signal: request.signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      return new Response(null, { status: 499 })
    }
    return jsonError(502, `无法连接上游服务：${err.message}`)
  }

  if (!upstream.ok) {
    const text = await upstream.text()
    return jsonError(upstream.status, `上游错误 (${upstream.status})：${text}`)
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

export const config = {
  runtime: 'edge',
  maxDuration: 300,
}

export default async function handler(request) {
  return handleChat(request)
}
