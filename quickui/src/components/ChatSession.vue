<template>
  <div class="chat-session">
    <!-- 消息列表 -->
    <div class="messages" ref="messagesRef">
      <div v-for="(msg, index) in messages" :key="index" class="message" :class="msg.role">
        <!-- 用户消息 -->
        <div v-if="msg.role === 'user'" class="message-wrapper">
          <div v-if="editingMessageIndex === index" class="message-edit wide">
            <!-- 编辑时的图片预览 -->
            <div v-if="editingImages.length > 0" class="edit-image-preview-container">
              <div v-for="(img, i) in editingImages" :key="i" class="image-preview">
                <img :src="img" alt="预览" />
                <button class="remove-image" @click="removeEditImage(i)">
                  <SvgIcon name="close" :size="12" />
                </button>
              </div>
            </div>
            <textarea 
              v-model="editingContent" 
              class="edit-textarea"
              @keydown.enter.ctrl="saveEdit(index)"
              @keydown.esc="cancelEdit"
            ></textarea>
            <input 
              type="file" 
              ref="editFileInputRef" 
              accept="image/*" 
              multiple
              style="display: none"
              @change="handleEditFileSelect"
            />
            <div class="edit-actions">
              <button class="edit-btn upload" @click="triggerEditFileInput" title="上传图片">
                <SvgIcon name="attachment" :size="16" />
              </button>
              <button class="edit-btn cancel" @click="cancelEdit">取消</button>
              <button class="edit-btn save" @click="saveEdit(index)">发送</button>
            </div>
          </div>
          <div v-else class="message-content">
            <div v-if="msg.images && msg.images.length > 0" class="message-images">
              <img v-for="(img, i) in msg.images" :key="i" :src="img" class="message-image" />
            </div>
            <div class="message-text selectable">{{ msg.content }}</div>
          </div>
          <div v-if="editingMessageIndex !== index" class="action-bar user-action-bar">
            <button class="action-btn" @click="startEdit(index, msg.content)" title="编辑">
              <SvgIcon name="edit" />
            </button>
            <button class="action-btn" @click="handleCopyMessage(msg.content)" title="复制">
              <SvgIcon name="copy" />
            </button>
            <button class="action-btn delete" @click="handleDeleteMessage(index)" title="删除">
              <SvgIcon name="trash" />
            </button>
          </div>
        </div>

        <!-- AI 消息 -->
        <div v-else class="message-wrapper">
          <div class="message-content">
            <div class="message-text markdown-body selectable" v-html="renderMarkdown(msg.content)"></div>
          </div>
          <div class="action-bar">
            <button class="action-btn" @click="handleCopyMessage(msg.content)" title="复制">
              <SvgIcon name="copy" />
            </button>
            <button class="action-btn" @click="$emit('insertBefore', msg.content)" title="前置插入">
              <SvgIcon name="insert-before" />
            </button>
            <button class="action-btn" @click="$emit('insert', msg.content)" title="后置插入">
              <SvgIcon name="insert-after" />
            </button>
            <button class="action-btn" @click="$emit('replace', msg.content)" title="替换">
              <SvgIcon name="replace" />
            </button>
            <button class="action-btn" @click="handleRetryMessage(index)" title="重试">
              <SvgIcon name="retry" />
            </button>
            <button class="action-btn delete" @click="handleDeleteMessage(index)" title="删除">
              <SvgIcon name="trash" />
            </button>
          </div>
        </div>
      </div>
      
      <!-- 流式输出中的消息 -->
      <div v-if="isLoading && currentStreamContent" class="message assistant">
        <div class="message-wrapper">
          <div class="message-content">
            <div class="message-text markdown-body selectable" v-html="renderMarkdown(currentStreamContent)"></div>
            <span class="cursor">|</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="input-area">
      <div class="input-container">
        <div class="input-wrapper">
          <!-- 图片预览 -->
          <div v-if="uploadedImages.length > 0" class="image-preview-container">
            <div v-for="(img, index) in uploadedImages" :key="index" class="image-preview">
              <img :src="img" alt="预览" />
              <button class="remove-image" @click="removeImage(index)">
                <SvgIcon name="close" :size="12" />
              </button>
            </div>
          </div>

          <!-- 输入框 -->
          <textarea 
            v-model="userInput" 
            placeholder="询问任何问题，创造任何事物"
            @keydown.enter.exact.prevent="handleSendMessage"
            @keydown.shift.enter.exact="handleNewLine"
            :disabled="isLoading"
            ref="inputRef"
          ></textarea>

          <!-- 工具栏 -->
          <div class="input-toolbar">
            <div class="toolbar-left">
              <!-- 提示词选择器 -->
              <div class="prompt-selector">
                <button class="prompt-btn" @click="showPromptMenu = !showPromptMenu">
                  <SvgIcon :name="selectedPrompt?.icon || 'sparkles'" :size="14" class="prompt-icon" />
                  <span class="prompt-name">{{ selectedPrompt?.name || '选择提示词' }}</span>
                  <SvgIcon name="chevron-down" :size="12" class="arrow-icon" />
                </button>
                
                <div v-if="showPromptMenu" class="prompt-menu">
                  <div class="prompt-menu-header">选择提示词</div>
                  <div class="prompt-menu-list">
                    <div 
                      v-for="prompt in prompts" 
                      :key="prompt.id"
                      class="prompt-menu-item"
                      :class="{ active: selectedPrompt?.id === prompt.id }"
                      @click="selectPrompt(prompt)"
                    >
                      <SvgIcon :name="prompt.icon" :size="14" class="prompt-icon" />
                      <span class="prompt-name">{{ prompt.name }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <input 
                type="file" 
                ref="fileInputRef" 
                accept="image/*" 
                multiple
                style="display: none"
                @change="handleFileSelect"
              />
              <button class="tool-btn" @click="triggerFileInput" title="上传图片">
                <SvgIcon name="attachment" :size="18" />
              </button>
            </div>
            <div class="toolbar-right">
              <button 
                v-if="!isLoading"
                class="send-btn" 
                @click="handleSendMessage"
                :disabled="!canSend"
              >
                发送
              </button>
              <button 
                v-else
                class="stop-btn" 
                @click="handleStopGeneration"
              >
                <SvgIcon name="stop" :size="14" />
                <span>停止</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { marked } from 'marked'
import hljs from 'highlight.js'
import SvgIcon from './icons/SvgIcon.vue'
import { processImage } from '@/utils/imageProcessor'
import type { Prompt } from '@/types'

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true
})

