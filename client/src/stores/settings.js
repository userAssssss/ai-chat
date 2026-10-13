import { defineStore } from 'pinia'
import { load, save } from '../utils/storage'

// 模型提供商定义（与后端 server/index.js 中的 PROVIDERS 保持一致）
export const PROVIDERS = {
  deepseek: {
    label: 'DeepSeek',
    models: [
      { value: 'deepseek-chat', label: 'DeepSeek Chat' },
      { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
    ],
  },
  kimi: {
    label: 'Kimi',
    models: [
      { value: 'moonshot-v1-8k', label: 'Moonshot 8K' },
      { value: 'moonshot-v1-32k', label: 'Moonshot 32K' },
      { value: 'moonshot-v1-128k', label: 'Moonshot 128K' },
    ],
  },
}

const DEFAULTS = {
  provider: 'deepseek',
  model: 'deepseek-chat',
  systemPrompt: '',
  temperature: 0.7,
  maxContextTokens: 4000,
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({ ...DEFAULTS, ...load('settings', {}) }),
  actions: {
    setProvider(provider) {
      if (!PROVIDERS[provider]) return
      this.provider = provider
      // 切换提供商时若当前 model 不在其列表内，则自动切到第一个
      const models = PROVIDERS[provider].models
      if (!models.some((m) => m.value === this.model)) {
        this.model = models[0].value
      }
      this.persist()
    },
    setModel(model) {
      this.model = model
      this.persist()
    },
    setSystemPrompt(prompt) {
      this.systemPrompt = prompt
      this.persist()
    },
    setTemperature(temperature) {
      this.temperature = temperature
      this.persist()
    },
    persist() {
      save('settings', {
        provider: this.provider,
        model: this.model,
        systemPrompt: this.systemPrompt,
        temperature: this.temperature,
        maxContextTokens: this.maxContextTokens,
      })
    },
  },
})
