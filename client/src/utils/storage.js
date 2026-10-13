const PREFIX = 'ai-chat:'

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // 存储空间不足等情况，静默忽略
  }
}

export function remove(key) {
  localStorage.removeItem(PREFIX + key)
}
