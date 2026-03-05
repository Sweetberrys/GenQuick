<template>
  <div class="editor-container" @keydown="handleKeyDown" tabindex="0" ref="editorRef">
    <!-- 顶部工具栏 -->
    <TopToolbar
      :current-tool="currentTool"
      :settings="settings"
      @toggle-sidebar="leftCollapsed = !leftCollapsed"
      @update-settings="handleUpdateSettings"
      @close="emit('close')"
      @copy-image="handleCopyImage"
      @replace-selection="handleReplaceSelection"
      @insert-before="handleInsertBefore"
      @insert-after="handleInsertAfter"
    />

    <!-- 主体区域 -->
    <div class="main-area">
      <!-- 左侧工具栏 -->
      <LeftToolbar
        :current-tool="currentTool"
        :collapsed="leftCollapsed"
        @set-tool="handleSetTool"
      />

      <!-- 画布区域 -->
      <div class="canvas-wrapper">
        <div class="canvas-area" id="canvasContainer">
          <canvas ref="canvasRef"></canvas>
        </div>
      </div>
    </div>

    <!-- 底部工具栏 -->
    <BottomToolbar
      :current-tool="currentTool"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :has-objects="hasObjects"
      :mouse-pos="mousePos"
      :zoom="zoom"
      @undo="handleUndo"
      @redo="handleRedo"
      @delete="deleteSelected"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @set-zoom="setZoom"
    />

    <!-- 隐藏的图片上传 -->
    <input type="file" ref="imageInputRef" accept="image/*" style="display:none" @change="handleImageSelect" />

    <!-- Tooltip -->
    <div ref="tooltipRef" class="tooltip"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import TopToolbar from './components/TopToolbar.vue'
import LeftToolbar from './components/LeftToolbar.vue'
import BottomToolbar from './components/BottomToolbar.vue'
import { useEditorCore } from './composables/useEditorCore'
import { useHistory } from './composables/useHistory'
import type { ToolType, EditorSettings } from './types'

import './styles/editor.scss'

const props = defineProps<{
  image?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', dataUrl: string): void
  (e: 'export-original', dataUrl: string): void
  (e: 'export-edited', dataUrl: string): void
  (e: 'copy-image', dataUrl: string): void
  (e: 'replace-selection', dataUrl: string): void
  (e: 'insert-before', dataUrl: string): void
  (e: 'insert-after', dataUrl: string): void
}>()

// Refs
const editorRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()
const imageInputRef = ref<HTMLInputElement>()
const tooltipRef = ref<HTMLElement>()

// 编辑器核心
const {
  canvas,
  currentTool,
  settings,
  zoom,
  leftCollapsed,
  hasObjects,
  mousePos,
  initCanvas,
  setTool,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  updateSettings,
  deleteSelected,
  selectAll,
  setZoom,
  zoomIn,
  zoomOut,
  insertImage,
  exportImage,
  getState,
  setState,
  dispose,
  updateObjectCount,
} = useEditorCore()

// 历史记录
const { canUndo, canRedo, saveState, undo, redo, init: initHistory } = useHistory(getState, setState)

// 初始化
onMounted(async () => {
  if (!canvasRef.value) return

  // 等待下一帧，确保 DOM 已渲染完成
  await nextTick()

  // 动态获取实际工具栏尺寸
  const editorElement = editorRef.value
  if (!editorElement) return

  // 使用固定的工具栏尺寸
  const topBarHeight = 56
  const bottomBarHeight = 40
  const leftBarWidth = 72

  const editorWidth = editorElement.offsetWidth
  const editorHeight = editorElement.offsetHeight

  const canvasWidth = editorWidth - leftBarWidth
  const canvasHeight = editorHeight - topBarHeight - bottomBarHeight

  console.log('Editor size:', editorWidth, editorHeight)
  console.log('Canvas size:', canvasWidth, canvasHeight)

  initCanvas(canvasRef.value, Math.max(canvasWidth, 400), Math.max(canvasHeight, 300))

  // 绑定画布事件
  if (canvas.value) {
    canvas.value.on('mouse:down', onMouseDown)
    canvas.value.on('mouse:move', onMouseMove)
    canvas.value.on('mouse:up', onMouseUp)
    canvas.value.on('mouse:dblclick', handleDoubleClick)
    canvas.value.on('path:created', () => { saveState(); updateObjectCount() })
    canvas.value.on('object:modified', () => { saveState(); updateObjectCount() })
    canvas.value.on('object:added', () => { updateObjectCount(); saveState() })
    canvas.value.on('object:removed', () => { updateObjectCount(); saveState() })
    canvas.value.on('mouse:wheel', handleWheel)
    canvas.value.on('text:editing:entered', () => saveState())
    canvas.value.on('text:editing:exited', () => saveState())
  }

  initHistory()
  initTooltips()

  // 加载图片
  if (props.image) {
    await loadBackgroundImage(props.image)
  }

  // 监听窗口大小
  window.addEventListener('resize', handleResize)

  nextTick(() => editorRef.value?.focus())
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  dispose()
})

