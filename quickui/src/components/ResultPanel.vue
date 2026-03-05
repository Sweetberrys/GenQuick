<template>
  <div class="result-panel" :class="{ 'dialog-mode': isDialogMode }">
    <!-- 标题栏 -->
    <div class="header">
      <div class="header-drag-area" data-tauri-drag-region>
        <SvgIcon :name="currentPrompt?.icon || 'sparkles'" :size="16" class="header-icon" />
        <span class="title">{{ currentPrompt?.name }}</span>
      </div>
      
      <!-- 新对话按钮 + 模式切换 -->
      <div class="header-controls">
        <button class="new-chat-btn" @click="handleNewChat" title="新对话">
          <SvgIcon name="plus" :size="14" />
          <span>新对话</span>
        </button>
        <div class="mode-switcher">
          <button 
            class="mode-btn" 
            :class="{ active: !isDialogMode }"
            @click="switchToResultMode"
            title="结果模式"
          >结果</button>
          <button 
            class="mode-btn" 
            :class="{ active: isDialogMode }"
            @click="switchToDialogMode"
            :disabled="!hasContent"
            title="对话模式"
          >对话</button>
        </div>
      </div>
      
      <div class="actions">
        <WindowControls @close="handleClose" />
      </div>
    </div>

    <!-- 内容区 -->
    <div class="content" ref="contentRef">
      <!-- 对话模式 -->
      <ChatSession
        v-show="isDialogMode"
        ref="chatSessionRef"
        :prompts="availablePrompts"
        :is-loading="isLoading"
        :current-stream-content="currentStreamContent"
        :initial-prompt="currentPrompt"
        @send-message="handleChatMessage"
        @insert="handleInsertMessage"
        @insert-before="handleInsertBeforeMessage"
        @replace="handleReplaceMessage"
        @prompt-change="handlePromptChange"
        @stop-generation="handleStopGeneration"
      />

      <!-- 结果模式：只显示最新 AI 回复 -->
      <div v-show="!isDialogMode" class="result-container">
        <div v-if="isLoading && !content" class="loading">
          <div class="spinner"></div>
          <span>AI 正在思考...</span>
        </div>

        <div v-else-if="error" class="error">
          <SvgIcon name="error" :size="32" class="error-icon" />
          <span class="error-text">{{ error }}</span>
          <button class="retry-btn" @click="handleRetry">
            <SvgIcon name="retry" :size="14" />
            <span>重试</span>
          </button>
        </div>

        <template v-else>
          <div class="view-toggle">
            <button 
              class="toggle-btn" 
              :class="{ active: !isEditMode }"
              @click="isEditMode = false"
            >预览</button>
            <button 
              class="toggle-btn" 
              :class="{ active: isEditMode }"
              @click="isEditMode = true"
            >编辑</button>
          </div>
          
          <div 
            v-if="!isEditMode" 
            class="text-content markdown-body selectable"
            v-html="renderedContent"
          ></div>
          
          <textarea 
            v-else
            v-model="editableContent" 
            class="text-content editable"
          ></textarea>
        </template>
      </div>
    </div>

    <!-- 操作栏 -->
    <div v-if="!isDialogMode" class="footer">
      <button class="btn secondary" @click="handleCopy" :disabled="!hasContent || isLoading">
        <SvgIcon name="copy" :size="14" />
        <span>复制</span>
      </button>
      <button class="btn secondary" @click="handleReplace" :disabled="!hasContent || isLoading">
        <SvgIcon name="replace" :size="14" />
        <span>替换</span>
      </button>
      <button class="btn secondary" @click="handleInsertBefore" :disabled="!hasContent || isLoading">
        <SvgIcon name="insert-before" :size="14" />
        <span>前置插入</span>
      </button>
      <button class="btn secondary" @click="handleInsert" :disabled="!hasContent || isLoading">
        <SvgIcon name="insert-after" :size="14" />
        <span>后置插入</span>
      </button>
    </div>

    <!-- 状态栏 -->
    <div class="status">
      <span>字数：{{ contentLength }}</span>
      <span v-if="isLoading" class="status-loading">
        <SvgIcon name="loader" :size="10" class="loading-icon" />
        生成中
      </span>
      <span v-else-if="isDone" class="status-done">
        <SvgIcon name="check" :size="10" />
        完成
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, computed } from 'vue'
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window'
import { marked } from 'marked'
import hljs from 'highlight.js'
import ChatSession from './ChatSession.vue'
import SvgIcon from './icons/SvgIcon.vue'
import WindowControls from './WindowControls.vue'
import { usePromptsStore } from '@/stores/prompts'
import type { Prompt } from '@/types'

