import { defineStore } from 'pinia'
import { load, save } from '../utils/storage'
import { genId } from '../utils/id'
import { streamChat } from '../api/chat'
import { buildContext } from '../utils/token'
import { useSettingsStore } from './settings'

// 对话过程中的 AbortController（模块级，与 store 实例解耦，保证 stop/retry 共享同一控制器）
let abortController = null

function createSession(title = '新对话') {
  return {
    id: genId(),
    title,
    messages: [],
    createdAt: Date.now(),
  }
}

// 消息状态机：idle -> generating -> success / error / aborted
// （user 消息无 status；assistant 消息在生成过程中经历上游三个终态之一）

export const useChatStore = defineStore('chat', {
  state: () => ({
    sessions: [],
    activeId: null,
    streaming: false,
    ...load('chat', {}),
  }),
  getters: {
    activeSession(state) {
      return state.sessions.find((s) => s.id === state.activeId) || null
    },
  },
  actions: {
    // ---------- 会话管理 ----------
    ensureSession() {
      if (this.sessions.length === 0) {
        this.sessions.push(createSession())
        this.activeId = this.sessions[0].id
      } else if (!this.activeSession) {
        this.activeId = this.sessions[0].id
      }
      this.persist()
    },
    newSession() {
      const s = createSession()
      this.sessions.unshift(s)
      this.activeId = s.id
      this.persist()
    },
    selectSession(id) {
      if (this.sessions.some((s) => s.id === id)) this.activeId = id
      this.persist()
    },
    renameSession(id, title) {
      const s = this.sessions.find((x) => x.id === id)
      if (s) s.title = title
      this.persist()
    },
    deleteSession(id) {
      this.sessions = this.sessions.filter((x) => x.id !== id)
      if (this.activeId === id) this.activeId = this.sessions[0]?.id ?? null
      this.persist()
    },

    // ---------- 消息管理 ----------
    appendMessage(message) {
      this.activeSession?.messages.push(message)
      this.persist()
    },
    // 流式输出时高频调用，仅在内存中更新，避免频繁写 localStorage
    updateMessage(id, content) {
      const m = this.activeSession?.messages.find((x) => x.id === id)
      if (m) m.content = content
    },
    setMessageStatus(id, status) {
      const m = this.activeSession?.messages.find((x) => x.id === id)
      if (m) m.status = status
    },

    // ---------- 对话编排（请求锁 + 状态机） ----------
    // 请求锁：streaming 为 true 时直接忽略，防止并发请求堆积（防抖在 InputBox 层兜底）
    async send(text) {
      if (!text?.trim() || this.streaming) return
      this.ensureSession()

      const wasEmpty = this.activeSession.messages.length === 0
      this.appendMessage({ id: genId(), role: 'user', content: text.trim() })
      if (wasEmpty) this.renameSession(this.activeId, text.trim().slice(0, 20))

      await this.generateReply()
    },

    async generateReply() {
      const session = this.activeSession
      if (!session) return

      const settings = useSettingsStore()
      const messages = buildContext(
        [
          ...(settings.systemPrompt ? [{ role: 'system', content: settings.systemPrompt }] : []),
          ...session.messages.map(({ role, content }) => ({ role, content })),
        ],
        { maxTokens: settings.maxContextTokens },
      )

      const assistantMsg = { id: genId(), role: 'assistant', content: '', status: 'generating' }
      this.appendMessage(assistantMsg)

      this.streaming = true
      abortController = new AbortController()

      try {
        await streamChat({
          provider: settings.provider,
          model: settings.model,
          messages,
          temperature: settings.temperature,
          signal: abortController.signal,
          onDelta: (delta) => this.updateMessage(assistantMsg.id, assistantMsg.content + delta),
        })
        this.setMessageStatus(assistantMsg.id, 'success')
      } catch (err) {
        if (err.name === 'AbortError') {
          this.setMessageStatus(assistantMsg.id, 'aborted')
        } else {
          this.setMessageStatus(assistantMsg.id, 'error')
          this.updateMessage(
            assistantMsg.id,
            `⚠️ ${err.message || '请求出错，请检查 API Key 与网络'}`,
          )
        }
      } finally {
        this.streaming = false
        abortController = null
        this.persist()
      }
    },

    // 重试某条失败的助手消息：移除后基于已有的 user 消息重新生成
    retry(messageId) {
      if (this.streaming) return
      const session = this.activeSession
      if (!session) return
      const idx = session.messages.findIndex((m) => m.id === messageId)
      if (idx < 0) return
      session.messages.splice(idx, 1)
      this.persist()
      this.generateReply()
    },

    stop() {
      abortController?.abort()
    },

    // ---------- 持久化 ----------
    persist() {
      const data = {
        sessions: this.sessions.map((s) => ({
          id: s.id,
          title: s.title,
          createdAt: s.createdAt,
          messages: s.messages.map(({ id, role, content, status }) => ({
            id,
            role,
            content,
            status,
          })),
        })),
        activeId: this.activeId,
      }
      save('chat', data)
    },
  },
})
