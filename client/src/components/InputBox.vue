<script setup>
import { ref, nextTick } from 'vue'
import { useChatStore } from '../stores/chat'

const chat = useChatStore()
const text = ref('')
const boxEl = ref(null)

function submit() {
  const value = text.value.trim()
  if (!value || chat.streaming) return
  text.value = ''
  autoResize()
  chat.send(value)
  nextTick(() => boxEl.value?.focus())
}

// IME 组合中的 Enter 是确认拼音，不发送；keyCode 229 兼容旧浏览器
function onEnter(e) {
  if (e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  submit()
}

function autoResize() {
  const el = boxEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`
}
</script>

<template>
  <div class="border-t border-gray-200 bg-white px-4 py-3">
    <div class="max-w-3xl mx-auto flex items-end gap-2">
      <textarea
        ref="boxEl"
        v-model="text"
        rows="1"
        placeholder="输入消息，Enter 发送，Shift + Enter 换行"
        class="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        @input="autoResize"
        @keydown.enter.exact="onEnter"
      ></textarea>
      <button
        v-if="chat.streaming"
        class="rounded-xl bg-gray-200 px-4 py-3 text-gray-700 hover:bg-gray-300 shrink-0"
        @click="chat.stop()"
      >
        停止
      </button>
      <button
        v-else
        class="rounded-xl bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 shrink-0 disabled:opacity-40"
        :disabled="!text.trim()"
        @click="submit"
      >
        发送
      </button>
    </div>
  </div>
</template>
