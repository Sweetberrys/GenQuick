<template>
  <div class="chart-panel">
    <!-- 全屏遮罩 -->
    <div 
      class="fullscreen-overlay" 
      :class="{ active: fullscreenPanel !== null }"
      @click="exitFullscreen"
    ></div>

    <!-- 顶部工具栏 -->
    <div class="chart-toolbar" data-tauri-drag-region>
      <div class="toolbar-left">
        <label>图表类型:</label>
        <div class="chart-type-selector">
          <SvgIcon :name="currentChartConfig.icon" :size="14" class="chart-type-icon" />
          <select v-model="currentChartType" class="chart-type-select">
            <option v-for="chart in chartConfigs" :key="chart.id" :value="chart.id">
              {{ chart.name }} - {{ chart.description }}
            </option>
          </select>
        </div>
        <!-- 两栏按钮移到这里 -->
        <button class="toolbar-btn" @click="resetLayout" title="恢复两栏布局">
          <SvgIcon name="columns" :size="14" />
          <span>两栏</span>
        </button>
      </div>
      <div class="toolbar-right">
        <WindowControls @close="handleClose" />
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="chart-main">
      <!-- 预览区 -->
      <div 
        class="panel preview-panel" 
        :class="{ 
          collapsed: previewCollapsed,
          fullscreen: fullscreenPanel === 'preview'
        }"
      >
        <div class="panel-header">
          <div class="panel-title">
            <SvgIcon name="image" :size="14" />
            <span>预览</span>
            <button 
              class="panel-btn " 
              @click="regenerateChart" 
              :disabled="isLoading || !props.initialText"
              title="重新生成图表"
            >
              <SvgIcon name="refresh" :size="14" />
            </button>
            <span v-if="scale !== 1" class="zoom-indicator">{{ Math.round(scale * 100) }}%</span>
          </div>
          <div class="panel-actions">
            <button class="panel-btn" @click="zoomOut" title="缩小">
              <SvgIcon name="minus" :size="14" />
            </button>
            <button class="panel-btn" @click="resetView" title="重置视图">
              <SvgIcon name="refresh" :size="14" />
            </button>
            <button class="panel-btn" @click="zoomIn" title="放大">
              <SvgIcon name="plus" :size="14" />
            </button>
            <!-- <span class="btn-divider"></span> -->
            <!-- <button class="panel-btn" @click="toggleFullscreen('preview')" title="全屏预览">
              <SvgIcon name="maximize" :size="14" />
              <span>全屏</span>
            </button> -->
          </div>
        </div>
        <!-- 可拖拽画布区域 -->
        <div 
          class="preview-content"
          ref="previewContentRef"
          @mousedown="startDrag"
          @wheel="handleWheel"
          :style="{ cursor: isDragging ? 'grabbing' : 'grab' }"
        >
          <!-- 加载中 -->
          <div v-if="isLoading" class="preview-loading">
            <div class="spinner"></div>
            <span>AI 正在生成图表...</span>
          </div>
          <!-- 错误 -->
          <div v-else-if="renderError" class="preview-error">
            <SvgIcon name="error" :size="32" class="error-icon" />
            <div class="error-text">{{ renderError }}</div>
          </div>
          <!-- 占位符 -->
          <div v-else-if="!chartCode" class="preview-placeholder">
            <SvgIcon name="chart" :size="48" class="placeholder-icon" />
            <p>选中文本后，AI 将为您生成图表</p>
          </div>
          <!-- 可缩放拖拽的图表容器 -->
          <div 
            v-else
            class="canvas-wrapper"
            :style="canvasStyle"
          >
            <div ref="chartContainerRef" class="chart-container"></div>
          </div>
        </div>
        <!-- 预览状态栏 -->
        <div class="status-bar">
          <div class="status-info">
            <span 
              class="status-dot" 
              :class="{ loading: isLoading, error: !!renderError }"
            ></span>
            <span>{{ statusText }}</span>
          </div>
          <div class="status-actions">
            <button 
              class="status-btn" 
              @click="copyImage" 
              :disabled="!chartCode || isLoading"
              title="复制图片到剪贴板"
            >
              <SvgIcon name="image" :size="12" />
              <span>图片</span>
            </button>
            <button 
              class="status-btn" 
              @click="copyCode" 
              :disabled="!chartCode || isLoading"
              title="复制代码到剪贴板"
            >
              <SvgIcon name="code" :size="12" />
              <span>代码</span>
            </button>
            <button 
              class="status-btn" 
              @click="openImageEditor" 
              :disabled="!chartCode || isLoading"
              title="编辑图片"
            >
              <SvgIcon name="edit" :size="12" />
              <span>编辑</span>
            </button>
            <span class="status-btn-divider"></span>
            <button 
              class="status-btn" 
              @click="handleReplace" 
              :disabled="!chartCode || isLoading"
              title="用图片替换选中内容"
            >
              <SvgIcon name="replace" :size="12" />
              <span>替换</span>
            </button>
            <button 
              class="status-btn" 
              @click="handleInsertBefore" 
              :disabled="!chartCode || isLoading"
              title="在光标前插入图片"
            >
              <SvgIcon name="insert-before" :size="12" />
              <span>前插</span>
            </button>
            <button 
              class="status-btn" 
              @click="handleInsertAfter" 
              :disabled="!chartCode || isLoading"
              title="在光标后插入图片"
            >
              <SvgIcon name="insert-after" :size="12" />
              <span>后插</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 分隔条（带折叠按钮） -->
      <div 
        class="panel-divider" 
        :class="{ 'preview-collapsed': previewCollapsed }"
      >
        <button 
          class="divider-toggle" 
          @click="togglePreviewPanel"
          :title="previewCollapsed ? '展开预览区' : '收起预览区'"
        >
          <SvgIcon :name="previewCollapsed ? 'chevron-right' : 'chevron-left'" :size="14" />
        </button>
      </div>

      <!-- 代码编辑区 -->
      <div 
        class="panel editor-panel"
        :class="{ 
          fullscreen: fullscreenPanel === 'editor'
        }"
      >
        <div class="panel-header">
          <div class="panel-title">
            <SvgIcon name="code" :size="14" />
            <span>代码编辑</span>
          </div>
          <div class="panel-actions">
            <button 
              class="panel-btn" 
              @click="formatCode" 
              :disabled="!editableCode || isLoading"
              title="格式化代码"
            >
              <SvgIcon name="format" :size="14" />
              <span>格式化</span>
            </button>
            <button class="panel-btn" @click="toggleFullscreen('editor')" title="全屏编辑">
              <SvgIcon name="maximize" :size="14" />
              <span>全屏</span>
            </button>
          </div>
        </div>
        <div class="editor-content">
          <textarea 
            v-model="editableCode"
            class="code-editor"
            placeholder="图表代码将在这里显示，您可以直接编辑..."
            @input="handleCodeChange"
          ></textarea>
        </div>
        <div class="status-bar">
          <div class="status-info">
            <span>{{ currentChartType.toUpperCase() }}</span>
            <span>·</span>
            <span>{{ codeLineCount }} 行</span>
            <span>·</span>
            <span>UTF-8</span>
          </div>
        </div>
      </div>
    </div>

    <!-- AI 对话区 -->
    <div class="chat-panel" ref="chatPanelRef" :style="{ height: chatPanelHeight + 'px' }"">
      <!-- 拖拽手柄 -->
      <div 
        class="resize-handle" 
        :class="{ dragging: isResizing }"
        @mousedown="startResize"
      ></div>
      
      <div class="chat-header">
        <span>💬 AI 对话</span>
        <button class="panel-btn" @click="toggleChatPanel">
          <SvgIcon :name="chatCollapsed ? 'chevron-down' : 'chevron-up'" :size="12" />
          <span>{{ chatCollapsed ? '展开' : '收起' }}</span>
        </button>
      </div>
      
      <div v-show="!chatCollapsed" class="chat-history" ref="chatHistoryRef">
        <div 
          v-for="(msg, index) in chatMessages" 
          :key="index"
          class="chat-message"
          :class="msg.role"
        >
          <div class="chat-avatar">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
          <div class="chat-bubble">{{ msg.content }}</div>
        </div>
      </div>
      
      <div v-show="!chatCollapsed" class="chat-input-area">
        <input 
          v-model="chatInput"
          type="text" 
          class="chat-input" 
          placeholder="输入你的修改需求，让AI帮你调整图表..."
          @keydown.enter="sendChatMessage"
          :disabled="isLoading"
        />
        <button 
          class="btn-send" 
          @click="sendChatMessage"
          :disabled="!chatInput.trim() || isLoading"
        >
          <SvgIcon name="send" :size="14" />
          <span>发送</span>
        </button>
      </div>
    </div>

    <!-- 图片编辑器弹窗 -->
    <Teleport to="body">
      <div v-if="showImageEditor" class="image-editor-overlay">
        <ImageEditor
          :image="editorImageSource!"
          @export-original="handleEditorExportOriginal"
          @export-edited="handleEditorExportEdited"
          @close="closeImageEditor"
          @copy-image="handleEditorCopyImage"
          @replace-selection="handleEditorReplaceSelection"
          @insert-before="handleEditorInsertBefore"
          @insert-after="handleEditorInsertAfter"
        />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/core'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import SvgIcon from './icons/SvgIcon.vue'