const renderer = new marked.Renderer()
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
  const highlighted = hljs.highlight(text, { language }).value
  return `<pre class="hljs"><code class="language-${language}">${highlighted}</code></pre>`
}
marked.use({ renderer })

function renderMarkdown(content: string): string {
  try {
    return marked.parse(content) as string
  } catch {
    return content
  }
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  images?: string[]
}

const props = defineProps<{
  prompts: Prompt[]
  isLoading: boolean
  currentStreamContent: string
  initialPrompt?: Prompt | null
}>()

const emit = defineEmits<{
  sendMessage: [messages: Message[], promptId?: string]
  insert: [text: string]
  insertBefore: [text: string]
  replace: [text: string]
  promptChange: [prompt: Prompt]  // 提示词变化事件
  stopGeneration: []  // 停止生成事件
}>()

const messagesRef = ref<HTMLElement>()
const inputRef = ref<HTMLTextAreaElement>()
const fileInputRef = ref<HTMLInputElement>()
const editFileInputRef = ref<HTMLInputElement>()

const messages = ref<Message[]>([])
const userInput = ref('')
const uploadedImages = ref<string[]>([])
const editingMessageIndex = ref<number | null>(null)
const editingContent = ref('')
const editingImages = ref<string[]>([])  // 编辑时的图片
const showPromptMenu = ref(false)
const selectedPrompt = ref<Prompt | null>(null)

const canSend = computed(() => {
  return (userInput.value.trim() || uploadedImages.value.length > 0) && !props.isLoading
})

// 获取最新的 AI 回复
const latestAssistantContent = computed(() => {
  const assistantMessages = messages.value.filter(m => m.role === 'assistant')
  return assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1].content : ''
})

// 初始化时继承提示词
watch(() => props.initialPrompt, (prompt) => {
  if (prompt && !selectedPrompt.value) {
    selectedPrompt.value = prompt
  }
}, { immediate: true })

function selectPrompt(prompt: Prompt) {
  selectedPrompt.value = prompt
  showPromptMenu.value = false
  // 通知父组件提示词变化
  emit('promptChange', prompt)
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files) return

  for (const file of Array.from(files)) {
    try {
      const processedBase64 = await processImage(file, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.8
      })
      uploadedImages.value.push(processedBase64)
    } catch (err) {
      console.error('图片处理失败:', err)
    }
  }
  target.value = ''
}

function removeImage(index: number) {
  uploadedImages.value.splice(index, 1)
}

