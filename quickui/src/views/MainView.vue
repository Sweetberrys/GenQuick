<template>
  <div class="main-view">
    <!-- 快捷菜单 -->
    <QuickMenu 
      v-if="currentMode === 'menu'"
      @select="handleSelect" 
      @select-chart="handleSelectChart"
      @close="handleClose" 
    />

    <!-- 文本结果面板 -->
    <ResultPanel
      v-else-if="currentMode === 'text'"
      ref="resultPanelRef"
      :current-prompt="currentPrompt"
      :content="content"
      :is-loading="isLoading"
      :is-done="isDone"
      :error="error"
      :initial-user-text="initialUserText"
      @close="handleResultClose"
      @retry="handleRetry"
      @insert="handleInsert"
      @insert-before="handleInsertBefore"
      @replace="handleReplaceText"
      @send-message="handleSendMessage"
      @switch-to-result="handleSwitchToResult"
      @new-chat="handleNewChat"
      @prompt-change="handlePromptChange"
      @stop-generation="handleStopGeneration"
    />

    <!-- 图表结果面板 -->
    <ChartPanel
      v-else-if="currentMode === 'chart'"
      ref="chartPanelRef"
      :initial-chart-type="currentChartType"
      :initial-text="initialUserText"
      @close="handleChartClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window'
import QuickMenu from '@/components/QuickMenu.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ChartPanel from '@/components/ChartPanel.vue'
import { usePromptsStore } from '@/stores/prompts'
import { useConfigStore } from '@/stores/config'
import { useSettingsStore } from '@/stores/settings'
import type { Prompt, ChartConfig, ChartType } from '@/types'

const promptsStore = usePromptsStore()
const configStore = useConfigStore()
const settingsStore = useSettingsStore()

// 应用主题
function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    root.setAttribute('data-theme', theme)
  }
}

const isLoading = ref(false)
const content = ref('')
const error = ref<string | null>(null)
const isDone = ref(false)

// UI 模式: menu | text | chart
const currentMode = ref<'menu' | 'text' | 'chart'>('menu')
const currentPrompt = ref<Prompt | null>(null)
const currentChartType = ref<ChartType>('mermaid')
const resultPanelRef = ref<InstanceType<typeof ResultPanel>>()
const chartPanelRef = ref<InstanceType<typeof ChartPanel>>()
const initialUserText = ref('')  // 用户最初选中的文本

// 事件监听器
let unlistenChunk: (() => void) | null = null
let unlistenDone: (() => void) | null = null

// 处理选择提示词（文本处理）
async function handleSelect(prompt: Prompt) {
  console.log('=== 选中提示词 ===')
  console.log('提示词:', prompt.name)
  
  // 从后端获取选中的文本
  const text = await invoke<string>('get_stored_text')
  console.log('选中的文本:', text)
  
  if (!text || text.trim() === '') {
    console.log('没有选中文本')
    error.value = '请先选中一些文本'
    currentMode.value = 'text'
    currentPrompt.value = prompt
    initialUserText.value = ''
    await resizeForResult()
    return
  }

  // 保存用户选中的文本
  initialUserText.value = text
  
  // 先调整窗口大小，再切换视图
  console.log('[MainView] 准备调整窗口大小')
  await resizeForResult()
  
  // 显示结果面板
  currentPrompt.value = prompt
  currentMode.value = 'text'
  console.log('[MainView] 已切换到文本模式')
  
  // 生成完整的提示词
  const fullPrompt = prompt.prompt.replace('{text}', text)
  console.log('完整提示词:', fullPrompt.substring(0, 100) + '...')
  
  // 开始 AI 请求（作为单条用户消息）
  await startAIRequest([{ role: 'user', content: fullPrompt }])
}

// 处理选择图表类型
async function handleSelectChart(chart: ChartConfig) {
  console.log('=== 选中图表类型 ===')
  console.log('图表类型:', chart.name)
  
  // 从后端获取选中的文本
  const text = await invoke<string>('get_stored_text')
  console.log('选中的文本:', text)
  
  if (!text || text.trim() === '') {
    console.log('没有选中文本')
    error.value = '请先选中一些文本'
    return
  }

  // 保存用户选中的文本和图表类型
  initialUserText.value = text
  currentChartType.value = chart.id
  
  // 切换到图表模式
  currentMode.value = 'chart'
}