// 加载背景图片
async function loadBackgroundImage(src: string) {
  if (!canvas.value) return
  const { FabricImage } = await import('fabric')
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    const canvasWidth = canvas.value!.width!
    const canvasHeight = canvas.value!.height!
    
    // 计算图片居中位置
    const left = (canvasWidth - img.width) / 2
    const top = (canvasHeight - img.height) / 2
    
    const fabricImg = new FabricImage(img, {
      left: left,
      top: top,
      selectable: false,
      evented: false,
    })
    canvas.value!.add(fabricImg)
    canvas.value!.sendObjectToBack(fabricImg)
    canvas.value!.renderAll()
  }
  img.src = src
}

// 窗口大小变化
function handleResize() {
  // 动态调整画布尺寸以适应窗口变化
  if (!canvas.value || !editorRef.value) return

  const editorElement = editorRef.value
  const topToolbar = editorElement.querySelector('.top-toolbar') as HTMLElement
  const bottomToolbar = editorElement.querySelector('.bottom-toolbar') as HTMLElement
  const leftToolbar = editorElement.querySelector('.left-toolbar') as HTMLElement

  const topBarHeight = topToolbar?.offsetHeight || 56
  const bottomBarHeight = bottomToolbar?.offsetHeight || 40
  const leftBarWidth = leftToolbar?.offsetWidth || 72

  const editorWidth = editorElement.offsetWidth
  const editorHeight = editorElement.offsetHeight

  const canvasWidth = editorWidth - leftBarWidth
  const canvasHeight = editorHeight - topBarHeight - bottomBarHeight

  // 使用 setDimensions 而不是 resizeCanvas，因为我们使用的是 fabric.js
  canvas.value.setDimensions({
    width: Math.max(canvasWidth, 400),
    height: Math.max(canvasHeight, 300)
  })
  canvas.value.renderAll()
}

// 监听侧栏折叠
watch(leftCollapsed, async () => {
  // 等待折叠动画完成
  await new Promise(resolve => setTimeout(resolve, 300))
  // 重新计算画布尺寸
  handleResize()
})

// 滚轮缩放
function handleWheel(opt: any) {
  opt.e.preventDefault()
  const delta = opt.e.deltaY
  let newZoom = zoom.value * (0.999 ** delta)
  newZoom = Math.min(Math.max(0.1, newZoom), 5)
  setZoom(newZoom)
}

// 工具切换
function handleSetTool(tool: ToolType) {
  if (tool === 'image') {
    imageInputRef.value?.click()
    return
  }
  setTool(tool)
}

// 图片选择
function handleImageSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files[0]) {
    insertImage(input.files[0])
    saveState()
    input.value = ''
  }
}

// 设置更新
function handleUpdateSettings(newSettings: Partial<EditorSettings>) {
  updateSettings(newSettings)
}

// 撤销/重做
async function handleUndo() {
  await undo()
}

async function handleRedo() {
  await redo()
}

// Tooltip 初始化
function initTooltips() {
  const tooltip = tooltipRef.value
  if (!tooltip) return

  document.addEventListener('mouseover', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-tooltip]')
    if (btn) {
      tooltip.textContent = btn.getAttribute('data-tooltip') || ''
      tooltip.classList.add('show')
      const rect = btn.getBoundingClientRect()
      tooltip.style.left = rect.left + rect.width / 2 + 'px'
      tooltip.style.top = rect.bottom + 8 + 'px'
      tooltip.style.transform = 'translateX(-50%)'
    }
  }, true)

  document.addEventListener('mouseout', (e) => {
    if ((e.target as HTMLElement).closest('[data-tooltip]')) {
      tooltip.classList.remove('show')
    }
  }, true)
}

// 键盘快捷键
function handleKeyDown(e: KeyboardEvent) {
  if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return

  const key = e.key.toLowerCase()

  if (e.ctrlKey || e.metaKey) {
    switch (key) {
      case 'z':
        e.preventDefault()
        e.shiftKey ? handleRedo() : handleUndo()
        break
      case 'y':
        e.preventDefault()
        handleRedo()
        break
      case 'a':
        e.preventDefault()
        selectAll()
        break
    }
  } else {
    switch (key) {
      case 'v': setTool('select'); break
      case 'h': setTool('pan'); break
      case 'b': setTool('brush'); break
      case 'e': setTool('eraser'); break
      case 'l': setTool('line'); break
      case 'a': setTool('arrow'); break
      case 'r': setTool('rect'); break
      case 'o': setTool('circle'); break
      case 't': setTool('text'); break
      case 'delete':
      case 'backspace':
        e.preventDefault()
        deleteSelected()
        saveState()
        break
      case 'escape':
        canvas.value?.discardActiveObject()
        canvas.value?.renderAll()
        break
    }
  }
}

// 双击事件处理
function handleDoubleClick(opt: any) {
  if (!canvas.value) return

  const target = opt.target

  // 如果双击的是文本对象，进入编辑模式
  if (target && (target.type === 'i-text' || target.type === 'text' || target.type === 'textbox')) {
    target.enterEditing()
    target.selectAll()
    canvas.value.renderAll()
  }
}

// 复制图片到剪贴板
function handleCopyImage() {
  const dataUrl = exportImage()
  emit('copy-image', dataUrl)
}

// 替换选中内容
function handleReplaceSelection() {
  const dataUrl = exportImage()
  emit('replace-selection', dataUrl)
}

// 前置插入
function handleInsertBefore() {
  const dataUrl = exportImage()
  emit('insert-before', dataUrl)
}

// 后置插入
function handleInsertAfter() {
  const dataUrl = exportImage()
  emit('insert-after', dataUrl)
}
</script>
