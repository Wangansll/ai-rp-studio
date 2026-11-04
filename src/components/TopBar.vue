<script setup lang="ts">
import { useStore } from '../stores/main'

const store = useStore()
</script>

<template>
  <header class="topbar">
    <h1>📚 故事库</h1>
    <nav class="topbar-nav">
      <div :class="['nav-tab', { active: store.page === 'library' }]" @click="store.navigate('library')">
        📚 故事库
      </div>
      <div v-if="store.currentStory" :class="['nav-tab', { active: store.page === 'story' }]" @click="store.navigate('story')">
        📖 故事详情
      </div>
      <div v-if="store.page === 'chat'" class="nav-tab active">
        💬 对话
      </div>
    </nav>
    <div class="topbar-actions">
      <button class="btn btn-ghost btn-sm">⚙️ 设置</button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: sticky; top: 0; z-index: 50;
  background: rgba(10,10,14,.85); backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  padding: 12px 24px;
  display: flex; align-items: center; gap: 16px;
}
.topbar h1 {
  font-size: 18px; font-weight: 700;
  background: linear-gradient(135deg,var(--accent),var(--pink));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.topbar-nav { display: flex; gap: 4px; margin-left: 24px; }
.nav-tab {
  padding: 6px 14px; border-radius: 6px; font-size: 13px;
  color: var(--text2); cursor: pointer; font-weight: 600;
}
.nav-tab:hover { color: var(--text); background: var(--bg3); }
.nav-tab.active { color: var(--accent); background: rgba(192,132,252,.1); }
.topbar-actions { margin-left: auto; display: flex; gap: 8px; }
</style>
