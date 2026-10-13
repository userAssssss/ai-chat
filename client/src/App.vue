<script setup>
import { onMounted } from 'vue'
import { useChatStore } from './stores/chat'
import Sidebar from './components/Sidebar.vue'
import ChatView from './components/ChatView.vue'

const chat = useChatStore()

onMounted(() => chat.ensureSession())
</script>

<template>
  <div class="flex h-screen bg-gray-50 text-gray-900">
    <Sidebar />
    <ChatView />
  </div>
</template>