import WindowControls from './WindowControls.vue'
import { ImageEditor } from './ImageEditor'
import { CHART_CONFIGS, buildChartModifyPrompt } from '@/types'
import { renderChart, svgToPngBlob, echartsToPngBlob, markmapToPngBlob } from '@/utils/chartRenderer'
import type { ChartType } from '@/types'
import * as echarts from 'echarts'

interface ChatMessage {
  role: 'user' | 'ai'
  content: string
}

const props = defineProps<{
  initialChartType: ChartType
  initialText: string
}>()

const emit = defineEmits<{
  close: []
}>()

// 图表配置
const chartConfigs = CHART_CONFIGS
const currentChartType = ref<ChartType>(props.initialChartType)

// 代码状态
const chartCode = ref('')
const editableCode = ref('')
const renderError = ref<string | null>(null)
const isLoading = ref(false)

// 面板状态
const previewCollapsed = ref(false)
const fullscreenPanel = ref<'preview' | 'editor' | null>(null)

// 画布拖拽和缩放状态
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const lastTranslateX = ref(0)
const lastTranslateY = ref(0)

// 对话状态
const chatMessages = ref<ChatMessage[]>([])
const chatInput = ref('')
const chatCollapsed = ref(false)
const chatPanelHeight = ref(180)
const isResizing = ref(false)

