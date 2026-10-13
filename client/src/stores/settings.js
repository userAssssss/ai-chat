import { defineStore } from 'pinia'
import { load, save } from '../utils/storage'

// 需与 api/chat.js 的 PROVIDERS 保持一致
export const PROVIDERS = {
  deepseek: {
    label: 'DeepSeek',
    models: [
      { value: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
      { value: 'deepseek-flash', label: 'DeepSeek Flash' },
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
  model: 'deepseek-v4-pro',
  deepThinking: true,
  systemPrompt: '',
  temperature: 0.7,
  maxContextTokens: 4000,
}

export const useSettingsStore = defineStore('settings', {
  state: () => {
    const saved = load('settings', {})
    // 校验持久化数据，provider/model 失效（如版本升级删减）时回退默认值
    const provider = PROVIDERS[saved.provider] ? saved.provider : DEFAULTS.provider
    const model = PROVIDERS[provider].models.some((m) => m.value === saved.model)
      ? saved.model
      : PROVIDERS[provider].models[0].value
    return { ...DEFAULTS, ...saved, provider, model }
  },
  getters: {
    // 深度思考开关 → DeepSeek effort 档位
    effort: (state) => (state.deepThinking ? 'high' : 'low'),
  },
  actions: {
    setProvider(provider) {
      if (!PROVIDERS[provider]) return
      this.provider = provider
      // 模型不存在时回退到第一个
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
    setDeepThinking(deepThinking) {
      this.deepThinking = deepThinking
      this.persist()
    },
    persist() {
      save('settings', {
        provider: this.provider,
        model: this.model,
        systemPrompt: this.systemPrompt,
        temperature: this.temperature,
        deepThinking: this.deepThinking,
        maxContextTokens: this.maxContextTokens,
      })
    },
  },
})
