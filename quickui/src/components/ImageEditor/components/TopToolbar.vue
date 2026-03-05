<template>
  <div class="top-toolbar" data-tauri-drag-region>
    <!-- 左侧按钮组 -->
    <div class="toolbar-group">
      <button class="tool-btn" data-tooltip="折叠侧栏" @click="$emit('toggle-sidebar')">
        <svg viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
      </button>
    </div>

    <!-- 属性设置组 -->
    <div class="toolbar-group properties-group">
      <!-- 描边颜色 -->
      <div class="property-item">
        <label>描边</label>
        <input type="color" :value="settings.strokeColor" @input="updateSetting('strokeColor', ($event.target as HTMLInputElement).value)" />
        <input type="text" class="color-text-input" :value="settings.strokeColor" @change="updateSetting('strokeColor', ($event.target as HTMLInputElement).value)" />
      </div>
      <!-- 填充颜色 -->
      <div class="property-item">
        <label>填充</label>
        <input type="color" :value="settings.fillColor" @input="updateSetting('fillColor', ($event.target as HTMLInputElement).value)" />
        <input type="text" class="color-text-input" :value="settings.fillColor" @change="updateSetting('fillColor', ($event.target as HTMLInputElement).value)" />
      </div>
      <!-- 粗细 -->
      <div class="property-item">
        <label>粗细</label>
        <input type="range" class="range-input" min="1" max="50" :value="settings.strokeWidth" @input="updateSetting('strokeWidth', Number(($event.target as HTMLInputElement).value))" />
        <span class="range-value">{{ settings.strokeWidth }}</span>
      </div>
      <!-- 圆角（矩形工具时显示） -->
      <div v-if="showBorderRadius" class="property-item">
        <label>圆角</label>
        <input type="range" class="range-input" min="0" max="50" :value="settings.borderRadius" @input="updateSetting('borderRadius', Number(($event.target as HTMLInputElement).value))" />
        <span class="range-value">{{ settings.borderRadius }}</span>
      </div>
      <!-- 多边形角数 -->
      <div v-if="currentTool === 'polygon'" class="property-item">
        <label>角数</label>
        <input type="number" class="number-input" min="3" max="20" :value="settings.polygonSides" @change="updateSetting('polygonSides', Number(($event.target as HTMLInputElement).value))" />
      </div>
      <!-- 箭头设置 -->
      <template v-if="currentTool === 'arrow'">
        <div class="property-item">
          <label>方向</label>
          <select class="select-input" :value="settings.arrowDirection" @change="updateSetting('arrowDirection', ($event.target as HTMLSelectElement).value)">
            <option value="single">单向</option>
            <option value="double">双向</option>
          </select>
        </div>
        <div class="property-item">
          <label>头部</label>
          <select class="select-input" :value="settings.arrowHeadType" @change="updateSetting('arrowHeadType', ($event.target as HTMLSelectElement).value)">
            <option value="triangle">三角形</option>
            <option value="diamond">菱形</option>
            <option value="circle">圆形</option>
            <option value="open">开放</option>
          </select>
        </div>
      </template>
      <!-- 线条样式 -->
      <div class="property-item">
        <label>样式</label>
        <select class="select-input" :value="settings.strokeStyle" @change="updateSetting('strokeStyle', ($event.target as HTMLSelectElement).value)">
          <option value="solid">实线</option>
          <option value="dashed">虚线</option>
          <option value="dotted">点线</option>
        </select>
      </div>
      
      <!-- 分隔线 -->
      <div class="toolbar-divider"></div>
      
      <!-- 操作按钮组 -->
      <div class="action-buttons">
        <button class="action-btn" title="复制图片到剪贴板" @click="$emit('copy-image')">
          <SvgIcon name="copy" :size="16" />
          <span>复制</span>
        </button>
        <!-- <button class="action-btn" title="替换选中内容" @click="$emit('replace-selection')">
          <SvgIcon name="replace" :size="16" />
          <span>替换</span>
        </button>
        <button class="action-btn" title="前置插入" @click="$emit('insert-before')">
          <SvgIcon name="insert-before" :size="16" />
          <span>前插</span>
        </button>
        <button class="action-btn" title="后置插入" @click="$emit('insert-after')">
          <SvgIcon name="insert-after" :size="16" />
          <span>后插</span>
        </button> -->
      </div>
    </div>

    <!-- 右侧：关闭按钮 -->
    <div class="toolbar-right">
      <div class="window-controls">
        <button class="window-btn close-btn" title="关闭" @click="$emit('close')">
          <SvgIcon name="close" :size="12" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SvgIcon from '@/components/icons/SvgIcon.vue'
