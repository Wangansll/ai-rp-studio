<script setup lang="ts">
import { ref } from 'vue'
import { useStore } from '../stores/main'
import type { Story, Character } from '../types'
import { COVER_COLORS } from '../types'

const store = useStore()

const fieldModal = ref(false)
const fieldKey = ref<'world' | 'userChar'>('world')
const fieldValue = ref('')
const openerInput = ref('')

function openFieldEditor(key: 'world' | 'userChar') {
  if (!store.currentStory) return
  fieldKey.value = key
  fieldValue.value = store.currentStory[key] || ''
  fieldModal.value = true
}

function saveField() {
  if (!store.currentStory) return
  store.currentStory[fieldKey.value] = fieldValue.value
  fieldModal.value = false
  store.persist()
  store.toast('已保存')
}

function addOpener() {
  if (!store.currentStory || !openerInput.value.trim()) return
  store.addOpener(store.currentStory.id, openerInput.value.trim())
  openerInput.value = ''
}

// 暂时用这个简单的角色编辑，后面做完整的角色弹窗
function addCharacter() {
  if (!store.currentStory) return
  const name = prompt('角色名称')
  if (!name) return
  const desc = prompt('一句话描述（外貌/性格）') || ''
  const char: Character = {
    id: 'c-' + Date.now(),
    name,
    desc,
    appearance: desc,
    personality: '',
  }
  store.saveCharacter(store.currentStory.id, char)
}

function removeChar(charId: string) {
  if (!store.currentStory) return
  store.deleteCharacter(store.currentStory.id, charId)
}
</script>

<template>
  <div v-if="store.currentStory" class="story-page">
    <!-- 返回 -->
    <button class="btn btn-ghost btn-sm" style="margin-bottom:16px" @click="store.navigate('library')">
      ← 返回故事库
    </button>

    <!-- 头部卡片 -->
    <div class="story-page-header">
      <div class="story-page-cover" :style="{ background: COVER_COLORS[store.currentStory.color] }">
        <img v-if="store.currentStory.cover" :src="store.currentStory.cover" alt="">
        <div v-else>{{ store.currentStory.emoji || '📖' }}</div>
      </div>
      <div class="story-page-info">
        <h1>{{ store.currentStory.name }}</h1>
        <p>{{ store.currentStory.desc || '未设置简介' }}</p>
        <div class="story-page-actions">
          <button class="btn btn-gold btn-lg" @click="store.enterChat(store.currentStory!.id)">
            🎬 开始对话
          </button>
          <button class="btn btn-ghost" @click="store.enterChat(store.currentStory!.id)">
            💬 新建会话
          </button>
          <button class="btn btn-ghost" @click="openFieldEditor('world')">✎ 编辑</button>
        </div>
      </div>
    </div>

    <!-- 世界观 -->
    <div class="section">
      <div class="section-title">
        <span>🌍 世界观</span>
        <button class="btn btn-ghost btn-sm" @click="openFieldEditor('world')">✎ 编辑</button>
      </div>
      <div class="section-text" @click="openFieldEditor('world')">
        {{ store.currentStory.world || '点击设置世界观...' }}
      </div>
    </div>

    <!-- 用户角色 -->
    <div class="section">
      <div class="section-title">
        <span>👤 用户角色</span>
        <button class="btn btn-ghost btn-sm" @click="openFieldEditor('userChar')">✎ 编辑</button>
      </div>
      <div class="section-text" @click="openFieldEditor('userChar')">
        {{ store.currentStory.userChar || '点击设置用户角色...' }}
      </div>
    </div>

    <!-- 角色列表 -->
    <div class="section">
      <div class="section-title">
        <span>🎭 角色（{{ store.currentStory.characters.length }}）</span>
        <button class="btn btn-ghost btn-sm" @click="addCharacter">+ 添加</button>
      </div>
      <div v-if="store.currentStory.characters.length" class="char-list">
        <div v-for="ch in store.currentStory.characters" :key="ch.id" class="char-item">
          <div class="avatar-box" :style="{ background: '#333' }">{{ ch.name[0] }}</div>
          <div class="char-info">
            <div class="char-name">{{ ch.name }}</div>
            <div class="char-desc">{{ ch.desc || '' }}</div>
          </div>
          <button class="btn btn-ghost btn-sm" @click="removeChar(ch.id)">✕</button>
        </div>
      </div>
      <div v-else class="empty-hint">还没添加角色</div>
    </div>

    <!-- 开场白 -->
    <div class="section">
      <div class="section-title">
        <span>📜 开场白预设（{{ store.currentStory.openers.length }}）</span>
      </div>
      <div class="opener-list">
        <div
          v-for="(o, i) in store.currentStory.openers"
          :key="i"
          class="opener-item"
          @click="store.enterChat(store.currentStory!.id); /* TODO: use opener as first message */"
        >
          <div class="opener-num">{{ i + 1 }}</div>
          <div class="opener-text">{{ o.length > 120 ? o.substring(0, 120) + '...' : o }}</div>
          <div class="opener-actions">
            <button class="btn btn-ghost btn-sm" @click.stop="store.removeOpener(store.currentStory!.id, i)">✕</button>
          </div>
        </div>
      </div>
      <div v-if="!store.currentStory.openers.length" class="empty-hint">未设置开场白</div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <input
          v-model="openerInput"
          class="inline-input"
          placeholder="输入开场白后回车添加..."
          @keydown.enter="addOpener"
        >
        <button class="btn btn-primary btn-sm" @click="addOpener">+ 添加</button>
      </div>
    </div>

    <!-- 字段编辑弹窗 -->
    <div v-if="fieldModal" class="modal-overlay show" @click.self="fieldModal = false">
      <div class="modal" style="max-width:600px">
        <div class="modal-header">
          <span>{{ fieldKey === 'world' ? '🌍 编辑世界观' : '👤 编辑用户角色' }}</span>
          <button class="btn btn-ghost btn-sm" @click="fieldModal = false">✕</button>
        </div>
        <div class="modal-body">
          <textarea
            v-model="fieldValue"
            rows="10"
            style="width:100%;font-size:14px;line-height:1.7;resize:vertical"
          ></textarea>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="fieldModal = false">取消</button>
          <button class="btn btn-primary" @click="saveField">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.story-page { padding: 32px 24px; max-width: 900px; margin: 0 auto; }
