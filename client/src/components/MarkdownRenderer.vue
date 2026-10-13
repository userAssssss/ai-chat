<script setup>
import { computed } from 'vue'
import { renderMarkdown } from '../utils/markdown'

const props = defineProps({
  content: { type: String, required: true },
})

const html = computed(() => renderMarkdown(props.content))

async function copyCode(event) {
  const btn = event.target.closest('.code-copy')
  const code = btn?.dataset.code
  if (!code) return
  try {
    await navigator.clipboard.writeText(code)
    const old = btn.textContent
    btn.textContent = '已复制'
    setTimeout(() => (btn.textContent = old), 1200)
  } catch {}
}
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="markdown-body" @click="copyCode" v-html="html"></div>
</template>