// 图片编辑器状态
const showImageEditor = ref(false)
const editorImageSource = ref<string | null>(null)

// Refs
const chartContainerRef = ref<HTMLElement>()
const chatHistoryRef = ref<HTMLElement>()

// ECharts 实例引用
let echartsInstance: echarts.ECharts | null = null

// 计算属性
const codeLineCount = computed(() => {
  return editableCode.value.split('\n').length
})

const statusText = computed(() => {
  if (isLoading.value) return '生成中...'
  if (renderError.value) return '渲染失败'
  if (!chartCode.value) return '等待生成'
  return '渲染完成'
})

// 获取当前图表配置
const currentChartConfig = computed(() => {
  return chartConfigs.find(c => c.id === currentChartType.value) || chartConfigs[0]
})

// 画布样式
const canvasStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  transformOrigin: 'center center'
}))

// 画布拖拽
function startDrag(e: MouseEvent) {
  if (e.button !== 0) return
  isDragging.value = true
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  lastTranslateX.value = translateX.value
  lastTranslateY.value = translateY.value
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value) return
  const dx = e.clientX - dragStartX.value
  const dy = e.clientY - dragStartY.value
  translateX.value = lastTranslateX.value + dx
  translateY.value = lastTranslateY.value + dy
}

function stopDrag() {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 滚轮缩放
function handleWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newScale = Math.max(0.1, Math.min(3, scale.value + delta))
  scale.value = newScale
}

