<script setup>
import { ref } from 'vue'
import { useSettingsStore, PROVIDERS } from '../stores/settings'

const settings = useSettingsStore()
const open = ref(false)

const PRESETS = [
  {
    label: '前端面试官',
    prompt:
      '你是一位资深前端面试官。请围绕前端知识向候选人提问，针对回答进行追问、点评，并给出改进建议。',
  },
  {
    label: '翻译大师',
    prompt:
      '你是一名专业翻译。请把用户输入的内容准确、通顺地翻译成中文（或按用户指定的目标语言）。',
  },
  {
    label: '代码助手',
    prompt: '你是一名资深软件工程师。请给出清晰、规范、可运行的代码，并解释关键逻辑。',
  },
]

function applyPreset(p) {
  settings.setSystemPrompt(p.prompt)
}
</script>

<template>
  <div class="border-b border-gray-200 bg-white">
    <header class="flex items-center gap-2 px-4 py-2">
      <span class="text-sm text-gray-500 shrink-0">模型</span>
      <select
        :value="settings.provider"
        class="rounded-lg border border-gray-300 px-2 py-1.5 text-sm bg-white"
        @change="settings.setProvider($event.target.value)"
      >
        <option v-for="(p, key) in PROVIDERS" :key="key" :value="key">{{ p.label }}</option>
      </select>
      <select
        :value="settings.model"
        class="rounded-lg border border-gray-300 px-2 py-1.5 text-sm bg-white"
        @change="settings.setModel($event.target.value)"
      >
        <option v-for="m in PROVIDERS[settings.provider].models" :key="m.value" :value="m.value">
          {{ m.label }}
        </option>
      </select>

      <button
        class="shrink-0 rounded-lg border px-3 py-1.5 text-sm transition"
        :class="
          settings.deepThinking
            ? 'border-blue-300 bg-blue-50 text-blue-600'
            : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
        "
        :title="settings.deepThinking ? '已开启：模型会先深入思考再回答' : '已关闭：快速浅思考回答'"
        @click="settings.setDeepThinking(!settings.deepThinking)"
      >
        🧠 深度思考{{ settings.deepThinking ? '：开' : '：关' }}
      </button>

      <div class="flex-1"></div>

      <button
        class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        @click="open = !open"
      >
        ⚙ 系统预设
      </button>
    </header>

    <div v-if="open" class="px-4 py-3 space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm text-gray-500">角色预设：</span>
        <button
          v-for="p in PRESETS"
          :key="p.label"
          class="rounded-full px-3 py-1 text-sm border border-gray-300 hover:bg-gray-50"
          @click="applyPreset(p)"
        >
          {{ p.label }}
        </button>
      </div>

      <textarea
        :value="settings.systemPrompt"
        rows="3"
        placeholder="自定义 System Prompt，例如：你是一名前端面试官……"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        @input="settings.setSystemPrompt($event.target.value)"
      ></textarea>

      <div class="flex items-center gap-3 text-sm text-gray-500">
        <label>温度</label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          :value="settings.temperature"
          class="flex-1 max-w-xs"
          @input="settings.setTemperature(parseFloat($event.target.value))"
        />
        <span>{{ settings.temperature.toFixed(1) }}</span>
      </div>
    </div>
  </div>
</template>