marked.setOptions({ breaks: true, gfm: true })

const renderer = new marked.Renderer()
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
  const highlighted = hljs.highlight(text, { language }).value
  return `<pre class="hljs"><code class="language-${language}">${highlighted}</code></pre>`
}
marked.use({ renderer })

const promptsStore = usePromptsStore()

const props = defineProps<{
  currentPrompt: Prompt | null
  content: string
  isLoading: boolean
  isDone: boolean
  error: string | null
  initialUserText?: string  // 用户最初选中的文本
}>()

const emit = defineEmits<{
  close: []
  retry: []
  insert: [text: string]
  insertBefore: [text: string]
  replace: [text: string]
  sendMessage: [messages: Array<{ role: string; content: string; images?: string[] }>, promptId?: string]
  switchToResult: [text: string]
  newChat: []
  promptChange: [prompt: Prompt]  // 提示词变化事件
  stopGeneration: []  // 停止生成事件
}>()

const chatSessionRef = ref<InstanceType<typeof ChatSession>>()
const isDialogMode = ref(false)
const currentStreamContent = ref('')
const editableContent = ref('')
const isEditMode = ref(false)
const initializedDialog = ref(false)  // 标记是否已初始化对话历史

const availablePrompts = computed(() => promptsStore.prompts)

const renderedContent = computed(() => {
  try {
    return marked.parse(editableContent.value) as string
  } catch {
    return editableContent.value
  }
})

const hasContent = computed(() => {
  if (isDialogMode.value) {
    return (chatSessionRef.value?.messages?.length ?? 0) > 0
  }
  return !!props.content
})

const contentLength = computed(() => {
  if (isDialogMode.value) {
    const messages = chatSessionRef.value?.messages || []
    const lastMsg = messages[messages.length - 1]
    return lastMsg?.role === 'assistant' ? lastMsg.content.length : 0
  }
  return editableContent.value.length
})

// 新对话
async function handleNewChat() {
  // 获取当前选中的提示词（用户在对话中选择的，或继承当前的）
  const inheritPrompt = chatSessionRef.value?.selectedPrompt || props.currentPrompt
  
  // 清空对话历史
  if (chatSessionRef.value) {
    chatSessionRef.value.newChat(inheritPrompt)
  }
  
  // 重置状态
  currentStreamContent.value = ''
  editableContent.value = ''
  initializedDialog.value = false
  
  // 切换到对话模式
  isDialogMode.value = true
  
  emit('newChat')
  
  await nextTick()
  await resizeWindow(800, 700)
}

// 切换到对话模式
async function switchToDialogMode() {
  if (!hasContent.value) return
  
  // 首次进入对话模式时，初始化完整的对话历史
  if (!initializedDialog.value && chatSessionRef.value) {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []
    
    // 添加用户最初选中的文本作为第一条用户消息
    if (props.initialUserText) {
      messages.push({ role: 'user', content: props.initialUserText })
    }
    
    // 添加 AI 的回复
    if (props.content) {
      messages.push({ role: 'assistant', content: props.content })
    }
    
    if (messages.length > 0) {
      chatSessionRef.value.initMessages(messages)
      initializedDialog.value = true
    }
  }
  
  isDialogMode.value = true
  await nextTick()
  await resizeWindow(800, 700)
}