// 缩放控制
function zoomIn() {
  scale.value = Math.min(3, scale.value + 0.2)
}

function zoomOut() {
  scale.value = Math.max(0.1, scale.value - 0.2)
}

function resetView() {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

// 监听代码变化，实时渲染
let renderTimeout: number | null = null
watch(editableCode, (newCode) => {
  if (renderTimeout) {
    clearTimeout(renderTimeout)
  }
  renderTimeout = window.setTimeout(() => {
    if (newCode) {
      renderChartPreview(newCode)
    }
  }, 500)
})

// 监听图表类型变化
watch(currentChartType, () => {
  chartCode.value = ''
  editableCode.value = ''
  renderError.value = null
  chatMessages.value = []
  resetView()
})

// 渲染图表预览
async function renderChartPreview(code: string) {
  if (!chartContainerRef.value) return
  
  renderError.value = null
  
  try {
    await renderChart(currentChartType.value, code, chartContainerRef.value)
    
    if (currentChartType.value === 'echarts' || currentChartType.value === 'wordcloud') {
      echartsInstance = echarts.getInstanceByDom(chartContainerRef.value) || null
    }
  } catch (error) {
    renderError.value = String(error)
  }
}

// 处理代码变化
function handleCodeChange() {
  chartCode.value = editableCode.value
}

// 格式化代码
function formatCode() {
  if (!editableCode.value) return
  
  const code = editableCode.value.trim()
  let formatted = code
  
  try {
    switch (currentChartType.value) {
      case 'echarts':
      case 'wordcloud':
        // JSON 格式化
        const parsed = JSON.parse(code)
        formatted = JSON.stringify(parsed, null, 2)
        break
        
      case 'mermaid':
        // Mermaid 格式化：规范缩进和换行
        formatted = formatMermaid(code)
        break
        
      case 'graphviz':
        // Graphviz DOT 格式化
        formatted = formatGraphviz(code)
        break
        
      case 'markmap':
        // Markdown 格式化：规范标题层级和缩进
        formatted = formatMarkdown(code)
        break
        
      default:
        // 其他格式保持原样
        break
    }
    
    editableCode.value = formatted
    chartCode.value = formatted
  } catch (error) {
    console.warn('代码格式化失败:', error)
  }
}

// Mermaid 代码格式化
function formatMermaid(code: string): string {
  const lines = code.split('\n')
  const result: string[] = []
  let indentLevel = 0
  
  for (let line of lines) {
    line = line.trim()
    if (!line) continue
    
    // 检查是否是图表类型声明
    if (/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap|timeline)/i.test(line)) {
      result.push(line)
      indentLevel = 1
      continue
    }
    
    // 检查是否是 subgraph 开始
    if (/^subgraph/i.test(line)) {
      result.push('  '.repeat(indentLevel) + line)
      indentLevel++
      continue
    }
    
    // 检查是否是 end
    if (/^end$/i.test(line)) {
      indentLevel = Math.max(1, indentLevel - 1)
      result.push('  '.repeat(indentLevel) + line)
      continue
    }
    
    // 普通行
    result.push('  '.repeat(indentLevel) + line)
  }
  
  return result.join('\n')
}

// Graphviz DOT 代码格式化
function formatGraphviz(code: string): string {
  let result = code
  
  // 规范化大括号
  result = result.replace(/\{/g, ' {\n')
  result = result.replace(/\}/g, '\n}')
  result = result.replace(/;/g, ';\n')
  
  // 处理缩进
  const lines = result.split('\n')
  const formatted: string[] = []
  let indentLevel = 0
  
  for (let line of lines) {
    line = line.trim()
    if (!line) continue
    
    // 减少缩进（遇到 }）
    if (line.startsWith('}')) {
      indentLevel = Math.max(0, indentLevel - 1)
    }
    
    formatted.push('  '.repeat(indentLevel) + line)
    
    // 增加缩进（遇到 {）
    if (line.endsWith('{')) {
      indentLevel++
    }
  }
  
  return formatted.join('\n')
}

