import request from './request'

// 解析 SSE data: {...} 流
export async function streamChat({
  provider,
  model,
  messages,
  temperature,
  effort,
  onDelta,
  onReasoning,
  signal,
}) {
  const res = await request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      provider,
      model,
      messages,
      temperature,
      effort,
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
      const delta = json.choices?.[0]?.delta
      if (delta?.content) onDelta(delta.content)
      if (delta?.reasoning_content) onReasoning?.(delta.reasoning_content)
    } catch {}
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
