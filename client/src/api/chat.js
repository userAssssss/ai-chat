import request from './request'

// SSE 流式对话：解析 OpenAI 兼容的 data: {...} 协议，逐段回调 onDelta
export async function streamChat({
  provider,
  model,
  messages,
  temperature,
  maxTokens,
  onDelta,
  signal,
}) {
  const res = await request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      provider,
      model,
      messages,
      temperature,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    }),
    signal,
  })

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const handleLine = (line) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) return
    const data = trimmed.slice(5).trim()
    if (!data || data === '[DONE]') return
    try {
      const json = JSON.parse(data)
      const delta = json.choices?.[0]?.delta?.content
      if (delta) onDelta(delta)
    } catch {
      // 忽略无法解析的行
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    lines.forEach(handleLine)
  }
  if (buffer) handleLine(buffer)
}
