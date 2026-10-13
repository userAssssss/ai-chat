import { marked } from 'marked'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 代码块高亮 + 复制按钮
const renderer = {
  code({ text, lang }) {
    const language = (lang || '').split(/\s+/)[0]
    const highlighted =
      language && hljs.getLanguage(language)
        ? hljs.highlight(text, { language }).value
        : escapeHtml(text)
    return (
      '<div class="code-wrap">' +
      `<button class="code-copy" data-code="${escapeHtml(text)}">复制</button>` +
      `<pre><code class="hljs">${highlighted}</code></pre>` +
      '</div>'
    )
  },
}

// marked 是全局单例，配置只做一次（不要放在组件 setup 里）
marked.use({ renderer, gfm: true, breaks: true })

export function renderMarkdown(text) {
  try {
    // 模型输出不可信，消毒后再交给 v-html
    return DOMPurify.sanitize(marked.parse(text))
  } catch {
    return ''
  }
}
