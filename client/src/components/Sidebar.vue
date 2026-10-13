<script setup>
import { useChatStore } from '../stores/chat'

const chat = useChatStore()

function onRename(session) {
  const title = window.prompt('重命名会话', session.title)
  if (title?.trim()) chat.renameSession(session.id, title.trim())
}
</script>

<template>
  <aside class="w-64 shrink-0 flex flex-col bg-gray-900 text-gray-200 border-r border-gray-800">
    <div class="p-4">
      <button
        class="w-full rounded-lg border border-gray-700 hover:bg-gray-800 px-3 py-2 text-sm transition"
        @click="chat.newSession()"
      >
        + 新建会话
      </button>
    </div>

    <nav class="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
      <div
        v-for="s in chat.sessions"
        :key="s.id"
        class="group flex items-center rounded-lg px-3 py-2 text-sm cursor-pointer transition"
        :class="
          s.id === chat.activeId ? 'bg-gray-700 text-white' : 'hover:bg-gray-800 text-gray-300'
        "
        @click="chat.selectSession(s.id)"
      >
        <span class="flex-1 truncate">{{ s.title || '新对话' }}</span>
        <button
          class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white px-1"
          title="重命名"
          @click.stop="onRename(s)"
        >
          ✎
        </button>
        <button
          class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 px-1"
          title="删除"
          @click.stop="chat.deleteSession(s.id)"
        >
          ✕
        </button>
      </div>
      <p v-if="chat.sessions.length === 0" class="px-3 py-2 text-sm text-gray-500">暂无会话</p>
    </nav>
  </aside>
</template>