// Markdown 格式化
function formatMarkdown(code: string): string {
  const lines = code.split('\n')
  const result: string[] = []
  
  for (let line of lines) {
    // 保留原始缩进的列表项
    const trimmed = line.trim()
    
    if (!trimmed) {
      result.push('')
      continue
    }
    
    // 标题：确保 # 后有空格
    if (/^#+/.test(trimmed)) {
      const match = trimmed.match(/^(#+)(.*)/)
      if (match) {
        const hashes = match[1]
        const text = match[2].trim()
        result.push(`${hashes} ${text}`)
        continue
      }
    }
    
    // 列表项：保持原样
    if (/^[-*+]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
      result.push(line)
      continue
    }
    
    result.push(trimmed)
  }
  
  return result.join('\n')
}

// 面板操作
function togglePreviewPanel() {
  previewCollapsed.value = !previewCollapsed.value
}

function toggleFullscreen(panel: 'preview' | 'editor') {
  if (fullscreenPanel.value === panel) {
    fullscreenPanel.value = null
  } else {
    fullscreenPanel.value = panel
  }
}

function exitFullscreen() {
  fullscreenPanel.value = null
}

function resetLayout() {
  previewCollapsed.value = false
  fullscreenPanel.value = null
}

// 对话面板操作
function toggleChatPanel() {
  chatCollapsed.value = !chatCollapsed.value
}

// 拖拽调整对话区高度
let startY = 0
let startHeight = 0

function startResize(e: MouseEvent) {
  isResizing.value = true
  startY = e.clientY
  startHeight = chatPanelHeight.value
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

function onResize(e: MouseEvent) {
  if (!isResizing.value) return
  const deltaY = startY - e.clientY
  const newHeight = Math.min(Math.max(startHeight + deltaY, 120), 400)
  chatPanelHeight.value = newHeight
}

function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

// 图片编辑器相关方法
async function openImageEditor() {
  if (!chartContainerRef.value) return
  
  try {
    // 直接获取图表的 PNG 图片数据
    const pngData = await getImageData()
    
    // 将 Uint8Array 转换为 Blob，再转换为 URL
    const blob = new Blob([pngData], { type: 'image/png' })
    editorImageSource.value = URL.createObjectURL(blob)
    showImageEditor.value = true
  } catch (err) {
    console.error('打开图片编辑器失败:', err)
  }
}

function closeImageEditor() {
  // 清理 URL
  if (typeof editorImageSource.value === 'string' && editorImageSource.value.startsWith('blob:')) {
    URL.revokeObjectURL(editorImageSource.value)
  }
  showImageEditor.value = false
  editorImageSource.value = null
}

async function handleEditorExportOriginal(_dataUrl: string) {
  console.log('导出原图')
}

async function handleEditorExportEdited(_dataUrl: string) {
  console.log('导出编辑图')
}

// 复制图片到剪贴板
async function handleEditorCopyImage(dataUrl: string) {
  try {
    // 将 dataUrl 转换为 Blob
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    
    // 使用 Clipboard API 复制图片
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ])
    console.log('图片已复制到剪贴板')
  } catch (err) {
    console.error('复制图片失败:', err)
  }
}

// 替换选中内容
async function handleEditorReplaceSelection(dataUrl: string) {
  try {
    // 将 dataUrl 转换为 Blob
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    
    // 使用 Clipboard API 复制图片
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ])
    
    // 关闭编辑器
    closeImageEditor()
    
    // 模拟粘贴操作替换选中内容
    document.execCommand('paste')
    console.log('已替换选中内容')
  } catch (err) {
    console.error('替换选中内容失败:', err)
  }
}

