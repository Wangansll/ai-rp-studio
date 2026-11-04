// ====== 数据模型类型定义 ======

/** 故事中的角色 */
export interface Character {
  id: string
  name: string
  desc?: string           // 一句话简介
  appearance?: string     // 外貌
  personality?: string    // 性格
  avatar?: string         // base64 / URL
  customFields?: Record<string, string>  // 用户自定义字段
}

/** 一条聊天消息 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'narrator'
  content: string          // 假设 AI 返回含情绪标记的原文，由 renderer 解析
  characterId?: string     // 哪个角色说的（narrator 为空）
  characterName?: string
  timestamp: number
  imageUrl?: string        // 生图结果
  options?: string[]       // 选项分支
}

/** 一个对话会话 */
export interface ChatSession {
  id: string
  name: string
  storyId: string
  messages: ChatMessage[]
}

/** 故事 */
export interface Story {
  id: string
  name: string
  desc: string             // 一句话简介
  world: string            // 世界观
  userChar: string         // 用户角色设定
  tags: string[]
  color: 'purple' | 'pink' | 'blue' | 'gold' | 'green' | 'red'
  emoji: string
  cover?: string
  characters: Character[]
  openers: string[]        // 开场白预设
  model: string            // Ollama 模型名
  features: StoryFeatures  // 功能开关
  sample?: boolean         // 示例故事标记
}

export interface StoryFeatures {
  sceneImage: boolean      // AI 场景插图
  charAvatar: boolean      // AI 角色头像
  multiTurn: boolean       // 多轮对话记忆
  worldTrigger: boolean    // 世界观关键词触发
  narration: boolean       // 旁白模式
  options: boolean         // 选项分支
}

/** localStorage 根结构 */
export interface AppData {
  stories: Story[]
  sessions: Record<string, ChatSession[]>  // storyId -> sessions
  currentStoryId: string | null
  currentSessionId: string | null
  settings: AppSettings
}

export interface AppSettings {
  ollamaUrl: string
  comfyUrl: string
  comfyModel: string
}

/** 封面颜色映射 */
export const COVER_COLORS: Record<string, string> = {
  purple: 'linear-gradient(135deg,#7c3aed,#c084fc)',
  pink:   'linear-gradient(135deg,#ec4899,#f9a8d4)',
  blue:   'linear-gradient(135deg,#3b82f6,#60a5fa)',
  gold:   'linear-gradient(135deg,#f59e0b,#fbbf24)',
  green:  'linear-gradient(135deg,#10b981,#6ee7b7)',
  red:    'linear-gradient(135deg,#ef4444,#fca5a5)',
}
