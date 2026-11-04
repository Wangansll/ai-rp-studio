// ====== 全局状态管理 ======
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppData, Story, ChatSession, ChatMessage, Character, AppSettings, StoryFeatures } from '../types'
import { COVER_COLORS } from '../types'
import { loadData, saveData, uuid } from '../services/storage'

export const useStore = defineStore('main', () => {
  // ====== 状态 ======
  const data = ref<AppData>(loadData())
  const page = ref<'library' | 'story' | 'chat'>('library')
  const toastMsg = ref('')
  const toastType = ref<'success' | 'error'>('success')

  // ====== 计算属性 ======
  const stories = computed(() => data.value.stories)
  const currentStory = computed(() =>
    data.value.stories.find(s => s.id === data.value.currentStoryId) || null
  )
  const currentSession = computed(() => {
    if (!data.value.currentStoryId || !data.value.currentSessionId) return null
    const sessions = data.value.sessions[data.value.currentStoryId] || []
    return sessions.find(s => s.id === data.value.currentSessionId) || null
  })
  const settings = computed(() => data.value.settings)
  const coverColors = computed(() => COVER_COLORS)

  // ====== 持久化 ======
  function persist() { saveData(data.value) }

  // ====== Toast ======
  function toast(msg: string, type: 'success' | 'error' = 'success') {
    toastMsg.value = msg
    toastType.value = type
    setTimeout(() => { toastMsg.value = '' }, 3000)
  }

  // ====== 导航 ======
  function navigate(p: 'library' | 'story' | 'chat') { page.value = p }
  function enterStory(storyId: string) {
    data.value.currentStoryId = storyId
    page.value = 'story'
  }
  function enterChat(storyId: string, sessionId?: string) {
    data.value.currentStoryId = storyId
    if (sessionId) {
      data.value.currentSessionId = sessionId
    } else {
      // 创建新会话
      const st = data.value.stories.find(s => s.id === storyId)
      if (!st) return
      const session: ChatSession = {
        id: uuid(),
        name: `对话 ${(data.value.sessions[storyId] || []).length + 1}`,
        storyId,
        messages: [],
      }
      if (!data.value.sessions[storyId]) data.value.sessions[storyId] = []
      data.value.sessions[storyId].push(session)
      data.value.currentSessionId = session.id
    }
    persist()
    page.value = 'chat'
  }

  // ====== 故事 CRUD ======
  function createStory(): Story {
    return {
      id: uuid(),
      name: '',
      desc: '',
      world: '',
      userChar: '',
      tags: [],
      color: 'purple',
      emoji: '📖',
      characters: [],
      openers: [],
      model: 'dolphin-mistral:latest',
      features: {
        sceneImage: false,
        charAvatar: true,
        multiTurn: true,
        worldTrigger: false,
        narration: true,
        options: false,
      },
    }
  }

  function saveStory(story: Story) {
    const idx = data.value.stories.findIndex(s => s.id === story.id)
    if (idx >= 0) {
      data.value.stories[idx] = { ...story, characters: [...story.characters] }
    } else {
      data.value.stories.push({ ...story, characters: [...story.characters] })
    }
    persist()
    toast('故事已保存')
    navigate('story')
  }

  function deleteStory(storyId: string) {
    data.value.stories = data.value.stories.filter(s => s.id !== storyId)
    delete data.value.sessions[storyId]
    if (data.value.currentStoryId === storyId) {
      data.value.currentStoryId = null
      page.value = 'library'
    }
    persist()
    toast('故事已删除')
  }

  // ====== 角色 CRUD ======
  function saveCharacter(storyId: string, char: Character) {
    const st = data.value.stories.find(s => s.id === storyId)
    if (!st) return
    const idx = st.characters.findIndex(c => c.id === char.id)
    if (idx >= 0) st.characters[idx] = { ...char }
    else st.characters.push({ ...char })
    persist()
    toast('角色已保存')
  }

  function deleteCharacter(storyId: string, charId: string) {
    const st = data.value.stories.find(s => s.id === storyId)
    if (!st) return
    st.characters = st.characters.filter(c => c.id !== charId)
    persist()
    toast('角色已删除')
  }

  // ====== 开场白 ======
  function addOpener(storyId: string, text: string) {
    const st = data.value.stories.find(s => s.id === storyId)
    if (!st) return
    st.openers.push(text)
    persist()
  }

  function removeOpener(storyId: string, index: number) {
    const st = data.value.stories.find(s => s.id === storyId)
    if (!st) return
    st.openers.splice(index, 1)
    persist()
  }

  // ====== 会话管理 ======
  function switchSession(sessionId: string) {
    data.value.currentSessionId = sessionId
    persist()
  }

  function renameSession(storyId: string, sessionId: string, name: string) {
    const sessions = data.value.sessions[storyId]
    if (!sessions) return
    const s = sessions.find(s => s.id === sessionId)
    if (s) { s.name = name; persist() }
  }

  function deleteSession(storyId: string, sessionId: string) {
    const sessions = data.value.sessions[storyId]
    if (!sessions) return
    data.value.sessions[storyId] = sessions.filter(s => s.id !== sessionId)
    if (data.value.currentSessionId === sessionId) {
      data.value.currentSessionId = data.value.sessions[storyId]?.[0]?.id || null
    }
    persist()
  }

  // ====== 消息 ======
  function appendMessage(storyId: string, sessionId: string, msg: ChatMessage) {
    const sessions = data.value.sessions[storyId]
    if (!sessions) return
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      session.messages.push(msg)
      persist()
    }
  }

  function replaceLastMessage(storyId: string, sessionId: string, msg: ChatMessage) {
    const sessions = data.value.sessions[storyId]
    if (!sessions) return
    const session = sessions.find(s => s.id === sessionId)
    if (session && session.messages.length > 0) {
      session.messages[session.messages.length - 1] = msg
      persist()
    }
  }

  function clearSessionMessages(storyId: string, sessionId: string) {
    const sessions = data.value.sessions[storyId]
    if (!sessions) return
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      session.messages = []
      persist()
      toast('对话已清空')
    }
  }

  // ====== 设置 ======
  function updateSettings(part: Partial<AppSettings>) {
    Object.assign(data.value.settings, part)
    persist()
    toast('设置已保存')
  }

  return {
    data, page, toastMsg, toastType,
    stories, currentStory, currentSession, settings, coverColors,
    toast, navigate, enterStory, enterChat,
    createStory, saveStory, deleteStory,
    saveCharacter, deleteCharacter,
    addOpener, removeOpener,
    switchSession, renameSession, deleteSession,
    appendMessage, replaceLastMessage, clearSessionMessages,
    updateSettings,
    persist,
  }
})
