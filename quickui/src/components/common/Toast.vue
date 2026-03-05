<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="visible" class="toast-container" :class="[type, { 'fade-out': fadeOut }]">
        <div class="toast-content">
          <span class="toast-icon">{{ icon }}</span>
          <span class="toast-message">{{ message }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}>()

const emit = defineEmits<{
  close: []
}>()

const visible = ref(true)
const fadeOut = ref(false)

const icon = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ'
}[props.type || 'info']

let timer: number | null = null
let fadeTimer: number | null = null

onMounted(() => {
  const duration = props.duration || 3000
  // 在消失前 500ms 开始渐变
  timer = window.setTimeout(() => {
    fadeOut.value = true
    fadeTimer = window.setTimeout(() => {
      visible.value = false
      emit('close')
    }, 500)
  }, duration - 500)
})

onUnmounted(() => {
  if (timer) clearTimeout(timer)
  if (fadeTimer) clearTimeout(fadeTimer)
})
</script>

<style scoped lang="scss">
.toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  transition: opacity 0.5s ease, transform 0.5s ease;
  
  &.success {
    background: rgba(16, 124, 16, 0.95);
    color: white;
  }
  
  &.error {
    background: rgba(211, 47, 47, 0.95);
    color: white;
  }
  
  &.warning {
    background: rgba(237, 108, 2, 0.95);
    color: white;
  }
  
  &.info {
    background: rgba(0, 120, 212, 0.95);
    color: white;
  }

  &.fade-out {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.toast-icon {
  font-size: 16px;
  font-weight: bold;
}

.toast-enter-active {
  transition: all 0.3s ease;
}

.toast-leave-active {
  transition: all 0.5s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>
