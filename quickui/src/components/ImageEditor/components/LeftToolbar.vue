<template>
  <div class="left-toolbar" :class="{ collapsed }">
    <div class="toolbar-content">
      <div v-for="section in toolSections" :key="section.title" class="tool-section">
        <span class="section-title">{{ section.title }}</span>
        <button
          v-for="tool in section.tools"
          :key="tool.type"
          class="tool-btn"
          :class="{ active: currentTool === tool.type }"
          :title="`${tool.name}${tool.shortcut ? ` (${tool.shortcut})` : ''}`"
          @click="$emit('set-tool', tool.type)"
        >
          <SvgIcon :name="tool.icon" :size="20" />
          <span>{{ tool.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SvgIcon from '../../icons/SvgIcon.vue'
import { TOOL_SECTIONS } from '../constants'
import type { ToolType } from '../types'

defineProps<{
  currentTool: ToolType
  collapsed: boolean
}>()

defineEmits<{
  (e: 'set-tool', tool: ToolType): void
}>()

const toolSections = TOOL_SECTIONS
</script>

<style scoped lang="scss">
.left-toolbar {
  width: 72px;
  background: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  padding: 10px 6px;
  overflow-y: auto;
  overflow-x: hidden;
  flex-shrink: 0;
  transition: width 0.3s ease, padding 0.3s ease;

  // 自定义滚动条
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.1) transparent;

  &::-webkit-scrollbar {
    width: 4px;
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

  &.collapsed {
    width: 0;
    padding: 0;
    overflow: hidden;

    .toolbar-content {
      opacity: 0;
      visibility: hidden;
    }
  }
}

.toolbar-content {
  transition: opacity 0.2s ease, visibility 0.2s ease;
}

.tool-section {
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }
}

.section-title {
  display: block;
  font-size: 9px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  padding: 0 2px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tool-btn {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 7px 3px;
  margin-bottom: 3px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-secondary);

  &:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  &.active {
    background: rgba(99, 102, 241, 0.12);
    color: var(--accent-color);
  }

  span {
    font-size: 9px;
    line-height: 1.1;
    text-align: center;
    word-break: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

@media (max-width: 1200px) {
  .left-toolbar {
    width: 68px;
    padding: 8px 5px;
  }

  .section-title {
    font-size: 8px;
    margin-bottom: 5px;
  }

  .tool-btn {
    padding: 6px 2px;

    span {
      font-size: 8px;
    }
  }
}

@media (max-width: 992px) {
  .left-toolbar {
    width: 56px;
    padding: 6px 4px;
  }

  .section-title {
    font-size: 0;
    margin-bottom: 4px;
  }

  .tool-btn {
    padding: 6px 2px;
    gap: 2px;

    span {
      font-size: 0;
      display: none;
    }
  }
}

@media (max-width: 768px) {
  .left-toolbar {
    width: 48px;
    padding: 4px 2px;
  }

  .tool-section {
    margin-bottom: 8px;
    padding-bottom: 6px;
  }

  .tool-btn {
    padding: 5px 1px;

    svg {
      width: 18px;
      height: 18px;
    }
  }
}
</style>