// 前置插入
async function handleEditorInsertBefore(dataUrl: string) {
  try {
    // 将 dataUrl 转换为 Blob
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    
    // 使用 Clipboard API 复制图片
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ])
    
    // 关闭编辑器
    closeImageEditor()
    
    console.log('图片已复制，请在目标位置粘贴（前置插入）')
  } catch (err) {
    console.error('前置插入失败:', err)
  }
}

// 后置插入
async function handleEditorInsertAfter(dataUrl: string) {
  try {
    // 将 dataUrl 转换为 Blob
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    
    // 使用 Clipboard API 复制图片
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ])
    
    // 关闭编辑器
    closeImageEditor()
    
    console.log('图片已复制，请在目标位置粘贴（后置插入）')
  } catch (err) {
    console.error('后置插入失败:', err)
  }
}

// 发送对话消息
async function sendChatMessage() {
  if (!chatInput.value.trim() || isLoading.value) return
  
  const userMessage = chatInput.value.trim()
  chatMessages.value.push({ role: 'user', content: userMessage })
  chatInput.value = ''
  
  await nextTick()
  if (chatHistoryRef.value) {
    chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight
  }
  
  await requestAIModification(userMessage)
}

// 请求 AI 修改图表
async function requestAIModification(userRequest: string) {
  isLoading.value = true
  renderError.value = null
  
  try {
    const systemPrompt = buildChartModifyPrompt(
      currentChartConfig.value.name,
      editableCode.value
    )

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userRequest }
    ]
    
    const response = await invokeAI(messages)
    
    chartCode.value = response
    editableCode.value = response
    
    chatMessages.value.push({ 
      role: 'ai', 
      content: '已根据您的需求更新了图表代码，请查看预览效果。' 
    })
    
    await nextTick()
    if (chatHistoryRef.value) {
      chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight
    }
  } catch (error) {
    chatMessages.value.push({ 
      role: 'ai', 
      content: `抱歉，生成失败：${error}` 
    })
  } finally {
    isLoading.value = false
  }
}

// 调用 AI 接口
async function invokeAI(messages: Array<{ role: string; content: string }>): Promise<string> {
  const { useConfigStore } = await import('@/stores/config')
  const configStore = useConfigStore()
  const activeApi = configStore.activeConfig
  
  if (!activeApi) {
    throw new Error('请先在设置中配置 API')
  }
  
  return await invoke<string>('ai_request_sync', {
    endpoint: activeApi.endpoint,
    apiKey: activeApi.apiKey,
    model: activeApi.model,
    messages
  })
}

// 初始生成图表
async function generateInitialChart() {
  if (!props.initialText) return
  
  isLoading.value = true
  renderError.value = null
  
  chatMessages.value.push({ 
    role: 'user', 
    content: props.initialText 
  })
  
  try {
    const prompt = currentChartConfig.value.prompt.replace('{text}', props.initialText)
    const messages = [{ role: 'user', content: prompt }]
    
    const response = await invokeAI(messages)
    
    chartCode.value = response
    editableCode.value = response
    
    chatMessages.value.push({ 
      role: 'ai', 
      content: '已为您生成图表，您可以在左侧预览效果，右侧可以直接编辑代码进行调整。' 
    })
  } catch (error) {
    renderError.value = String(error)
    chatMessages.value.push({ 
      role: 'ai', 
      content: `抱歉，生成失败：${error}` 
    })
  } finally {
    isLoading.value = false
  }
}

