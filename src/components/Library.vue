<script setup lang="ts">
import { ref } from 'vue'
import { useStore } from '../stores/main'
import type { Story } from '../types'
import { COVER_COLORS } from '../types'
import StoryModal from './StoryModal.vue'

const store = useStore()
const showModal = ref(false)
const editingStory = ref<Story | null>(null)
const editingId = ref<string | null>(null)

function openCreate() {
  editingId.value = null
  editingStory.value = store.createStory()
  editingStory.value.name = ''
  showModal.value = true
}

function openEdit(story: Story) {
  editingId.value = story.id
  editingStory.value = JSON.parse(JSON.stringify(story)) // 深拷贝
  showModal.value = true
}

function onSaved(story: Story) {
  store.saveStory(story)
  showModal.value = false
}

function onClosed() {
  showModal.value = false
}

function onDelete(storyId: string) {
  if (confirm('删除这个故事？')) {
    store.deleteStory(storyId)
  }
}

function onEnter(storyId: string) {
  store.enterStory(storyId)
}
</script>

<template>
  <div class="library">
    <div class="library-header">
      <div>
        <h2>{{ store.stories.length ? '我的故事' : '开始创作' }}</h2>
        <p>{{ store.stories.length ? `共 ${store.stories.length} 个故事` : '创建第一个故事' }}</p>
      </div>
      <button class="btn btn-primary" @click="openCreate">+ 新建故事</button>
    </div>

    <div class="story-grid">
      <div
        v-for="st in store.stories" :key="st.id"
        class="story-card"
        @click="onEnter(st.id)"
      >
        <div v-if="st.sample" class="sample-badge">示例</div>
        <div class="story-cover" :style="{ background: COVER_COLORS[st.color] }">
          <img v-if="st.cover" :src="st.cover" alt="">
          <div v-else class="story-cover-empty">{{ st.emoji || '📖' }}</div>
          <div class="story-actions">
            <button @click.stop="openEdit(st)">✎</button>
            <button @click.stop="onDelete(st.id)">✕</button>
          </div>
        </div>
        <div class="story-meta">
          <h3>{{ st.name || '未命名' }}</h3>
          <p>{{ st.desc || '未设置简介' }}</p>
          <div class="story-tags">
            <span v-for="tag in (st.tags || []).slice(0, 4)" :key="tag" class="story-tag">{{ tag }}</span>
          </div>
        </div>
      </div>

      <div class="story-card add-card" @click="openCreate">
        <div style="font-size:36px">+</div>
        <div>新建故事</div>
      </div>
    </div>

    <StoryModal
      v-if="showModal"
      :story="editingStory!"
      @save="onSaved"
      @close="onClosed"
    />
  </div>
</template>

<style scoped>
.library { padding: 32px 24px; max-width: 1400px; margin: 0 auto; }
.library-header { margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
.story-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; margin-top: 20px; }
.story-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; cursor: pointer; transition: all .2s; position: relative; }
.story-card:hover { border-color: var(--accent2); transform: translateY(-3px); box-shadow: var(--shadow); }
.story-cover { height: 140px; display: flex; align-items: center; justify-content: center; font-size: 48px; position: relative; overflow: hidden; }
.story-cover img { width: 100%; height: 100%; object-fit: cover; }
.story-cover-empty { font-size: 14px; color: var(--text3); font-weight: 600; }
.story-meta { padding: 14px; }
.story-meta h3 { font-size: 15px; font-weight: 700; margin-bottom: 6px; }
.story-meta p { font-size: 12px; color: var(--text2); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 36px; }
.story-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.story-tag { padding: 2px 8px; background: var(--bg3); border-radius: 4px; font-size: 10px; color: var(--text2); }
.story-actions { position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; opacity: 0; transition: opacity .2s; }
.story-card:hover .story-actions { opacity: 1; }
.story-actions button { background: rgba(0,0,0,.6); border: 1px solid rgba(255,255,255,.1); width: 30px; height: 30px; border-radius: 6px; color: #fff; font-size: 12px; cursor: pointer; }
.add-card { background: transparent; border: 2px dashed var(--border); display: flex; align-items: center; justify-content: center; min-height: 280px; font-size: 14px; color: var(--text2); font-weight: 600; flex-direction: column; gap: 10px; }
.add-card:hover { border-color: var(--accent); color: var(--accent); }
.sample-badge { position: absolute; top: 8px; left: 8px; background: linear-gradient(135deg,#f59e0b,#fbbf24); color: #000; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; z-index: 1; }
</style>