// 调整窗口大小为结果模式
async function resizeForResult() {
  console.log('[MainView] resizeForResult 开始')
  try {
    const window = getCurrentWindow()
    
    // 获取当前窗口大小
    const currentSize = await window.innerSize()
    console.log(`[MainView] 当前窗口大小: ${currentSize.width}x${currentSize.height}`)
    
    // 临时启用 resizable 以允许调整大小
    await window.setResizable(true)
    // 结果面板尺寸 = 内容 800x700 + padding 32 (16*2)
    await window.setSize(new LogicalSize(832, 732))
    // 调整完后禁用 resizable，防止用户手动调整
    await window.setResizable(false)
    
    // 将窗口居中显示
    await invoke('center_window', { width: 832, height: 732 })
    
    // 验证设置后的大小
    const newSize = await window.innerSize()
    console.log(`[MainView] 设置后窗口大小: ${newSize.width}x${newSize.height}`)
  } catch (err) {
    console.error('[MainView] 调整窗口大小失败:', err)
  }
  console.log('[MainView] resizeForResult 完成')
}

// 调整窗口大小为菜单模式
async function resizeForMenu() {
  console.log('[MainView] resizeForMenu 开始')
  try {
    const window = getCurrentWindow()
    // 临时启用 resizable 以允许调整大小
    await window.setResizable(true)
    // 菜单尺寸 = 内容 340x500 + padding 32 (16*2)
    await window.setSize(new LogicalSize(372, 532))
    // 调整完后禁用 resizable，防止用户手动调整
    await window.setResizable(false)
    console.log('[MainView] resizeForMenu 完成: 372x532')
  } catch (err) {
    console.error('[MainView] resizeForMenu 失败:', err)
  }
}

// 开始 AI 请求（支持消息历史）
async function startAIRequest(messages: Array<{ role: string; content: string; images?: string[] }>) {
  // 检查是否有 API 配置
  const activeApi = configStore.activeConfig
  if (!activeApi) {
    error.value = '请先在设置中配置 API（右键点击托盘图标 -> 设置）'
    return
  }

  // 重置状态
  isLoading.value = true
  content.value = ''
  error.value = null
  isDone.value = false

  try {
    // 监听流式响应
    unlistenChunk = await listen<string>('ai-chunk', (event) => {
      content.value += event.payload
    })
    
    unlistenDone = await listen('ai-done', () => {
      console.log('AI 完成')
      isLoading.value = false
      isDone.value = true
      cleanupListeners()
    })

    console.log('开始调用 AI...')
    console.log('使用配置:', activeApi.name)
    console.log('消息数量:', messages.length)

    // 处理消息中的图片：提取纯 Base64 数据
    const processedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      images: msg.images?.map(img => {
        const match = img.match(/^data:image\/\w+;base64,(.+)$/)
        return match ? match[1] : img
      })
    }))

    await invoke('ai_request', {
      endpoint: activeApi.endpoint,
      apiKey: activeApi.apiKey || '',
      model: activeApi.model,
      apiType: activeApi.type,
      messages: processedMessages
    })
  } catch (e) {
    console.error('AI 请求错误:', e)
    error.value = String(e)
    isLoading.value = false
    cleanupListeners()
  }
}