// 重新生成图表
async function regenerateChart() {
  if (!props.initialText || isLoading.value) return
  
  isLoading.value = true
  renderError.value = null
  chartCode.value = ''
  editableCode.value = ''
  
  chatMessages.value.push({ 
    role: 'user', 
    content: '重新生成图表' 
  })
  
  try {
    const prompt = currentChartConfig.value.prompt.replace('{text}', props.initialText)
    const messages = [{ role: 'user', content: prompt }]
    
    const response = await invokeAI(messages)
    
    chartCode.value = response
    editableCode.value = response
    
    chatMessages.value.push({ 
      role: 'ai', 
      content: '已重新生成图表，请查看预览效果。' 
    })
  } catch (error) {
    renderError.value = String(error)
    chatMessages.value.push({ 
      role: 'ai', 
      content: `抱歉，重新生成失败：${error}` 
    })
  } finally {
    isLoading.value = false
  }
}

// 获取图片 PNG 数据（Uint8Array）
async function getImageData(): Promise<Uint8Array> {
  if (!chartContainerRef.value) {
    throw new Error('图表容器未找到')
  }
  
  let blob: Blob
  
  try {
    if ((currentChartType.value === 'echarts' || currentChartType.value === 'wordcloud') && echartsInstance) {
      blob = await echartsToPngBlob(echartsInstance)
    } else if (currentChartType.value === 'markmap') {
      blob = await markmapToPngBlob(chartContainerRef.value)
    } else {
      // mermaid, graphviz 都是 SVG
      const svg = chartContainerRef.value.querySelector('svg')
      if (!svg) {
        console.error('容器内容:', chartContainerRef.value.innerHTML.substring(0, 500))
        throw new Error('未找到 SVG 元素')
      }
      blob = await svgToPngBlob(svg as SVGElement)
    }
  } catch (error) {
    console.error('获取图片数据失败:', error)
    throw error
  }
  
  // 将 Blob 转换为 Uint8Array
  const arrayBuffer = await blob.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

// 复制图片到剪贴板
async function copyImage() {
  try {
    const pngData = await getImageData()
    await invoke('copy_image_only', { pngData: Array.from(pngData) })
    console.log('图片已复制到剪贴板')
  } catch (error) {
    console.error('复制图片失败:', error)
  }
}

// 复制代码到剪贴板
async function copyCode() {
  try {
    await writeText(editableCode.value)
    console.log('代码已复制到剪贴板')
  } catch (error) {
    console.error('复制代码失败:', error)
  }
}

// 替换操作：将图片写入剪贴板并粘贴替换选中内容
async function handleReplace() {
  try {
    const pngData = await getImageData()
    await invoke('replace_with_image', { pngData: Array.from(pngData) })
    emit('close')
  } catch (error) {
    console.error('替换失败:', error)
    renderError.value = `导出失败: ${error}`
  }
}

// 前置插入：将图片写入剪贴板并插入到选中文本前面
async function handleInsertBefore() {
  try {
    const pngData = await getImageData()
    await invoke('insert_image_before', { pngData: Array.from(pngData) })
    emit('close')
  } catch (error) {
    console.error('前置插入失败:', error)
    renderError.value = `导出失败: ${error}`
  }
}

// 后置插入：将图片写入剪贴板并插入到选中文本后面
async function handleInsertAfter() {
  try {
    const pngData = await getImageData()
    await invoke('insert_image_after', { pngData: Array.from(pngData) })
    emit('close')
  } catch (error) {
    console.error('后置插入失败:', error)
    renderError.value = `导出失败: ${error}`
  }
}

async function handleClose() {
  emit('close')
}

// 主题状态
const currentTheme = ref<'light' | 'dark'>('light')

// 检测并应用系统主题
async function detectAndApplyTheme() {
  try {
    const theme = await invoke<string>('get_system_theme')
    currentTheme.value = theme as 'light' | 'dark'
    applyTheme(currentTheme.value)
  } catch (error) {
    console.error('获取系统主题失败:', error)
    // 默认使用亮色主题
    applyTheme('light')
  }
}

// 应用主题到 DOM
function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('theme-dark')
    root.classList.remove('theme-light')
  } else {
    root.classList.add('theme-light')
    root.classList.remove('theme-dark')
  }
}

