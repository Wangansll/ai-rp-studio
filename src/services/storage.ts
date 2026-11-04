// ====== localStorage 持久化服务 ======
import type { AppData } from '../types'

const STORAGE_KEY = 'ai-rp-v7'

const DEFAULT_DATA: AppData = {
  stories: [],
  sessions: {},
  currentStoryId: null,
  currentSessionId: null,
  settings: {
    ollamaUrl: 'http://localhost:11434',
    comfyUrl: 'http://127.0.0.1:8188',
    comfyModel: 'hassakuHentai_v11.safetensors',
  },
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_DATA, stories: [], sessions: {} }
    const parsed = JSON.parse(raw)
    // 补全可能缺失的字段
    return {
      ...DEFAULT_DATA,
      ...parsed,
      stories: parsed.stories || [],
      sessions: parsed.sessions || {},
    }
  } catch {
    return { ...DEFAULT_DATA, stories: [], sessions: {} }
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('localStorage 写入失败:', e)
  }
}

export function uuid(): string {
  return 'xxxx-xxxx-4xxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16))
}
