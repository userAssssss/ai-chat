import { defineStore } from 'pinia'
import { load, save } from '../utils/storage'
import { genId } from '../utils/id'
import { streamChat } from '../api/chat'
import { buildContext } from '../utils/token'
import { useSettingsStore } from './settings'

// stop/retry 共用的中断控制器
let abortController = null

function createSession(title = '新对话') {
  return {
    id: genId(),
    title,
    messages: [],
    createdAt: Date.now(),
  }
}

export const useChatStore = defineStore('chat', {
  state: () => {
    const saved = load('chat', {})
    const sessions = (saved.sessions || []).map((s) => ({
      ...s,
      // 刷新前未完成的生成不可能继续，统一标记为已停止，否则消息永久卡在 generating
      messages: (s.messages || []).map((m) =>
        m.status === 'generating' ? { ...m, status: 'aborted' } : m,
      ),
    }))
    return {
      sessions,
      activeId: saved.activeId ?? null,
      streaming: false,
      streamingSessionId: null,
    }
  },
  getters: {
    activeSession(state) {
      return state.sessions.find((s) => s.id === state.activeId) || null
    },
  },
  actions: {
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
      // 删除正在生成的会话时中断请求，避免继续空跑
      if (this.streamingSessionId === id) this.stop()
      this.sessions = this.sessions.filter((x) => x.id !== id)
      if (this.activeId === id) this.activeId = this.sessions[0]?.id ?? null
      this.persist()
    },

    appendMessage(message) {
      this.activeSession?.messages.push(message)
      this.persist()
    },
    // 流式期间用户可能切换会话，写入必须按 sessionId 定位，不能依赖 activeSession
    findMessage(sessionId, id) {
      return this.sessions.find((s) => s.id === sessionId)?.messages.find((x) => x.id === id)
    },
    // 高频更新，不落盘
    updateMessage(sessionId, id, content) {
      const m = this.findMessage(sessionId, id)
      if (m) m.content = content
    },
    appendReasoning(sessionId, id, delta) {
      const m = this.findMessage(sessionId, id)
      if (m) m.reasoning = (m.reasoning || '') + delta
    },
    setMessageStatus(sessionId, id, status) {
      const m = this.findMessage(sessionId, id)
      if (m) m.status = status
    },

    // 生成中忽略，防并发
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
          // error 消息的内容是错误文案，发给模型会污染上下文
          ...session.messages
            .filter((m) => m.status !== 'error')
            .map(({ role, content }) => ({ role, content })),
        ],
        { maxTokens: settings.maxContextTokens },
      )

      const assistantMsg = {
        id: genId(),
        role: 'assistant',
        content: '',
        reasoning: '',
        status: 'generating',
      }
      this.appendMessage(assistantMsg)

      this.streaming = true
      this.streamingSessionId = session.id
      abortController = new AbortController()

      try {
        await streamChat({
          provider: settings.provider,
          model: settings.model,
          messages,
          temperature: settings.temperature,
          effort: settings.effort,
          signal: abortController.signal,
          onDelta: (delta) =>
            this.updateMessage(session.id, assistantMsg.id, assistantMsg.content + delta),
          onReasoning: (delta) => this.appendReasoning(session.id, assistantMsg.id, delta),
        })
        this.setMessageStatus(session.id, assistantMsg.id, 'success')
      } catch (err) {
        if (err.name === 'AbortError') {
          this.setMessageStatus(session.id, assistantMsg.id, 'aborted')
        } else {
          this.setMessageStatus(session.id, assistantMsg.id, 'error')
          // 保留已流出的部分内容，错误文案只在内容为空时写入（失败状态另有提示和重试入口）
          if (!assistantMsg.content) {
            this.updateMessage(
              session.id,
              assistantMsg.id,
              `⚠️ ${err.message || '请求出错，请检查 API Key 与网络'}`,
            )
          }
        }
      } finally {
        this.streaming = false
        this.streamingSessionId = null
        abortController = null
        this.persist()
      }
    },

    // 移除失败消息后重试
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

    persist() {
      const data = {
        sessions: this.sessions.map((s) => ({
          id: s.id,
          title: s.title,
          createdAt: s.createdAt,
          messages: s.messages.map(({ id, role, content, status, reasoning }) => ({
            id,
            role,
            content,
            status,
            reasoning,
          })),
        })),
        activeId: this.activeId,
      }
      save('chat', data)
    },
  },
})