// 处理对话消息（接收完整消息历史）
async function handleSendMessage(messages: Array<{ role: string; content: string; images?: string[] }>, promptId?: string) {
  // 如果有选择提示词，将其作为 system message 加入到消息开头
  let finalMessages = [...messages]
  let usedPrompt: Prompt | null = null

  if (promptId) {
    const prompt = promptsStore.prompts.find(p => p.id === promptId)
    if (prompt && prompt.prompt) {
      usedPrompt = prompt
      // 检查是否已经有 system 消息
      const hasSystem = finalMessages.some(m => m.role === 'system')
      if (!hasSystem) {
        // 将提示词作为 system message 插入到开头
        finalMessages.unshift({
          role: 'system',
          content: prompt.prompt.replace('{text}', '')  // 移除 {text} 占位符
        })
      }
    }
  } else if (currentPrompt.value) {
    // 如果没有传入 promptId，使用当前的提示词
    usedPrompt = currentPrompt.value
    const hasSystem = finalMessages.some(m => m.role === 'system')
    if (!hasSystem && currentPrompt.value.prompt) {
      finalMessages.unshift({
        role: 'system',
        content: currentPrompt.value.prompt.replace('{text}', '')
      })
    }
  }

  // 打印详细的调用日志
  console.log('=== AI 调用详情 ===')
  console.log('使用的提示词:', usedPrompt ? `${usedPrompt.icon} ${usedPrompt.name}` : '无')
  console.log('提示词内容:', usedPrompt?.prompt?.substring(0, 100) + '...')
  console.log('消息历史数量:', finalMessages.length)
  console.log('消息历史:')
  finalMessages.forEach((msg, i) => {
    const preview = msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content
    console.log(`  [${i}] ${msg.role}: ${preview}`)
  })
  console.log('==================')

  await startAIRequest(finalMessages)
}

// 处理提示词变化（同步更新左上角标题）
function handlePromptChange(prompt: Prompt) {
  console.log('提示词变化:', prompt.name)
  currentPrompt.value = prompt
}

// 清理监听器
function cleanupListeners() {
  if (unlistenChunk) {
    unlistenChunk()
    unlistenChunk = null
  }
  if (unlistenDone) {
    unlistenDone()
    unlistenDone = null
  }
}

// 关闭菜单
async function handleClose() {
  await resizeForMenu()  // 先调整大小
  await invoke('hide_window')
  resetAll()
}

// 关闭文本结果面板
async function handleResultClose() {
  cleanupListeners()
  await resizeForMenu()  // 先调整大小
  await invoke('hide_window')
  resetAll()
}

// 关闭图表面板
async function handleChartClose() {
  await resizeForMenu()  // 先调整大小
  await invoke('hide_window')
  resetAll()
}

// 重置所有状态
function resetAll() {
  currentMode.value = 'menu'
  currentPrompt.value = null
  content.value = ''
  error.value = null
  isDone.value = false
  isLoading.value = false
  initialUserText.value = ''
  if (resultPanelRef.value) {
    resultPanelRef.value.reset()
  }
  if (chartPanelRef.value) {
    chartPanelRef.value.reset()
  }
}

// 重试
async function handleRetry() {
  if (currentPrompt.value) {
    const text = await invoke<string>('get_stored_text')
    if (text) {
      const fullPrompt = currentPrompt.value.prompt.replace('{text}', text)
      await startAIRequest([{ role: 'user', content: fullPrompt }])
    }
  }
}

// 插入文本（后置插入）
async function handleInsert(text: string) {
  try {
    await invoke('insert_text', { text })
    // 窗口已在后端关闭，这里只需重置状态
    resetAll()
    await resizeForMenu()
  } catch (err) {
    console.error('后置插入失败:', err)
    error.value = String(err)
  }
}

// 前置插入文本
async function handleInsertBefore(text: string) {
  try {
    await invoke('insert_text_before', { text })
    // 窗口已在后端关闭，这里只需重置状态
    resetAll()
    await resizeForMenu()
  } catch (err) {
    console.error('前置插入失败:', err)
    error.value = String(err)
  }
}

// 替换文本（实际替换到编辑器）
async function handleReplaceText(text: string) {
  try {
    await invoke('replace_text', { text })
    // 窗口已在后端关闭，这里只需重置状态
    resetAll()
    await resizeForMenu()
  } catch (err) {
    console.error('替换失败:', err)
    error.value = String(err)
  }
}

// 切换到结果模式（从对话模式）
function handleSwitchToResult(text: string) {
  content.value = text
  isDone.value = true
  isLoading.value = false
}

// 新对话
function handleNewChat() {
  content.value = ''
  error.value = null
  isDone.value = false
  isLoading.value = false
  initialUserText.value = ''
}

