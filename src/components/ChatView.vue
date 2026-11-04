<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { useStore } from '../stores/main'
import { chatStream } from '../services/ollama'
import { generateImage, getImageUrl } from '../services/comfyui'
import { translateToTags } from '../services/ollama'
import { uuid } from '../services/storage'
import type { ChatMessage, Character } from '../types'

const store = useStore()
const inputText = ref('')
const isStreaming = ref(false)
const isGenImg = ref(false)
const chatEl = ref<HTMLElement | null>(null)

// ====== 自动滚动 ======
watch(
  () => store.currentSession?.messages.length,
  () => nextTick(() => {
    if (chatEl.value) {
      chatEl.value.scrollTop = chatEl.value.scrollHeight
    }
  })
)

// ====== 构建 System Prompt ======
function buildSystemPrompt(): string {
  const s = store.currentStory
  if (!s) return '你是一个AI角色扮演助手。'
  const chars = s.characters.map(c =>
    `- ${c.name}：${[c.appearance, c.personality, c.desc].filter(Boolean).join('；')}`
  ).join('\n')
  return `你是以下故事中的角色。请严格按照角色设定进行对话。

故事：${s.name}
世界观：${s.world || '无'}
用户角色：${s.userChar || '默认'}

角色列表：
${chars || '无角色设定'}

要求：
1. 你是你选择的角色，以角色的口吻说话，不要以AI的身份
2. 你是本地运行的AI模型，不要提到任何公司信息
3. 对话用【角色名】标记说话者（例如【张三】你好）
4. 动作/神态用括号描述（例如（微笑）你好）
5. 旁白/场景描述不加标记`
}

// ====== 构建消息历史 ======
function buildMessages(): { role: string; content: string }[] {
  const msgs = store.currentSession?.messages || []
  return msgs
    .filter(m => m.role !== 'narrator')
    .map(m => ({ role: m.role, content: m.content }))
}

// ====== 发送消息 ======
async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isStreaming.value || !store.currentStory || !store.currentSession) return
  inputText.value = ''

  const storyId = store.currentStory.id
  const sessionId = store.currentSession.id
  const sid = store.currentSession!.id

  // 追加用户消息
  const userMsg: ChatMessage = {
    id: uuid(),
    role: 'user',
    content: text,
    timestamp: Date.now(),
  }
  store.appendMessage(storyId, sessionId, userMsg)

  // 创建 AI 消息占位
  const aiMsgId = uuid()
  const aiMsg: ChatMessage = {
    id: aiMsgId,
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
  }
  store.appendMessage(storyId, sessionId, aiMsg)

  // 流式请求
  isStreaming.value = true
  try {
    const sysPrompt = buildSystemPrompt()
    const msgs = buildMessages()
    // 去掉刚加的空 AI 消息
    msgs.pop()

    let fullContent = ''
    const onToken = (token: string) => {
      fullContent += token
      // 实时更新最后一条消息
      const msg = { ...aiMsg, content: fullContent }
      store.replaceLastMessage(storyId, sessionId, msg)
    }

    // 在实际流式前先加入空消息占位
    // chatStream 会调用 onToken
    // 但 replaceLastMessage 需要延迟一点让 DOM 更新
    // 这里直接做非流式请求简化（后续再改流式）
    await chatStream({
      ollamaUrl: store.settings.ollamaUrl,
      model: store.currentStory.model || 'dolphin-mistral:latest',
      systemPrompt: sysPrompt,
      messages: msgs,
      onToken,
    })

    // 完成
    const finalMsg: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: fullContent,
      timestamp: Date.now(),
    }
    store.replaceLastMessage(storyId, sessionId, finalMsg)
  } catch (e: any) {
    store.toast('对话失败：' + e.message, 'error')
    const errMsg: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '⚠️ 对话出错，请检查 Ollama 是否在运行',
      timestamp: Date.now(),
    }
    store.replaceLastMessage(storyId, sessionId, errMsg)
  } finally {
    isStreaming.value = false
  }
}

