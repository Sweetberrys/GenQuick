<template>
  <div class="panel prompts-panel">
    <div class="panel-header">
      <div>
        <h2>提示词管理</h2>
        <p class="desc">管理 AI 提示词模板</p>
      </div>
    </div>
    
    <!-- Tab 栏 -->
    <div class="prompts-tabs">
      <button 
        class="prompts-tab" 
        :class="{ active: activeTab === 'builtin' }"
        @click="activeTab = 'builtin'"
      >
        内置提示词
      </button>
      <button 
        class="prompts-tab"
        :class="{ active: activeTab === 'custom' }"
        @click="activeTab = 'custom'"
      >
        自定义提示词
      </button>
    </div>

    <!-- 内置提示词 -->
    <div 
      v-if="activeTab === 'builtin'" 
      class="prompts-section"
      @dragover.prevent
      @dragenter.prevent
      @drop.prevent
    >
      <!-- 关键：在列表容器上也监听 dragover 并 prevent -->
      <div 
        class="prompts-list builtin-list"
        @dragover.prevent
        @dragenter.prevent
      >
        <div 
          v-for="(prompt, index) in localBuiltinPrompts" 
          :key="prompt.id" 
          class="prompt-item builtin"
          :class="{ 
            'dragging': dragIndex === index,
            'drag-over-top': dragOverIndex === index && dragDirection === 'top',
            'drag-over-bottom': dragOverIndex === index && dragDirection === 'bottom'
          }"
          draggable="true"
          @dragstart="handleDragStart($event, index)"
          @dragenter.prevent="handleDragEnter($event, index)"
          @dragover.prevent="handleDragOver($event, index)"
          @dragleave="handleDragLeave($event)"
          @drop.prevent="handleDrop($event, index)"
          @dragend="handleDragEnd"
        >
          <div class="drag-handle">
            <SvgIcon name="grip" :size="16" />
          </div>
          <SvgIcon v-if="isSvgIconName(prompt.icon)" :name="prompt.icon" :size="20" class="icon-svg" />
          <span v-else class="icon">{{ prompt.icon }}</span>
          <div class="info">
            <div class="name">{{ prompt.name }}</div>
            <div class="preview">{{ prompt.prompt.substring(0, 50) }}...</div>
          </div>
          <span class="badge">内置</span>
        </div>
      </div>
    </div>

    <!-- 自定义提示词管理界面 -->
    <div v-else class="custom-prompts-container">
      <CustomPromptsManager />
    </div>
  </div>
</template>

<script setup lang="ts">
import '@/styles/settings-prompts.css'
import { ref, watch, onMounted } from 'vue'
import { usePromptsStore } from '@/stores/prompts'
import { useToast } from '@/composables/useToast'
import SvgIcon from '@/components/icons/SvgIcon.vue'
import CustomPromptsManager from './CustomPromptsManager.vue'
import type { Prompt } from '@/types'

const promptsStore = usePromptsStore()
const toast = useToast()
const activeTab = ref<'builtin' | 'custom'>('builtin')

const localBuiltinPrompts = ref<Prompt[]>([])

function syncFromStore() {
  localBuiltinPrompts.value = [...promptsStore.getBuiltinPrompts()]
}

onMounted(() => {
  syncFromStore()
})

watch(() => promptsStore.builtinPromptsOrder, () => {
  syncFromStore()
}, { deep: true })

// 拖拽状态
const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)
const dragDirection = ref<'top' | 'bottom' | null>(null)

function isSvgIconName(icon: string): boolean {
  if (!icon || icon.length === 0) return false
  return /^[a-z][a-z0-9-]*$/.test(icon) && icon.length > 1
}

// 拖拽开始
function handleDragStart(e: DragEvent, index: number) {
  console.log('[drag] start:', index)
  
  // 必须设置 dataTransfer，否则某些浏览器不会触发后续事件
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.dropEffect = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
  
  dragIndex.value = index
  
  // 延迟添加样式，避免拖拽图像问题
  requestAnimationFrame(() => {
    dragIndex.value = index
  })
}

// 拖拽进入
function handleDragEnter(e: DragEvent, index: number) {
  e.preventDefault()
  console.log('[drag] enter:', index)
  
  if (dragIndex.value === null || dragIndex.value === index) {
    return
  }
  
  dragOverIndex.value = index
}

