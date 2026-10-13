<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useChatStore } from '../stores/chat'
import MessageItem from './MessageItem.vue'

const chat = useChatStore()
const listEl = ref(null)
const messages = computed(() => chat.activeSession?.messages ?? [])

// 指示器跟随真正有消息在生成的会话，切走后不再误显示
const isGenerating = computed(() => messages.value.some((m) => m.status === 'generating'))

// 自动滚到底部
watch(
  () => messages.value.map((m) => (m.content || '') + (m.reasoning || '')).join(''),
  async () => {
    await nextTick()
    listEl.value?.scrollTo({ top: listEl.value.scrollHeight })
  },
)
</script>

<template>
  <div ref="listEl" class="flex-1 overflow-y-auto px-4 py-6">
    <div class="max-w-3xl mx-auto space-y-5">
      <div v-if="!messages.length" class="text-center text-gray-400 mt-24">
        <p class="text-2xl mb-2">👋</p>
        <p>开始你的对话吧</p>
      </div>

      <MessageItem
        v-for="(m, i) in messages"
        :key="m.id"
        :message="m"
        :is-last="i === messages.length - 1"
      />

      <div v-if="isGenerating" class="text-sm text-gray-400">正在输入…</div>
    </div>
  </div>
</template>