function handleSendMessage() {
  if (!canSend.value) return
  
  const message = userInput.value.trim()
  const images = [...uploadedImages.value]
  
  // 添加用户消息到历史
  messages.value.push({ 
    role: 'user', 
    content: message || '(图片)',
    images: images.length > 0 ? images : undefined
  })
  
  userInput.value = ''
  uploadedImages.value = []
  
  nextTick(() => {
    scrollToBottom()
    inputRef.value?.focus()
  })
  
  // 发送完整的消息历史
  emit('sendMessage', [...messages.value], selectedPrompt.value?.id)
}

function handleNewLine(e: KeyboardEvent) {
  e.preventDefault()
  const textarea = e.target as HTMLTextAreaElement
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  userInput.value = userInput.value.substring(0, start) + '\n' + userInput.value.substring(end)
  nextTick(() => {
    textarea.selectionStart = textarea.selectionEnd = start + 1
  })
}

// 停止生成
function handleStopGeneration() {
  emit('stopGeneration')
}

async function handleCopyMessage(text: string) {
  await writeText(text)
}

function startEdit(index: number, content: string) {
  editingMessageIndex.value = index
  editingContent.value = content
  // 复制原消息的图片
  editingImages.value = messages.value[index].images ? [...messages.value[index].images!] : []
}

function cancelEdit() {
  editingMessageIndex.value = null
  editingContent.value = ''
  editingImages.value = []
}

// 编辑时触发文件选择
function triggerEditFileInput() {
  editFileInputRef.value?.click()
}

// 编辑时处理文件选择
async function handleEditFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files) return

  for (const file of Array.from(files)) {
    try {
      const processedBase64 = await processImage(file, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.8
      })
      editingImages.value.push(processedBase64)
    } catch (err) {
      console.error('图片处理失败:', err)
    }
  }
  target.value = ''
}

// 编辑时移除图片
function removeEditImage(index: number) {
  editingImages.value.splice(index, 1)
}

function saveEdit(index: number) {
  if (!editingContent.value.trim() && editingImages.value.length === 0) return
  
  messages.value[index].content = editingContent.value.trim() || '(图片)'
  messages.value[index].images = editingImages.value.length > 0 ? [...editingImages.value] : undefined
  messages.value = messages.value.slice(0, index + 1)
  
  cancelEdit()
  
  // 发送完整的消息历史
  emit('sendMessage', [...messages.value], selectedPrompt.value?.id)
  
  nextTick(() => scrollToBottom())
}

function handleRetryMessage(index: number) {
  const userMsgIndex = index - 1
  if (userMsgIndex >= 0 && messages.value[userMsgIndex].role === 'user') {
    // 截断到要重试的位置
    messages.value = messages.value.slice(0, index)
    // 发送完整的消息历史
    emit('sendMessage', [...messages.value], selectedPrompt.value?.id)
    nextTick(() => scrollToBottom())
  }
}

// 删除消息（只删除单条）
function handleDeleteMessage(index: number) {
  messages.value.splice(index, 1)
}

function scrollToBottom() {
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

// 监听流式内容完成
watch(() => props.currentStreamContent, (newContent, oldContent) => {
  if (oldContent && !newContent && props.isLoading === false) {
    if (oldContent) {
      messages.value.push({ role: 'assistant', content: oldContent })
      nextTick(() => scrollToBottom())
    }
  }
})

// 初始化消息（从外部设置）
function initMessages(initialMessages: Message[]) {
  messages.value = [...initialMessages]
  nextTick(() => scrollToBottom())
}

// 添加消息
function addMessage(msg: Message) {
  messages.value.push(msg)
  nextTick(() => scrollToBottom())
}

// 新对话
function newChat(inheritPrompt?: Prompt | null) {
  messages.value = []
  userInput.value = ''
  uploadedImages.value = []
  editingMessageIndex.value = null
  editingContent.value = ''
  // 如果传入了提示词则使用，否则保持当前选择
  if (inheritPrompt !== undefined) {
    selectedPrompt.value = inheritPrompt
  }
}

function reset() {
  messages.value = []
  userInput.value = ''
  uploadedImages.value = []
  selectedPrompt.value = null
  editingMessageIndex.value = null
  editingContent.value = ''
}

defineExpose({ 
  reset, 
  messages, 
  initMessages, 
  addMessage, 
  newChat,
  latestAssistantContent,
  selectedPrompt
})
</script>

<style scoped lang="scss">
@use '../styles/chat-session.scss' as *;
</style>