// 切换到结果模式：只显示最新 AI 回复
async function switchToResultMode() {
  if (isDialogMode.value && chatSessionRef.value) {
    // 获取最新的 AI 回复
    const latestContent = chatSessionRef.value.latestAssistantContent
    if (latestContent) {
      editableContent.value = latestContent
    }
  }
  
  isDialogMode.value = false
  await nextTick()
  await resizeWindow(800, 700)
}

function handleChatMessage(messages: Array<{ role: string; content: string; images?: string[] }>, promptId?: string) {
  currentStreamContent.value = ''
  emit('sendMessage', messages, promptId)
}

// 处理提示词变化
function handlePromptChange(prompt: Prompt) {
  emit('promptChange', prompt)
}

// 处理停止生成
function handleStopGeneration() {
  emit('stopGeneration')
}

async function resizeWindow(width: number, height: number) {
  // 窗口尺寸 = 内容尺寸 + 24px (12px padding * 2 用于阴影空间)
  const actualWidth = width + 24
  const actualHeight = height + 24
  try {
    console.log(`[ResultPanel] 调整窗口大小: ${actualWidth}x${actualHeight}`)
    const appWindow = getCurrentWindow()
    
    // 获取当前窗口大小
    const currentSize = await appWindow.innerSize()
    console.log(`[ResultPanel] 当前窗口大小: ${currentSize.width}x${currentSize.height}`)
    
    // 临时启用 resizable 以允许调整大小
    await appWindow.setResizable(true)
    await appWindow.setSize(new LogicalSize(actualWidth, actualHeight))
    // 调整完后禁用 resizable，防止用户手动调整
    await appWindow.setResizable(false)
    
    // 验证设置后的大小
    const newSize = await appWindow.innerSize()
    console.log(`[ResultPanel] 设置后窗口大小: ${newSize.width}x${newSize.height}`)
  } catch (err) {
    console.error('[ResultPanel] 调整窗口大小失败:', err)
  }
}

// 监听内容变化
watch(() => props.content, (newContent) => {
  if (isDialogMode.value && props.isLoading) {
    currentStreamContent.value = newContent
  } else if (!isDialogMode.value) {
    editableContent.value = newContent
  }
}, { immediate: true })

// 监听加载完成
watch(() => props.isDone, (done) => {
  if (done && isDialogMode.value && currentStreamContent.value) {
    currentStreamContent.value = ''
  }
})

onMounted(async () => {
  console.log('[ResultPanel] 组件已挂载')
  // 窗口大小调整已在 MainView 的 resizeForResult 中处理，这里不再重复调整
})

function handleInsertMessage(text: string) {
  emit('insert', text)
}

function handleInsertBeforeMessage(text: string) {
  emit('insertBefore', text)
}

function handleReplaceMessage(text: string) {
  emit('replace', text)
}

async function handleCopy() {
  try {
    const { writeText } = await import('@tauri-apps/plugin-clipboard-manager')
    await writeText(editableContent.value)
  } catch (err) {
    console.error('复制失败:', err)
  }
}

function handleInsert() {
  emit('insert', editableContent.value)
}

function handleInsertBefore() {
  emit('insertBefore', editableContent.value)
}

function handleReplace() {
  emit('replace', editableContent.value)
}

async function handleClose() {
  if (props.isLoading) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('ai_cancel')
    } catch (err) {
      console.error('停止AI对话失败:', err)
    }
  }
  emit('close')
}

function handleRetry() {
  emit('retry')
}

function reset() {
  isDialogMode.value = false
  currentStreamContent.value = ''
  editableContent.value = ''
  isEditMode.value = false
  initializedDialog.value = false
  if (chatSessionRef.value) {
    chatSessionRef.value.reset()
  }
}

defineExpose({ reset, resizeWindow })
</script>

<style scoped lang="scss">
@use '@/styles/result-panel.scss' as *;
</style>