// 停止生成
async function handleStopGeneration() {
  try {
    await invoke('ai_cancel')
    isLoading.value = false
    isDone.value = true
    cleanupListeners()
  } catch (err) {
    console.error('停止生成失败:', err)
  }
}

// 窗口刚打开时的保护期，防止立即关闭
let windowJustOpened = false
// 窗口是否曾经获得过焦点（用于判断是否是首次失焦）
let windowHadFocus = false
// 是否正在拖拽窗口
let isDragging = false

// 监听窗口事件
async function setupWindowListeners() {
  const currentWindow = getCurrentWindow()
  
  // 监听窗口移动事件（拖拽时会触发）
  await currentWindow.onMoved(() => {
    // 标记正在拖拽
    isDragging = true
    // 拖拽结束后重置标记
    setTimeout(() => {
      isDragging = false
    }, 200)
  })
  
  await currentWindow.onFocusChanged(({ payload: focused }) => {
    console.log('焦点变化:', focused, '保护期:', windowJustOpened, '曾获焦点:', windowHadFocus, '拖拽中:', isDragging, '当前模式:', currentMode.value)
    
    if (focused) {
      // 窗口获得焦点，标记为已获得过焦点
      windowHadFocus = true
    } else {
      // 窗口失去焦点
      // 只有在以下条件都满足时才自动关闭：
      // 1. 在菜单模式
      // 2. 不在加载中
      // 3. 不在保护期内
      // 4. 窗口曾经获得过焦点（排除窗口刚打开就失焦的情况）
      // 5. 不在拖拽中
      if (currentMode.value === 'menu' && !isLoading.value && !windowJustOpened && windowHadFocus && !isDragging) {
        handleClose()
      }
    }
  })
}

// ESC 键关闭
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (currentMode.value === 'text') {
      handleResultClose()
    } else if (currentMode.value === 'chart') {
      handleChartClose()
    } else {
      handleClose()
    }
  }
}

onMounted(async () => {
  // 加载设置并应用主题
  await settingsStore.loadSettings()
  applyTheme(settingsStore.settings.theme)
  
  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settingsStore.settings.theme === 'system') {
      applyTheme('system')
    }
  })

  // 加载配置
  await configStore.loadApiConfigs()
  await promptsStore.loadPrompts()
  await promptsStore.initListener()
  await setupWindowListeners()
  window.addEventListener('keydown', handleKeydown)

  await listen('selected-text', async () => {
    if (!isLoading.value) {
      console.log('[MainView] selected-text 事件触发')
      // 设置窗口刚打开的保护期
      windowJustOpened = true
      // 重置焦点状态
      windowHadFocus = false
      
      // 先调整窗口大小，再重置状态
      await resizeForMenu()
      resetAll()
      
      // 每次显示窗口时重新加载配置、提示词和主题
      await configStore.loadApiConfigs()
      await promptsStore.loadPrompts()
      await settingsStore.loadSettings()
      applyTheme(settingsStore.settings.theme)
      
      // 500ms 后取消保护期（增加保护时间）
      setTimeout(() => {
        windowJustOpened = false
      }, 500)
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  cleanupListeners()
})
</script>

<style scoped>
/*
 * 主视图容器 - 干净的圆角方案
 */
.main-view {
  width: 100%;
  height: 100%;
  background: var(--bg-primary);
  border-radius: 12px;
  overflow: hidden;
  
  /* 
   * 精致的阴影效果 - 可选方案：
   * 
   * 方案 A: 完全无阴影（边缘锐利）
   * box-shadow: none;
   * border: 1px solid rgba(0, 0, 0, 0.1);
   * 
   * 方案 B: 轻微阴影（当前使用）
   */
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 1px 3px rgba(0, 0, 0, 0.06);
  
  /* 可选：添加细边框增强边缘清晰度 */
  border: 1px solid rgba(0, 0, 0, 0.06);
}

/* 暗色主题下的阴影和边框 */
[data-theme="dark"] .main-view {
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.3),
    0 1px 3px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
