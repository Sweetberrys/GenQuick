<template>
  <div class="window-controls">
    <button 
      v-if="showMinimize"
      class="btn-control" 
      @click="minimizeWindow" 
      title="最小化"
      type="button"
    >
      <SvgIcon name="minimize" :size="14" />
    </button>
    <button 
      v-if="showMaximize"
      class="btn-control" 
      @click="toggleMaximize"
      :title="isMaximized ? '还原' : '最大化'"
      type="button"
    >
      <SvgIcon :name="isMaximized ? 'restore' : 'maximize'" :size="14" />
    </button>
    <button 
      class="btn-close" 
      @click="handleClose"
      title="关闭"
      type="button"
    >
      <SvgIcon name="close" :size="14" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import SvgIcon from '@/components/icons/SvgIcon.vue'

withDefaults(defineProps<{
  showMinimize?: boolean
  showMaximize?: boolean
}>(), {
  showMinimize: true,
  showMaximize: true
})

const emit = defineEmits<{
  close: []
}>()

const isMaximized = ref(false)

// 最小化窗口到任务栏
const minimizeWindow = async () => {
  try {
    const window = getCurrentWindow()
    await window.minimize()
  } catch (error) {
    console.error('最小化失败:', error)
  }
}

// 切换最大化/还原
const toggleMaximize = async () => {
  try {
    const window = getCurrentWindow()
    const maximized = await window.isMaximized()
    
    if (maximized) {
      await window.unmaximize()
      isMaximized.value = false
    } else {
      await window.maximize()
      isMaximized.value = true
    }
  } catch (error) {
    console.error('切换最大化失败:', error)
  }
}

// 关闭窗口
const handleClose = async () => {
  // 先触发 close 事件，让父组件处理
  emit('close')
}

onMounted(async () => {
  try {
    const window = getCurrentWindow()
    isMaximized.value = await window.isMaximized()
  } catch (error) {
    console.error('获取窗口状态失败:', error)
  }
})
</script>

<style scoped>
.window-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  -webkit-app-region: no-drag;
}

.btn-control,
.btn-close {
  padding: 6px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  width: 28px;
  height: 28px;
  user-select: none;
  -webkit-user-select: none;
}

.btn-control:active,
.btn-close:active {
  transform: scale(0.95);
}

.btn-control:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-close:hover {
  background: #ef4444;
  color: white;
}
</style>
