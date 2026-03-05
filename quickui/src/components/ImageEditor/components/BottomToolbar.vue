<template>
  <div class="bottom-toolbar">
    <!-- 左侧：撤销/重做/删除 -->
    <div class="toolbar-group">
      <button class="tool-btn" :disabled="!canUndo" data-tooltip="撤销 (Ctrl+Z)" @click="$emit('undo')">
        <svg viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>
      </button>
      <button class="tool-btn" :disabled="!canRedo" data-tooltip="重做 (Ctrl+Y)" @click="$emit('redo')">
        <svg viewBox="0 0 24 24"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/></svg>
      </button>
      <div class="toolbar-divider"></div>
      <button class="tool-btn" :disabled="!hasObjects" data-tooltip="删除 (Delete)" @click="$emit('delete')">
        <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
      </button>
    </div>

    <!-- 中间：当前工具 -->
    <div class="toolbar-group center-group">
      <span class="status-label">当前工具:</span>
      <span class="status-value">{{ toolName }}</span>
    </div>

    <!-- 右侧：坐标 + 缩放 -->
    <div class="toolbar-group">
      <span class="status-label">X:</span>
      <span class="status-value">{{ mousePos.x }}</span>
      <span class="status-label">Y:</span>
      <span class="status-value">{{ mousePos.y }}</span>
      <div class="toolbar-divider"></div>
      <button class="tool-btn" data-tooltip="缩小" @click="$emit('zoom-out')">
        <svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>
      </button>
      <input type="range" class="zoom-slider" min="10" max="500" :value="Math.round(zoom * 100)" @input="$emit('set-zoom', Number(($event.target as HTMLInputElement).value) / 100)" />
      <button class="tool-btn" data-tooltip="放大" @click="$emit('zoom-in')">
        <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
      </button>
      <span class="zoom-value">{{ Math.round(zoom * 100) }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TOOL_NAMES } from '../constants'
import type { ToolType } from '../types'

const props = defineProps<{
  currentTool: ToolType
  canUndo: boolean
  canRedo: boolean
  hasObjects: boolean
  mousePos: { x: number; y: number }
  zoom: number
}>()

defineEmits<{
  (e: 'undo'): void
  (e: 'redo'): void
  (e: 'delete'): void
  (e: 'zoom-in'): void
  (e: 'zoom-out'): void
  (e: 'set-zoom', zoom: number): void
}>()

const toolName = computed(() => TOOL_NAMES[props.currentTool] || props.currentTool)
</script>

<style scoped lang="scss">
.bottom-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-top: 1px solid var(--border-color);
  height: 40px;
  z-index: 100;
  flex-shrink: 0;
  position: relative;
  border-radius: 0 0 12px 12px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.center-group {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--border-color);
  margin: 0 4px;
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-secondary);

  svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  &:hover:not(:disabled) {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.status-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.status-value {
  font-size: 12px;
  color: var(--text-primary);
  min-width: 24px;
}

.zoom-slider {
  width: 80px;
  height: 4px;
  border-radius: 2px;
  background: var(--bg-tertiary);
  appearance: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent-color);
    cursor: pointer;
  }
}

.zoom-value {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 36px;
  text-align: right;
}

// 响应式设计
@media (max-width: 1200px) {
  .bottom-toolbar {
    padding: 6px 12px;
  }

  .zoom-slider {
    width: 70px;
  }
}

@media (max-width: 992px) {
  .bottom-toolbar {
    padding: 6px 10px;
  }

  .toolbar-group {
    gap: 4px;
  }

  .status-label {
    font-size: 11px;
  }

  .status-value {
    font-size: 11px;
    min-width: 20px;
  }

  .zoom-slider {
    width: 60px;
  }

  .zoom-value {
    font-size: 11px;
    min-width: 32px;
  }
}

@media (max-width: 768px) {
  .bottom-toolbar {
    padding: 4px 8px;
    height: 36px;
  }

  .tool-btn {
    width: 24px;
    height: 24px;

    svg {
      width: 14px;
      height: 14px;
    }
  }

  .center-group {
    display: none;
  }

  .zoom-slider {
    width: 50px;
  }
}
</style>