// 调整窗口大小并设置居中位置
async function resizeAndPositionWindow(width: number, height: number) {
  try {
    const appWindow = getCurrentWindow()
    
    // 临时启用 resizable 以允许调整大小
    await appWindow.setResizable(true)
    
    // 设置窗口大小
    await appWindow.setSize(new LogicalSize(width, height))
    
    // 调整完后禁用 resizable
    await appWindow.setResizable(false)
    
    // 将窗口居中显示
    await invoke('center_window', { width, height })
    
    // 设置窗口圆角
    await invoke('set_window_rounded', { label: 'main' })
    
  } catch (err) {
    console.error('调整窗口失败:', err)
  }
}

// 调整窗口大小
async function resizeWindow(width: number, height: number) {
  // 窗口尺寸 = 内容尺寸 + 24px (12px padding * 2 用于阴影空间)
  const actualWidth = width + 24
  const actualHeight = height + 24
  try {
    const appWindow = getCurrentWindow()
    // 临时启用 resizable 以允许调整大小
    await appWindow.setResizable(true)
    await appWindow.setSize(new LogicalSize(actualWidth, actualHeight))
    // 调整完后禁用 resizable，防止用户手动调整
    await appWindow.setResizable(false)
  } catch (err) {
    console.error('调整窗口大小失败:', err)
  }
}

// 重置状态
function reset() {
  chartCode.value = ''
  editableCode.value = ''
  renderError.value = null
  chatMessages.value = []
  chatInput.value = ''
  previewCollapsed.value = false
  fullscreenPanel.value = null
  echartsInstance = null
  resetView()
}

// 生命周期
onMounted(async () => {
  // 检测并应用系统主题
  await detectAndApplyTheme()
  
  // 调整窗口大小和位置
  await resizeAndPositionWindow(1120, 750)
  
  // 生成初始图表
  if (props.initialText) {
    await generateInitialChart()
  }
})

onUnmounted(() => {
  if (renderTimeout) {
    clearTimeout(renderTimeout)
  }
  if (echartsInstance) {
    echartsInstance.dispose()
  }
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})

defineExpose({ reset, resizeWindow })
</script>

<style scoped lang="scss">
@use '@/styles/chart-panel.scss' as *;

// 工具栏按钮
.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  margin-left: 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border-color: var(--accent-color);
  }
}

// 图表类型选择器
.chart-type-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  -webkit-app-region: no-drag;

  &:hover {
    border-color: var(--accent-color);
  }

  &:focus-within {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }

  .chart-type-icon {
    color: var(--accent-color);
    flex-shrink: 0;
  }

  .chart-type-select {
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
    outline: none;

    option {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }
  }
}

// 画布相关样式
.preview-content {
  position: relative;
  overflow: hidden;
  user-select: none;
}

.canvas-wrapper {
  display: inline-block;
  transition: transform 0.05s ease-out;
  will-change: transform;
  min-width: fit-content;
  min-height: fit-content;
}

// 图表容器 - 白色背景（确保导出时背景一致）
// 尺寸由 JS 根据图表类型动态设置
.chart-container {
  background: #ffffff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: fit-content;
  min-height: fit-content;
  
  // 确保 SVG 和 Canvas 不被裁剪
  svg, canvas {
    display: block;
    max-width: none !important;
    max-height: none !important;
    background: transparent !important;
  }
}

.zoom-indicator {
  margin-left: 8px;
  padding: 2px 6px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-secondary);
}

// 图片编辑器弹窗 - 居中显示，覆盖图表窗口
.image-editor-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  :deep(.editor-container) {
    width: 1120px;
    height: 750px;
    max-width: 100vw;
    max-height: 100vh;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
}

// 移除弹窗背景，由 box-shadow 替代
.image-editor-overlay {
  background: transparent;
}

// 重新生成按钮样式
.regenerate-btn {
  margin-left: 12px;
  background: var(--accent-color) !important;
  color: white !important;
  border: none !important;
  padding: 4px 10px !important;
  
  &:hover:not(:disabled) {
    opacity: 0.9;
    background: var(--accent-color) !important;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