import type { ToolType, EditorSettings } from '../types'

const props = defineProps<{
  currentTool: ToolType
  settings: EditorSettings
}>()

const emit = defineEmits<{
  (e: 'toggle-sidebar'): void
  (e: 'update-settings', settings: Partial<EditorSettings>): void
  (e: 'close'): void
  (e: 'copy-image'): void
  (e: 'replace-selection'): void
  (e: 'insert-before'): void
  (e: 'insert-after'): void
}>()

const showBorderRadius = computed(() => props.currentTool === 'rect')

function updateSetting(key: keyof EditorSettings, value: any) {
  emit('update-settings', { [key]: value })
}
</script>

<style scoped lang="scss">
.top-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  gap: 12px;
  z-index: 100;
  min-height: 56px;
  max-height: 80px;
  overflow-x: auto;
  overflow-y: hidden;
  flex-shrink: 0;
  border-radius: 12px 12px 0 0;

  // 隐藏滚动条但保留功能
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 2px;

    &:hover {
      background: rgba(0, 0, 0, 0.2);
    }
  }
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--border-color);
  margin: 0 4px;
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-secondary);

  svg {
    width: 18px;
    height: 18px;
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

  &.small {
    width: 28px;
    height: 28px;
    svg {
      width: 16px;
      height: 16px;
    }
  }
}

.properties-group {
  display: flex;
  gap: 12px;
  padding: 0 12px;
  border-left: 1px solid var(--border-color);
  border-right: 1px solid var(--border-color);
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.property-item {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;

  label {
    font-size: 11px;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  input[type='color'] {
    width: 24px;
    height: 24px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
    padding: 1px;
    flex-shrink: 0;
  }
}

.color-text-input {
  width: 60px;
  padding: 3px 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 10px;
  font-family: monospace;
  background: var(--bg-primary);
  flex-shrink: 0;

  &:focus {
    outline: none;
    border-color: var(--accent-color);
  }
}

.range-input {
  width: 70px;
  height: 4px;
  border-radius: 2px;
  background: var(--bg-tertiary);
  appearance: none;
  cursor: pointer;
  flex-shrink: 0;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent-color);
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }
}

.range-value {
  font-size: 10px;
  color: var(--text-secondary);
  min-width: 20px;
  text-align: right;
}

.select-input {
  padding: 3px 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 11px;
  background: var(--bg-primary);
  cursor: pointer;
  flex-shrink: 0;
}

.number-input {
  width: 45px;
  padding: 3px 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 11px;
  background: var(--bg-primary);
  text-align: center;
  flex-shrink: 0;

  &:focus {
    outline: none;
    border-color: var(--accent-color);
  }
}

.zoom-group {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-left: 1px solid #e1e5eb;
}

.zoom-slider {
  width: 100px;
  height: 4px;
  border-radius: 2px;
  background: #e1e5eb;
  appearance: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #4a90d9;
    cursor: pointer;
  }
}

.zoom-value {
  font-size: 12px;
  color: #6c757d;
  min-width: 40px;
}

.toolbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.window-controls {
  display: flex;
  align-items: center;
  gap: 2px;
}

.window-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--text-secondary);

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  &.close-btn:hover {
    background: #e81123;
    color: white;
  }

  &:active {
    transform: scale(0.95);
  }
}

.action-buttons {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-secondary);
  font-size: 11px;
  white-space: nowrap;

  &:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border-color: var(--accent-color);
  }

  &:active {
    transform: scale(0.98);
  }
}

@media (max-width: 1200px) {
  .top-toolbar {
    padding: 6px 10px;
    gap: 10px;
  }

  .properties-group {
    gap: 10px;
    padding: 0 10px;
  }

  .color-text-input {
    width: 50px;
  }
}

@media (max-width: 992px) {
  .top-toolbar {
    padding: 6px 8px;
    gap: 8px;
  }

  .properties-group {
    gap: 8px;
    padding: 0 8px;
  }

  .color-text-input {
    display: none;
  }

  .range-input {
    width: 60px;
  }

  .select-input {
    font-size: 10px;
    padding: 2px 4px;
  }
}

@media (max-width: 768px) {
  .top-toolbar {
    padding: 4px 6px;
    min-height: 48px;
    max-height: 64px;
  }

  .toolbar-group {
    gap: 4px;
  }

  .properties-group {
    gap: 6px;
    padding: 0 6px;
  }

  .range-value,
  .section-title {
    display: none;
  }

  .tool-btn svg {
    width: 16px;
    height: 16px;
  }
}
</style>
