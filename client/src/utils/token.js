// 粗略估算 token 数：中文字符按 1 token，其余按 4 字符折合 1 token
export function estimateTokens(text) {
  if (typeof text !== 'string' || text.length === 0) return 0
  const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const other = text.length - chinese
  return Math.ceil(chinese + other / 4)
}

// 滑动窗口截断：system 消息始终保留在最前，其余从最新往回累积，直到接近 token 上限
export function buildContext(allMessages, { maxTokens = 4000 } = {}) {
  const systemMessages = allMessages.filter((m) => m.role === 'system')
  const history = allMessages.filter((m) => m.role !== 'system')

  const systemTokens = systemMessages.reduce((sum, m) => sum + estimateTokens(m.content), 0)
  let remain = maxTokens - systemTokens

  const kept = []
  for (let i = history.length - 1; i >= 0 && remain > 0; i--) {
    const cost = estimateTokens(history[i].content)
    if (cost > remain) break
    kept.unshift(history[i])
    remain -= cost
  }

  return [...systemMessages, ...kept]
}
