// 统一请求封装：开发环境直连代理服务（CORS 已开启），生产环境走同源 /api
const BASE_URL =
  import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:3001' : '')

async function request(url, options = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    let message = `请求失败 (${res.status})`
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch {
      // 响应体不是 JSON 时保留默认提示
    }
    throw new Error(message)
  }

  return res
}

export default request