// 拖拽经过
function handleDragOver(e: DragEvent, index: number) {
  e.preventDefault()
  
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  
  if (dragIndex.value === null || dragIndex.value === index) {
    dragOverIndex.value = null
    dragDirection.value = null
    return
  }
  
  dragOverIndex.value = index
  
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const midY = rect.top + rect.height / 2
  dragDirection.value = e.clientY < midY ? 'top' : 'bottom'
}

// 拖拽离开
function handleDragLeave(e: DragEvent) {
  const currentTarget = e.currentTarget as HTMLElement
  const relatedTarget = e.relatedTarget as Node | null
  
  if (relatedTarget && currentTarget.contains(relatedTarget)) {
    return
  }
  
  dragOverIndex.value = null
  dragDirection.value = null
}

// 放置
async function handleDrop(e: DragEvent, targetIndex: number) {
  e.preventDefault()
  e.stopPropagation()
  
  console.log('[drag] drop:', { from: dragIndex.value, to: targetIndex, direction: dragDirection.value })
  
  if (dragIndex.value === null || dragIndex.value === targetIndex) {
    resetDragState()
    return
  }
  
  const fromIndex = dragIndex.value
  const newList = [...localBuiltinPrompts.value]
  const [removed] = newList.splice(fromIndex, 1)
  
  let insertIndex: number
  if (fromIndex < targetIndex) {
    insertIndex = dragDirection.value === 'bottom' ? targetIndex : targetIndex - 1
  } else {
    insertIndex = dragDirection.value === 'top' ? targetIndex : targetIndex + 1
  }
  
  insertIndex = Math.max(0, Math.min(insertIndex, newList.length))
  
  newList.splice(insertIndex, 0, removed)
  localBuiltinPrompts.value = newList
  
  const newOrder = newList.map(p => p.id)
  await promptsStore.updateBuiltinOrder(newOrder)
  toast.success('排序已保存')
  
  resetDragState()
}

// 拖拽结束
function handleDragEnd() {
  console.log('[drag] end')
  resetDragState()
}

function resetDragState() {
  dragIndex.value = null
  dragOverIndex.value = null
  dragDirection.value = null
}
</script>

<style scoped src="@/styles/settings-prompts.css"></style>

<style scoped>
.prompts-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.prompts-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 20px;
  border-bottom: 2px solid var(--border-color-light);
  flex-shrink: 0;
}

.prompts-tab {
  padding: 12px 24px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.15s;
}

.prompts-tab:hover {
  color: var(--text-primary);
}

.prompts-tab.active {
  color: var(--accent-color);
  border-bottom-color: var(--accent-color);
}

.prompts-section {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  /* 关键：确保拖拽事件可以正常工作 */
  position: relative;
  contain: layout;
}

.custom-prompts-container {
  flex: 1;
  overflow: hidden;
  margin: -24px;
  margin-top: 0;
}

.icon-svg {
  flex-shrink: 0;
  color: var(--text-secondary);
}

/* ===== 关键样式修复 ===== */

/* 列表容器 */
.builtin-list {
  min-height: 100px; /* 确保有足够的放置区域 */
}

/* 列表项 */
.builtin-list .prompt-item {
  display: flex;
  align-items: center;
  cursor: grab;
  border: 2px solid transparent;
  margin-bottom: 4px;
  transition: border-color 0.15s ease, opacity 0.15s ease;
  /* 关键：确保可以接收拖拽事件 */
  position: relative;
}

.builtin-list .prompt-item * {
  /* 所有子元素都不接收指针事件，让事件冒泡到父元素 */
  pointer-events: none;
}

/* 正在拖拽的项目 */
.prompt-item.dragging {
  opacity: 0.4;
}

/* 拖拽悬停指示器 */
.prompt-item.drag-over-top {
  border-top-color: var(--accent-color);
}

.prompt-item.drag-over-bottom {
  border-bottom-color: var(--accent-color);
}

/* 拖拽手柄样式 */
.drag-handle {
  color: var(--text-tertiary);
  padding: 4px;
  margin-right: 8px;
  opacity: 0.5;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
}

.prompt-item:hover .drag-handle {
  opacity: 1;
}
</style>