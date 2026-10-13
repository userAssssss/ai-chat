<script setup>
import MarkdownRenderer from './MarkdownRenderer.vue'
import { useChatStore } from '../stores/chat'

defineProps({
  message: { type: Object, required: true },
  // 仅末尾消息允许重试：中途重试会把新回复追加到末尾，打乱对话顺序
  isLast: { type: Boolean, default: false },
})

const chat = useChatStore()
</script>

<template>
  <div class="flex" :class="message.role === 'user' ? 'justify-end' : 'justify-start'">
    <div
      class="max-w-[85%] rounded-2xl px-4 py-3"
      :class="
        message.role === 'user'
          ? 'bg-blue-600 text-white'
          : 'bg-white border border-gray-200 text-gray-800'
      "
    >
      <div v-if="message.role === 'assistant' && message.reasoning" class="mt-2">
        <details :open="message.status === 'generating' && !message.content">
          <summary class="cursor-pointer select-none text-xs text-gray-400 hover:text-gray-500">
            {{ message.status === 'generating' && !message.content ? '思考中…' : '已深度思考' }}
          </summary>
          <div
            class="mt-2 whitespace-pre-wrap border-l-2 border-gray-200 pl-3 text-xs text-gray-500"
          >
            {{ message.reasoning }}
          </div>
        </details>
      </div>
      <MarkdownRenderer v-if="message.role === 'assistant'" :content="message.content" />
      <p v-else class="whitespace-pre-wrap">{{ message.content }}</p>

      <div
        v-if="
          message.role === 'assistant' &&
          isLast &&
          (message.status === 'error' || message.status === 'aborted')
        "
        class="mt-2 flex items-center gap-2 text-xs"
      >
        <span :class="message.status === 'error' ? 'text-red-500' : 'text-gray-400'">
          {{ message.status === 'error' ? '请求失败' : '已停止' }}
        </span>
        <button
          class="rounded border border-gray-300 px-2 py-0.5 hover:bg-gray-50 text-gray-600"
          @click="chat.retry(message.id)"
        >
          重试
        </button>
      </div>
    </div>
  </div>
</template>