.story-page-header { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 28px; }
.story-page-cover { width: 120px; height: 160px; border-radius: 12px; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 42px; }
.story-page-cover img { width: 100%; height: 100%; object-fit: cover; }
.story-page-info h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
.story-page-info p { color: var(--text2); font-size: 14px; line-height: 1.6; margin-bottom: 12px; }
.story-page-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.section { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 18px; }
.section-title { font-size: 14px; font-weight: 700; color: var(--accent); margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; }
.section-text { font-size: 13px; color: var(--text2); line-height: 1.7; white-space: pre-wrap; cursor: pointer; padding: 8px; border-radius: 8px; }
.section-text:hover { background: var(--bg3); }
.char-list { display: flex; flex-direction: column; gap: 8px; }
.char-item { display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--bg3); border-radius: 8px; }
.avatar-box { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: #fff; flex-shrink: 0; }
.char-info { flex: 1; }
.char-name { font-weight: 600; font-size: 14px; }
.char-desc { font-size: 12px; color: var(--text2); margin-top: 2px; }
.opener-list { display: flex; flex-direction: column; gap: 8px; }
.opener-item { padding: 12px 14px; background: var(--bg3); border-radius: 8px; display: flex; align-items: flex-start; gap: 10px; cursor: pointer; transition: all .15s; }
.opener-item:hover { background: var(--bg4); }
.opener-num { width: 24px; height: 24px; border-radius: 50%; background: var(--accent2); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
.opener-text { flex: 1; font-size: 12.5px; line-height: 1.6; white-space: pre-wrap; }
.opener-actions { flex-shrink: 0; display: flex; gap: 4px; }
.inline-input { flex: 1; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; color: var(--text); font-size: 13px; outline: none; font-family: inherit; }
.inline-input:focus { border-color: var(--accent2); }
.empty-hint { color: var(--text2); font-size: 13px; text-align: center; padding: 20px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 100; display: flex; justify-content: center; align-items: center; padding: 20px; backdrop-filter: blur(4px); }
.modal { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; width: 100%; display: flex; flex-direction: column; box-shadow: var(--shadow); }
.modal-header { padding: 16px 20px; border-bottom: 1px solid var(--border); font-weight: 700; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
.modal-body { padding: 20px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 12px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0; }
</style>
