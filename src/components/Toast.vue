<script setup lang="ts">
defineProps<{
  msg: string
  type: 'success' | 'error'
}>()
</script>

<template>
  <div :class="['toast-item', type]">{{ msg }}</div>
</template>

<style scoped>
.toast-item {
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 8px 30px rgba(0,0,0,.4);
  animation: slideIn .3s ease;
  margin-bottom: 8px;
}
.toast-item.success { background: rgba(52,211,153,.9); color: #000; }
.toast-item.error { background: rgba(248,113,113,.9); color: #fff; }
@keyframes slideIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
</style>