// ====== 重试 ======
async function regen() {
  if (!store.currentStory || !store.currentSession) return
  const msgs = store.currentSession.messages
  // 移除最后一个 AI 回复
  const lastAiIdx = msgs.map(m => m.role).lastIndexOf('assistant')
  if (lastAiIdx < 0) return
  msgs.splice(lastAiIdx, 1)
  store.persist()
  // 重新发送上一条用户消息
  const lastUserMsg = msgs.findLast(m => m.role === 'user')
  if (lastUserMsg) {
    inputText.value = lastUserMsg.content
    await sendMessage()
  }
}

// ====== 生图 ======
async function genSceneImg() {
  if (!store.currentStory || !store.currentSession || isGenImg.value) return
  isGenImg.value = true
  try {
    const storyName = store.currentStory.name || '场景'
    // 取最后几条消息作为 prompt
    const recentMsgs = store.currentSession.messages.slice(-4)
    const desc = recentMsgs.map(m => m.content).join(' ').substring(0, 200)
    const tags = await translateToTags(store.settings.ollamaUrl, `${storyName} ${desc}`)
    const filename = await generateImage({
      comfyUrl: store.settings.comfyUrl,
      model: store.settings.comfyModel,
      positive: tags || 'masterpiece,best quality',
      width: 512,
      height: 768,
    })
    const url = getImageUrl(store.settings.comfyUrl, filename)

    // 把图片追加为一条 narrator 消息
    const imgMsg: ChatMessage = {
      id: uuid(),
      role: 'narrator',
      content: '',
      timestamp: Date.now(),
      imageUrl: url,
    }
    store.appendMessage(store.currentStory.id, store.currentSession.id, imgMsg)
    store.toast('场景插图已生成')
  } catch (e: any) {
    store.toast('生图失败：' + e.message, 'error')
  } finally {
    isGenImg.value = false
  }
}

// ====== 消息渲染工具 ======
function isEmotionLine(line: string): boolean {
  return /^（.*）$/.test(line.trim()) || /^\(.*\)$/.test(line.trim())
}

function parseSegments(content: string): { name?: string; lines: { type: 'emotion' | 'dialogue' | 'action'; text: string }[] }[] {
  if (!content) return []
  const segments: { name?: string; lines: { type: 'emotion' | 'dialogue' | 'action'; text: string }[] }[] = []
  const lines = content.split('\n')
  let current: { name?: string; lines: { type: 'emotion' | 'dialogue' | 'action'; text: string }[] } | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const match = trimmed.match(/^【(.+?)】(.*)/)
    if (match) {
      if (current) segments.push(current)
      current = { name: match[1], lines: [] }
      const rest = match[2]
      if (isEmotionLine(rest)) {
        current.lines.push({ type: 'emotion', text: rest })
      } else if (rest) {
        current.lines.push({ type: 'dialogue', text: rest })
      }
    } else if (current) {
      if (isEmotionLine(trimmed)) {
        current.lines.push({ type: 'emotion', text: trimmed })
      } else {
        current.lines.push({ type: 'action', text: trimmed })
      }
    } else {
      if (!current) current = { lines: [] }
      if (isEmotionLine(trimmed)) {
        current.lines.push({ type: 'emotion', text: trimmed })
      } else {
        current.lines.push({ type: 'action', text: trimmed })
      }
      segments.push(current)
      current = null
    }
  }
  if (current) segments.push(current)
  return segments
}

