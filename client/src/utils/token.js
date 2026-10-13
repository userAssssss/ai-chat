// 中文 1 token，其他 4 字符 1 token
export function estimateTokens(text) {
  if (typeof text !== 'string' || text.length === 0) return 0
  const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const other = text.length - chinese
  return Math.ceil(chinese + other / 4)
}

// system 保留，历史从新往旧截断
export function buildContext(allMessages, { maxTokens = 4000 } = {}) {
  const systemMessages = allMessages.filter((m) => m.role === 'system')
  const history = allMessages.filter((m) => m.role !== 'system')

  const systemTokens = systemMessages.reduce((sum, m) => sum + estimateTokens(m.content), 0)
  let remain = maxTokens - systemTokens

  const kept = []
  for (let i = history.length - 1; i >= 0; i--) {
    const cost = estimateTokens(history[i].content)
    // 最新一条无条件保留（否则超长消息会把用户提问整条挤掉），其余按剩余预算从新往旧装填
    if (kept.length > 0 && cost > remain) break
    kept.unshift(history[i])
    remain -= cost
    if (remain <= 0) break
  }

  return [...systemMessages, ...kept]
}
