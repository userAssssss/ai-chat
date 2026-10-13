<script setup>
import { ref, watch, nextTick } from 'vue'
import { useChatStore } from '../stores/chat'
import MessageItem from './MessageItem.vue'

const chat = useChatStore()
const listEl = ref(null)

// 内容变化（新增消息 / 流式增长）时自动滚动到底部
watch(
  () => chat.activeSession?.messages.map((m) => m.content).join('') || '',
  async () => {
    await nextTick()
    listEl.value?.scrollTo({ top: listEl.value.scrollHeight })
  },
)
</script>

<template>
  <div ref="listEl" class="flex-1 overflow-y-auto px-4 py-6">
    <div class="max-w-3xl mx-auto space-y-5">
      <div v-if="!chat.activeSession?.messages.length" class="text-center text-gray-400 mt-24">
        <p class="text-2xl mb-2">👋</p>
        <p>开始你的对话吧</p>
      </div>

      <MessageItem v-for="m in chat.activeSession?.messages" :key="m.id" :message="m" />

      <div v-if="chat.streaming" class="text-sm text-gray-400">正在输入…</div>
    </div>
  </div>
</template>