function colorForName(name: string): string {
  const colors = ['#c084fc','#60a5fa','#f472b6','#fbbf24','#34d399','#f87171','#a78bfa','#fb923c']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function resolveChar(name: string): Character | undefined {
  return store.currentStory?.characters.find(c => c.name === name)
}
</script>

<template>
  <div v-if="store.currentStory && store.currentSession" class="chat-layout">
    <!-- 侧边栏：会话列表 -->
    <aside class="session-list">
      <div class="session-list-header">
        <h3>会话</h3>
        <button class="btn btn-ghost btn-sm" @click="store.enterChat(store.currentStory!.id)">+ 新建</button>
      </div>
      <div
        v-for="sess in (store.data.sessions[store.currentStory!.id] || [])"
        :key="sess.id"
        :class="['session-item', { active: sess.id === store.currentSession?.id }]"
        @click="store.switchSession(sess.id)"
      >
        <span class="session-item-name">{{ sess.name }}</span>
      </div>
    </aside>

    <!-- 对话主区域 -->
    <main class="chat-main">
      <!-- 头部 -->
      <div class="chat-header">
        <button class="btn btn-ghost btn-sm" @click="store.navigate('story')">← 返回</button>
        <div class="chat-header-info">
          <h2>{{ store.currentSession.name }}</h2>
          <p>{{ store.currentStory.name }}</p>
        </div>
        <div class="chat-header-actions">
          <button class="btn btn-ghost btn-sm" @click="regen">🔄 重试</button>
          <button class="btn btn-ghost btn-sm" @click="genSceneImg" :disabled="isGenImg">
            {{ isGenImg ? '⏳' : '🎨' }} 插图
          </button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div ref="chatEl" class="chat-messages">
        <!-- 空状态 -->
        <div v-if="!store.currentSession.messages.length" class="empty-chat">
          <div class="opener-card">
            <div style="font-size:48px;margin-bottom:12px">{{ store.currentStory.emoji || '📖' }}</div>
            <h3>{{ store.currentStory.name }}</h3>
            <p v-if="store.currentStory.desc">{{ store.currentStory.desc }}</p>
            <div v-if="store.currentStory.openers.length" style="margin-top:16px;display:flex;flex-direction:column;gap:8px;width:100%;max-width:400px">
              <div
                v-for="(o, i) in store.currentStory.openers"
                :key="i"
                class="opener-card-btn"
                @click="inputText = o; sendMessage()"
              >
                {{ o.substring(0, 80) }}{{ o.length > 80 ? '...' : '' }}
              </div>
            </div>
            <p style="margin-top:16px;color:var(--text3);font-size:12px">在下方输入框中开始对话</p>
          </div>
        </div>

        <!-- 消息渲染 -->
        <template v-for="msg in store.currentSession.messages" :key="msg.id">
          <!-- 图片消息 -->
          <div v-if="msg.imageUrl" class="msg-narr-only">
            <img :src="msg.imageUrl" class="scene-img" alt="场景插图">
          </div>

          <!-- 用户消息 -->
          <div v-else-if="msg.role === 'user'" class="msg user">
            <div class="msg-avatar" style="background:linear-gradient(135deg,#7c3aed,#a855f7)">你</div>
            <div class="msg-body">
              <div class="msg-content user-content">{{ msg.content }}</div>
            </div>
          </div>

          <!-- AI 消息 -->
          <div v-else-if="msg.role === 'assistant'">
            <template v-for="(seg, si) in parseSegments(msg.content)" :key="si">
              <!-- 有角色名 -->
              <div v-if="seg.name" class="msg char">
                <div class="msg-avatar" :style="{ background: colorForName(seg.name) }">
                  {{ seg.name[0] }}
                </div>
                <div class="msg-body">
                  <div class="msg-char-name" :style="{ color: colorForName(seg.name) }">{{ seg.name }}</div>
                  <div class="msg-content">
                    <div v-for="(line, li) in seg.lines" :key="li">
                      <div v-if="line.type === 'emotion'" class="emotion-line">{{ line.text }}</div>
                      <div v-else-if="line.type === 'dialogue'" class="dialogue-line">{{ line.text }}</div>
                      <div v-else class="action-line">{{ line.text }}</div>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 纯旁白 -->
              <div v-else class="msg-narr-only">
                <template v-for="(line, li) in seg.lines" :key="li">
                  <span v-if="line.type === 'emotion'" class="narr-emotion">{{ line.text }}</span>
                  <span v-else class="narr-text">{{ line.text }}</span>
                  <br v-if="li < seg.lines.length - 1">
                </template>
              </div>
            </template>
          </div>
        </template>

        <!-- 流式打字动画 -->
        <div v-if="isStreaming" class="typing">
          <span></span><span></span><span></span>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="chat-input-wrap">
        <textarea
          v-model="inputText"
          placeholder="输入消息..."
          :disabled="isStreaming"
          @keydown.enter.exact.prevent="sendMessage"
          rows="1"
        ></textarea>
        <button class="btn btn-primary" :disabled="isStreaming" @click="sendMessage">
          {{ isStreaming ? '...' : '发送' }}
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.chat-layout { display: grid; grid-template-columns: 220px 1fr; height: calc(100vh - 60px); }
.session-list { border-right: 1px solid var(--border); background: var(--bg2); overflow-y: auto; display: flex; flex-direction: column; }
.session-list-header { padding: 14px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
.session-list-header h3 { font-size: 13px; font-weight: 700; }
.session-item { padding: 10px 14px; margin: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 12px; border: 1px solid transparent; }
.session-item:hover { background: var(--bg3); }
.session-item.active { background: var(--bg3); border-color: var(--accent2); }
.chat-main { display: flex; flex-direction: column; min-width: 0; }
.chat-header { padding: 12px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.chat-header-info h2 { font-size: 15px; font-weight: 700; }
.chat-header-info p { font-size: 11px; color: var(--text2); margin-top: 2px; }
.chat-header-actions { margin-left: auto; display: flex; gap: 6px; }
.chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }

.empty-chat { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; }
.opener-card { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 40px; }
.opener-card h3 { font-size: 20px; margin-bottom: 8px; }
.opener-card p { color: var(--text2); font-size: 14px; max-width: 400px; line-height: 1.6; }
.opener-card-btn { padding: 10px 16px; background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; text-align: left; font-size: 13px; line-height: 1.5; cursor: pointer; transition: all .15s; color: var(--text); }
.opener-card-btn:hover { background: var(--bg4); border-color: var(--accent2); }

.msg { display: flex; gap: 10px; margin: 8px 0; align-items: flex-start; }
.msg.user { flex-direction: row-reverse; justify-content: flex-start; }
.msg.char { align-items: flex-start; }
.msg-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 15px; color: #fff; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,.25); }
.msg-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.msg-char-name { font-size: 12px; font-weight: 600; margin-bottom: 2px; }
.msg-content { padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.75; background: var(--bg3); border: 1px solid var(--border); }
.user-content { background: linear-gradient(135deg,#7c3aed,#a855f7); color: #fff; border: none; border-radius: 14px 14px 4px 14px; }

.emotion-line { color: rgba(200,200,220,.7); font-size: 13px; font-style: italic; line-height: 1.7; }
.dialogue-line { color: var(--text); font-size: 14px; line-height: 1.8; }
.action-line { color: var(--text2); font-size: 13px; font-style: italic; line-height: 1.7; }

.msg-narr-only { text-align: center; color: rgba(200,200,220,.7); font-size: 14px; line-height: 1.8; max-width: 90%; margin: 4px auto; }
.narr-emotion { font-style: italic; color: rgba(180,170,200,.6); }
.narr-text { color: rgba(200,200,220,.7); }
.scene-img { max-width: 400px; border-radius: 12px; border: 1px solid var(--border); animation: fadeIn .5s ease; }

.typing { padding: 10px 14px; display: flex; gap: 4px; align-self: flex-start; }
.typing span { width: 6px; height: 6px; border-radius: 50%; background: var(--text2); animation: bounce 1.4s infinite; }
.typing span:nth-child(2) { animation-delay: .2s; }
.typing span:nth-child(3) { animation-delay: .4s; }
@keyframes bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

.chat-input-wrap { padding: 12px 20px; border-top: 1px solid var(--border); display: flex; gap: 8px; align-items: flex-end; flex-shrink: 0; }
.chat-input-wrap textarea { flex: 1; background: var(--bg3); border: 1px solid var(--border); border-radius: 12px; padding: 10px 14px; color: var(--text); font-size: 13px; resize: none; min-height: 40px; max-height: 120px; outline: none; font-family: inherit; }
.chat-input-wrap textarea:focus { border-color: var(--accent2); }
</style>
