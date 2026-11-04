<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Story } from '../types'
import { COVER_COLORS } from '../types'
import { uuid } from '../services/storage'

const props = defineProps<{ story: Story }>()
const emit = defineEmits<{ save: [story: Story]; close: [] }>()

const form = ref<Story>(JSON.parse(JSON.stringify(props.story)))
const isNew = computed(() => !props.story.id || !props.story.name)

function submit() {
  if (!form.value.name.trim()) return
  if (!form.value.id) form.value.id = uuid()
  emit('save', { ...form.value })
}

function addOpener() {
  const t = prompt('输入开场白')
  if (t) form.value.openers.push(t)
}

function removeOpener(i: number) {
  form.value.openers.splice(i, 1)
}
</script>

<template>
  <div class="modal-overlay show" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <span>{{ isNew ? '新建故事' : '编辑故事' }}</span>
        <button class="btn btn-ghost btn-sm" @click="emit('close')">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>故事标题 *</label>
          <input v-model="form.name" placeholder="给故事起个名字">
        </div>
        <div class="form-group">
          <label>一句话简介</label>
          <input v-model="form.desc" placeholder="简短的介绍">
        </div>
        <div class="form-group">
          <label>详细世界观</label>
          <textarea v-model="form.world" rows="5" placeholder="构筑世界的设定、背景、法则..."></textarea>
        </div>
        <div class="form-group">
          <label>用户角色设定</label>
          <textarea v-model="form.userChar" rows="3" placeholder="你在故事中的身份..."></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>封面颜色</label>
            <select v-model="form.color">
              <option value="purple">紫</option><option value="pink">粉</option>
              <option value="blue">蓝</option><option value="gold">金</option>
              <option value="green">绿</option><option value="red">红</option>
            </select>
          </div>
          <div class="form-group">
            <label>封面 emoji</label>
            <input v-model="form.emoji" maxlength="2" placeholder="📖">
          </div>
        </div>
        <div class="form-group">
          <label>标签（逗号分隔）</label>
          <input v-model="form.tagsStr" placeholder="奇幻, 冒险, NSFW" @change="form.tags = form.tagsStr.split(',').map(t => t.trim()).filter(Boolean)">
        </div>
        <div class="form-group">
          <label>开场白预设（每行一段）</label>
          <div class="opener-list">
            <div v-for="(o, i) in form.openers" :key="i" class="opener-item">
              <div class="opener-num">{{ i + 1 }}</div>
              <div class="opener-text">{{ o }}</div>
              <div class="opener-actions">
                <button class="btn btn-ghost btn-sm" @click="removeOpener(i)">✕</button>
              </div>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm" style="margin-top:8px" @click="addOpener">+ 添加开场白</button>
        </div>
        <div class="form-group">
          <label>主对话模型</label>
          <select v-model="form.model">
            <option value="dolphin-mistral:latest">dolphin-mistral (无审查·推荐)</option>
            <option value="qwen2.5:7b-ctx32k">qwen2.5:7b (中文好)</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="emit('close')">取消</button>
        <button class="btn btn-primary" @click="submit">保存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 100; display: flex; justify-content: center; align-items: center; padding: 20px; backdrop-filter: blur(4px); }
.modal { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; width: 100%; max-width: 560px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: var(--shadow); }
.modal-header { padding: 16px 20px; border-bottom: 1px solid var(--border); font-weight: 700; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
.modal-body { padding: 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 14px; }
.modal-footer { padding: 12px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text2); }
.form-group input, .form-group textarea, .form-group select {
  background: var(--bg3); border: 1px solid var(--border); border-radius: 8px;
  padding: 8px 12px; color: var(--text); font-size: 13px; outline: none; font-family: inherit;
}
.form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: var(--accent2); }
.form-group textarea { resize: vertical; min-height: 60px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.opener-list { display: flex; flex-direction: column; gap: 6px; }
.opener-item { padding: 8px 12px; background: var(--bg3); border-radius: 8px; display: flex; align-items: flex-start; gap: 8px; font-size: 12px; }
.opener-num { width: 20px; height: 20px; border-radius: 50%; background: var(--accent2); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0; }
.opener-text { flex: 1; line-height: 1.5; white-space: pre-wrap; }
.opener-actions { flex-shrink: 0; }
</style>
