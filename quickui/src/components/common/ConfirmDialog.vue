<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="confirm-overlay" @click.self="handleCancel">
        <div class="confirm-dialog">
          <div class="confirm-header">
            <span class="confirm-icon">{{ icon }}</span>
            <h3>{{ title }}</h3>
          </div>
          <div class="confirm-body">
            <p>{{ message }}</p>
          </div>
          <div class="confirm-footer">
            <button class="btn secondary" @click="handleCancel">{{ cancelText }}</button>
            <button class="btn primary" :class="type" @click="handleConfirm">{{ confirmText }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'primary'
}>(), {
  title: '确认操作',
  confirmText: '确定',
  cancelText: '取消',
  type: 'primary'
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const visible = ref(true)

const icon = props.type === 'danger' ? '⚠️' : 'ℹ️'

function handleConfirm() {
  visible.value = false
  emit('confirm')
}

function handleCancel() {
  visible.value = false
  emit('cancel')
}
</script>

<style scoped lang="scss">
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.confirm-dialog {
  background: white;
  border-radius: 12px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.confirm-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 12px;
  
  .confirm-icon {
    font-size: 24px;
  }
  
  h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
  }
}

.confirm-body {
  padding: 20px 24px;
  
  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: #333;
  }
}

.confirm-footer {
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  
  &.secondary {
    background: #e5e5e5;
    color: #333;
    
    &:hover {
      background: #d5d5d5;
    }
  }
  
  &.primary {
    background: #0078d4;
    color: white;
    
    &:hover {
      background: #106ebe;
    }
    
    &.danger {
      background: #d32f2f;
      
      &:hover {
        background: #b71c1c;
      }
    }
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
  
  .confirm-dialog {
    transition: transform 0.3s ease;
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  
  .confirm-dialog {
    transform: scale(0.9);
  }
}
</style>
