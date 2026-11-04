<script setup lang="ts">
import { useStore } from './stores/main'
import TopBar from './components/TopBar.vue'
import Toast from './components/Toast.vue'
import Library from './components/Library.vue'
import StoryDetail from './components/StoryDetail.vue'
import ChatView from './components/ChatView.vue'

const store = useStore()
</script>

<template>
  <TopBar />
  <Toast v-if="store.toastMsg" :msg="store.toastMsg" :type="store.toastType" />
  <Library v-if="store.page === 'library'" />
  <StoryDetail v-else-if="store.page === 'story'" />
  <ChatView v-else-if="store.page === 'chat'" />
</template>

<style>
/* 全局 CSS 变量 — 原项目暗色主题 */
:root {
  --bg: #0a0a0e;
  --bg2: #14141a;
  --bg3: #1e1e26;
  --bg4: #262630;
  --border: #2a2a35;
  --text: #d4d4dc;
  --text2: #8b8b9e;
  --text3: #5a5a6e;
  --accent: #c084fc;
  --accent2: #7c3aed;
  --pink: #f472b6;
  --danger: #f87171;
  --gold: #fbbf24;
  --shadow: 0 8px 30px rgba(0,0,0,.4);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  overflow-x: hidden;
}

::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #3a3a4a; border-radius: 4px; }

button { font-family: inherit; cursor: pointer; }
input, textarea, select { font-family: inherit; }

/* 通用按钮样式 */
.btn {
  padding: 7px 16px;
  border-radius: 8px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  transition: all .15s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg3);
  color: var(--text);
}
.btn:hover { background: var(--bg4); transform: translateY(-1px); }
.btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }
.btn-primary {
  background: linear-gradient(135deg, var(--accent2), var(--accent));
  color: #fff;
  box-shadow: 0 2px 12px rgba(124,58,237,.3);
}
.btn-gold {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  color: #000;
  font-weight: 700;
}
.btn-danger {
  background: transparent;
  color: var(--danger);
  border: 1px solid var(--danger);
}
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
}
.btn-ghost:hover { border-color: var(--accent); }
.btn-sm { padding: 4px 10px; font-size: 11px; }
.btn-lg { padding: 10px 20px; font-size: 14px; }
</style>
