<script setup>
import SettingsPanel from './SettingsPanel.vue'
import MessageList from './MessageList.vue'
import InputBox from './InputBox.vue'
</script>

<template>
  <main class="flex-1 flex flex-col min-w-0">
    <SettingsPanel />
    <MessageList />
    <InputBox />
  </main>
</template>
