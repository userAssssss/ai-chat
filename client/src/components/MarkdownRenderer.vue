<script setup>
import { computed } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'

const props = defineProps({
  content: { type: String, required: true },
})

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 自定义代码块渲染：高亮 + 包裹复制按钮
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

marked.use({ renderer, gfm: true, breaks: true })

const html = computed(() => {
  try {
    return marked.parse(props.content)
  } catch {
    return ''
  }
})

async function copyCode(event) {
  const btn = event.target.closest('.code-copy')
  const code = btn?.dataset.code
  if (!code) return
  try {
    await navigator.clipboard.writeText(code)
    const old = btn.textContent
    btn.textContent = '已复制'
    setTimeout(() => (btn.textContent = old), 1200)
  } catch {
    // 剪贴板不可用时忽略
  }
}
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="markdown-body" @click="copyCode" v-html="html"></div>
</template>
