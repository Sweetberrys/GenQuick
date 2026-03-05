<template>
  <div class="custom-prompts-manager" :class="{ 'compact-mode': !isWideScreen }" ref="containerRef">
    <!-- 左侧边栏 - 仅在宽屏时显示 -->
    <aside class="pm-sidebar" v-if="isWideScreen">
      <!-- 搜索框 -->
      <div class="pm-search-wrapper">
        <div class="pm-search-box">
          <SvgIcon name="search" :size="16" />
          <input 
            type="text" 
            v-model="searchQuery"
            placeholder="搜索提示词..."
          >
        </div>
      </div>

      <!-- 目录树 -->
      <div class="pm-tree-wrapper" v-show="!searchQuery">
        <TreeNode 
          :folder="null"
          :level="1"
          :current-folder-id="currentFolderId"
          :collapsed-folders="collapsedFolders"
          @select="selectFolder"
          @toggle="toggleFolder"
          @edit="editFolder"
          @delete="confirmDeleteFolder"
        />
      </div>

      <!-- 搜索结果 -->
      <div class="pm-search-results" v-show="searchQuery">
        <div v-if="searchResults.length === 0" class="pm-empty-search">
          <SvgIcon name="search" :size="32" />
          <span>未找到相关提示词</span>
        </div>
        <div 
          v-for="prompt in searchResults" 
          :key="prompt.id"
          class="pm-search-item"
          @click="editPrompt(prompt)"
        >
          <div class="pm-search-icon">
            <SvgIcon name="file" :size="16" />
          </div>
          <div class="pm-search-info">
            <div class="pm-search-name" v-html="highlightText(prompt.name)"></div>
            <div class="pm-search-path">{{ getPromptPath(prompt) }}</div>
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="pm-sidebar-footer">
        <button class="pm-new-btn" @click="showFolderModal = true">
          <SvgIcon name="plus" :size="14" />
          新建文件夹
        </button>
        <button class="pm-new-btn" @click="showNewPromptModal">
          <SvgIcon name="plus" :size="14" />
          新建提示词
        </button>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="pm-main">
      <!-- 面包屑导航 - 仅在宽屏时显示 -->
      <div class="pm-breadcrumb" v-if="isWideScreen">
        <div 
          class="pm-breadcrumb-item"
          :class="{ active: currentFolderId === null }"
          @click="currentFolderId = null"
        >
          <SvgIcon name="home" :size="16" />
          全部提示词
        </div>
        <template v-for="(folder, index) in currentPath" :key="folder.id">
          <span class="pm-breadcrumb-separator">/</span>
          <div 
            class="pm-breadcrumb-item"
            :class="{ active: index === currentPath.length - 1 }"
            @click="currentFolderId = folder.id"
          >
            {{ folder.name }}
          </div>
        </template>
      </div>

      <!-- 工具栏 -->
      <div class="pm-toolbar">
        <div class="pm-toolbar-left">
          <h1 class="pm-folder-title">{{ currentFolderName }}</h1>
          <span class="pm-prompt-count">
            {{ currentPrompts.length }} 个提示词 · {{ currentChildFolders.length }} 个文件夹
          </span>
        </div>
        <div class="pm-toolbar-right">
          <!-- 紧凑模式下的搜索框 -->
          <div class="pm-compact-search" v-if="!isWideScreen">
            <SvgIcon name="search" :size="14" />
            <input 
              type="text" 
              v-model="searchQuery"
              placeholder="搜索..."
            >
          </div>
          <!-- 排序按钮 -->
          <div class="pm-dropdown-wrapper">
            <button class="pm-toolbar-btn" @click="showSortDropdown = !showSortDropdown">
              <SvgIcon name="sort" :size="16" />
              <span v-if="isWideScreen">排序</span>
            </button>
            <div class="pm-dropdown" v-show="showSortDropdown">
              <div 
                class="pm-dropdown-item" 
                :class="{ active: sortBy === 'time-desc' }"
                @click="setSortBy('time-desc')"
              >
                时间降序（最新优先）
              </div>
              <div 
                class="pm-dropdown-item"
                :class="{ active: sortBy === 'time-asc' }"
                @click="setSortBy('time-asc')"
              >
                时间升序（最早优先）
              </div>
              <div 
                class="pm-dropdown-item"
                :class="{ active: sortBy === 'name-asc' }"
                @click="setSortBy('name-asc')"
              >
                名称 A-Z
              </div>
              <div 
                class="pm-dropdown-item"
                :class="{ active: sortBy === 'name-desc' }"
                @click="setSortBy('name-desc')"
              >
                名称 Z-A
              </div>
            </div>
          </div>
          <!-- 视图切换 -->
          <div class="pm-dropdown-wrapper">
            <button class="pm-toolbar-btn" @click="showViewDropdown = !showViewDropdown">
              <SvgIcon :name="viewMode === 'grid' ? 'grid' : 'list'" :size="16" />
              <span v-if="isWideScreen">{{ viewMode === 'grid' ? '网格' : '列表' }}</span>
            </button>
            <div class="pm-dropdown" v-show="showViewDropdown">
              <div 
                class="pm-dropdown-item"
                :class="{ active: viewMode === 'grid' }"
                @click="setViewMode('grid')"
              >
                <SvgIcon name="grid" :size="16" />
                网格视图
              </div>
              <div 
                class="pm-dropdown-item"
                :class="{ active: viewMode === 'list' }"
                @click="setViewMode('list')"
              >
                <SvgIcon name="list" :size="16" />
                列表视图
              </div>
            </div>
          </div>
          <!-- 新建提示词 -->
          <button class="pm-toolbar-btn primary" @click="showNewPromptModal">
            <SvgIcon name="plus" :size="16" />
            <span v-if="isWideScreen">新建提示词</span>
          </button>
        </div>
      </div>

      <!-- 内容网格 -->
      <div class="pm-content-grid" :class="{ 'list-view': actualViewMode === 'list' }">
        <!-- 空状态 -->
        <div v-if="currentChildFolders.length === 0 && displayPrompts.length === 0" class="pm-empty-state">
          <div class="pm-empty-icon">
            <SvgIcon name="folder" :size="32" />
          </div>
          <div class="pm-empty-text">{{ searchQuery ? '未找到相关提示词' : '文件夹为空，开始创建提示词吧' }}</div>
          <button v-if="!searchQuery" class="pm-btn primary" @click="showNewPromptModal">
            <SvgIcon name="plus" :size="16" />
            新建提示词
          </button>
        </div>

        <!-- 文件夹卡片 - 仅在非搜索模式下显示 -->
        <template v-if="!searchQuery">
          <div 
            v-for="folder in currentChildFolders" 
            :key="folder.id"
            class="pm-folder-card"
            @click="selectFolder(folder.id)"
          >
            <div class="pm-folder-card-icon">
              <SvgIcon name="folder" :size="24" />
            </div>
            <div class="pm-folder-card-info">
              <div class="pm-folder-card-name">{{ folder.name }}</div>
              <div class="pm-folder-card-count">{{ promptsStore.getTotalPromptCount(folder.id) }} 个提示词</div>
            </div>
            <button class="pm-folder-card-menu" @click.stop="showFolderContextMenu($event, folder)">
              <SvgIcon name="more" :size="16" />
            </button>
            <SvgIcon name="chevron-right" :size="20" class="pm-folder-card-arrow" />
          </div>
        </template>

        <!-- 提示词卡片 -->
        <div 
          v-for="prompt in displayPrompts" 
          :key="prompt.id"
          class="pm-prompt-card"
          @click="editPrompt(prompt)"
        >
          <div class="pm-prompt-card-header">
            <div class="pm-prompt-card-icon">
              <SvgIcon :name="prompt.icon || 'sparkles'" :size="18" />
            </div>
            <div class="pm-prompt-card-title">{{ prompt.name }}</div>
            <button class="pm-prompt-card-menu" @click.stop="showPromptContextMenu($event, prompt)">
              <SvgIcon name="more" :size="16" />
            </button>
          </div>
          <div class="pm-prompt-card-content">{{ prompt.prompt }}</div>
          <div class="pm-prompt-card-footer">
            <div class="pm-prompt-card-tags">
              <span 
                v-for="(tag, i) in (prompt.tags || []).slice(0, 2)" 
                :key="tag"
                class="pm-prompt-tag"
                :class="{ blue: i === 0 }"
              >
                {{ tag }}
              </span>
            </div>
            <span class="pm-prompt-card-time">{{ formatTime(prompt.createdAt) }}</span>
          </div>
        </div>
      </div>
    </main>

    <!-- 新建/编辑文件夹弹窗 -->
    <div class="pm-modal-overlay" v-if="showFolderModal" @click.self="closeFolderModal">
      <div class="pm-modal">
        <div class="pm-modal-header">
          <span class="pm-modal-title">{{ editingFolder ? '编辑文件夹' : '新建文件夹' }}</span>
          <button class="pm-modal-close" @click="closeFolderModal">
            <SvgIcon name="close" :size="20" />
          </button>
        </div>
        <div class="pm-modal-body">
          <div class="pm-form-group">
            <label class="pm-form-label">文件夹名称</label>
            <input 
              type="text" 
              class="pm-form-input" 
              v-model="folderForm.name"
              placeholder="请输入文件夹名称"
            >
          </div>
          <div class="pm-form-group">
            <label class="pm-form-label">上级文件夹</label>
            <select class="pm-form-select" v-model="folderForm.parentId">
              <option :value="null">全部提示词（根目录）</option>
              <option 
                v-for="folder in availableParentFolders" 
                :key="folder.id" 
                :value="folder.id"
              >
                {{ getFolderIndent(folder) }}{{ folder.name }}
              </option>
            </select>
          </div>
        </div>
        <div class="pm-modal-footer">
          <button class="pm-btn default" @click="closeFolderModal">取消</button>
          <button class="pm-btn primary" @click="saveFolder" :disabled="!folderForm.name">保存</button>
        </div>
      </div>
    </div>

    <!-- 新建/编辑提示词弹窗 -->
    <div class="pm-modal-overlay" v-if="showPromptModal" @click.self="closePromptModal">
      <div class="pm-modal" style="width: 600px;">
        <div class="pm-modal-header">
          <span class="pm-modal-title">{{ editingPrompt ? '编辑提示词' : '新建提示词' }}</span>
          <button class="pm-modal-close" @click="closePromptModal">
            <SvgIcon name="close" :size="20" />
          </button>
        </div>
        <div class="pm-modal-body">
          <div class="pm-form-group">
            <label class="pm-form-label">提示词名称</label>
            <input 
              type="text" 
              class="pm-form-input" 
              v-model="promptForm.name"
              placeholder="请输入提示词名称"
            >
          </div>
          <div class="pm-form-group">
            <label class="pm-form-label">图标</label>
            <div class="pm-icon-picker">
              <div 
                v-for="icon in iconOptions" 
                :key="icon"
                class="pm-icon-option"
                :class="{ active: promptForm.icon === icon }"
                @click="promptForm.icon = icon"
                :title="icon"
              >
                <SvgIcon :name="icon" :size="20" />
              </div>
            </div>
          </div>
          <div class="pm-form-group">
            <label class="pm-form-label">所属文件夹</label>
            <select class="pm-form-select" v-model="promptForm.folderId">
              <option :value="null">全部提示词（根目录）</option>
              <option 
                v-for="folder in promptsStore.folders" 
                :key="folder.id" 
                :value="folder.id"
              >
                {{ getFolderIndent(folder) }}{{ folder.name }}
              </option>
            </select>
          </div>
          <div class="pm-form-group">
            <label class="pm-form-label">提示词内容</label>
            <textarea 
              class="pm-form-textarea" 
              v-model="promptForm.prompt"
              placeholder="请输入提示词内容，使用 {text} 作为用户选中文本的占位符"
            ></textarea>
            <p class="pm-form-hint">💡 使用 {text} 代表用户选中的文本</p>
          </div>
          <div class="pm-form-group">
            <label class="pm-form-label">标签（用逗号分隔）</label>
            <input 
              type="text" 
              class="pm-form-input" 
              v-model="promptForm.tags"
              placeholder="例如：Python, 编程, 代码"
            >
          </div>
          <div class="pm-form-group">
            <label class="pm-form-label">排序序号（可选）</label>
            <input 
              type="number" 
              class="pm-form-input" 
              v-model="promptForm.sortOrder"
              placeholder="数字越小越靠前，留空则按创建时间排序"
              min="0"
            >
            <p class="pm-form-hint">💡 设置序号可自定义排序，数字越小越靠前；留空则按创建时间倒序排列</p>
          </div>
        </div>
        <div class="pm-modal-footer">
          <button class="pm-btn default" @click="closePromptModal">取消</button>
          <button class="pm-btn primary" @click="savePrompt" :disabled="!promptForm.name || !promptForm.prompt">保存</button>
        </div>
      </div>
    </div>

    <!-- 确认删除弹窗 -->
    <div class="pm-modal-overlay confirm-modal" v-if="showConfirmModal" @click.self="showConfirmModal = false">
      <div class="pm-modal" style="width: 400px;">
        <div class="pm-modal-header">
          <span class="pm-modal-title">确认删除</span>
          <button class="pm-modal-close" @click="showConfirmModal = false">
            <SvgIcon name="close" :size="20" />
          </button>
        </div>
        <div class="pm-modal-body">
          <p class="pm-confirm-message">{{ confirmMessage }}</p>
        </div>
        <div class="pm-modal-footer" style="justify-content: center;">
          <button class="pm-btn default" @click="showConfirmModal = false">取消</button>
          <button class="pm-btn danger" @click="confirmDelete">删除</button>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div 
      class="pm-context-menu" 
      v-show="contextMenu.visible"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <div class="pm-context-menu-item" @click="handleContextAction('edit')">
        <SvgIcon name="edit" :size="16" />
        编辑
      </div>
      <div class="pm-context-menu-item" v-if="contextMenu.type === 'prompt'" @click="handleContextAction('copy')">
        <SvgIcon name="copy" :size="16" />
        复制
      </div>
      <div class="pm-context-menu-divider"></div>
      <div class="pm-context-menu-item danger" @click="handleContextAction('delete')">
        <SvgIcon name="trash" :size="16" />
        删除
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import '@/styles/custom-prompts.css'
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { usePromptsStore } from '@/stores/prompts'
import { useToast } from '@/composables/useToast'
import type { Prompt, PromptFolder } from '@/types'
import SvgIcon from '@/components/icons/SvgIcon.vue'
import { availableIcons } from '@/constants/icons'
import TreeNode from './TreeNode.vue'

const promptsStore = usePromptsStore()
const toast = useToast()

// 容器引用
const containerRef = ref<HTMLElement | null>(null)

// 响应式宽屏检测
const isWideScreen = ref(false)
const WIDE_SCREEN_THRESHOLD = 800 // 容器宽度阈值，大于此值显示左侧栏

let resizeObserver: ResizeObserver | null = null

function checkContainerWidth() {
  if (!containerRef.value) return
  
  const wasWide = isWideScreen.value
  const containerWidth = containerRef.value.offsetWidth
  isWideScreen.value = containerWidth > WIDE_SCREEN_THRESHOLD
  
  // 当从小窗口切换到大窗口时，自动切换到网格视图
  // 当从大窗口切换到小窗口时，自动切换到列表视图
  if (wasWide !== isWideScreen.value && !userChangedViewMode.value) {
    viewMode.value = isWideScreen.value ? 'grid' : 'list'
  }
}

// 状态
const searchQuery = ref('')
const currentFolderId = ref<string | null>(null)
const collapsedFolders = ref<Set<string>>(new Set())
const sortBy = ref<'time-desc' | 'time-asc' | 'name-asc' | 'name-desc'>('time-desc')
const viewMode = ref<'grid' | 'list'>('list') // 默认列表视图（小窗口）
const userChangedViewMode = ref(false) // 用户是否手动更改过视图模式

// 下拉菜单
const showSortDropdown = ref(false)
const showViewDropdown = ref(false)

// 弹窗
const showFolderModal = ref(false)
const showPromptModal = ref(false)
const showConfirmModal = ref(false)
const confirmMessage = ref('')
const confirmCallback = ref<(() => void) | null>(null)

// 编辑状态
const editingFolder = ref<PromptFolder | null>(null)
const editingPrompt = ref<Prompt | null>(null)

// 表单
const folderForm = reactive({
  name: '',
  parentId: null as string | null
})

const promptForm = reactive({
  name: '',
  icon: 'sparkles',
  prompt: '',
  folderId: null as string | null,
  tags: '',
  sortOrder: '' as string | number
})

// 使用 SvgIcon 中导出的所有图标
const iconOptions = availableIcons

// 右键菜单
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  type: '' as 'folder' | 'prompt',
  target: null as PromptFolder | Prompt | null
})

// 计算属性
const currentPath = computed(() => promptsStore.getFolderPath(currentFolderId.value))

const currentFolderName = computed(() => {
  if (!currentFolderId.value) return '全部提示词'
  const folder = promptsStore.folders.find(f => f.id === currentFolderId.value)
  return folder?.name || '全部提示词'
})

const currentChildFolders = computed(() => promptsStore.getChildFolders(currentFolderId.value))

const currentPrompts = computed(() => promptsStore.getFolderPrompts(currentFolderId.value))

const sortedPrompts = computed(() => {
  const prompts = [...currentPrompts.value]
  switch (sortBy.value) {
    case 'time-desc':
      return prompts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    case 'time-asc':
      return prompts.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
    case 'name-asc':
      return prompts.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    case 'name-desc':
      return prompts.sort((a, b) => b.name.localeCompare(a.name, 'zh-CN'))
    default:
      return prompts
  }
})

const searchResults = computed(() => {
  if (!searchQuery.value.trim()) return []
  const query = searchQuery.value.toLowerCase()
  return promptsStore.customPrompts.filter(p => 
    p.name.toLowerCase().includes(query) ||
    p.prompt.toLowerCase().includes(query)
  )
})

// 显示的提示词列表（搜索时显示搜索结果，否则显示当前文件夹的提示词）
const displayPrompts = computed(() => {
  if (searchQuery.value.trim()) {
    return searchResults.value
  }
  return sortedPrompts.value
})

// 实际使用的视图模式
const actualViewMode = computed(() => viewMode.value)

const availableParentFolders = computed(() => {
  if (!editingFolder.value) return promptsStore.folders
  // 排除自己和自己的子文件夹
  const excludeIds = new Set<string>()
  const addChildren = (id: string) => {
    excludeIds.add(id)
    promptsStore.getChildFolders(id).forEach(child => addChildren(child.id))
  }
  addChildren(editingFolder.value.id)
  return promptsStore.folders.filter(f => !excludeIds.has(f.id))
})

// 方法
function selectFolder(folderId: string | null) {
  currentFolderId.value = folderId
  if (folderId) collapsedFolders.value.delete(folderId)
}

function toggleFolder(folderId: string) {
  if (collapsedFolders.value.has(folderId)) {
    collapsedFolders.value.delete(folderId)
  } else {
    collapsedFolders.value.add(folderId)
  }
}

function setSortBy(sort: typeof sortBy.value) {
  sortBy.value = sort
  showSortDropdown.value = false
}

function setViewMode(mode: typeof viewMode.value) {
  viewMode.value = mode
  userChangedViewMode.value = true // 标记用户手动更改了视图模式
  showViewDropdown.value = false
}

function formatTime(timestamp?: string) {
  if (!timestamp) return ''
  const diff = Date.now() - new Date(timestamp).getTime()
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  return `${Math.floor(days / 30)}个月前`
}

function highlightText(text: string) {
  if (!searchQuery.value) return text
  const regex = new RegExp(`(${searchQuery.value})`, 'gi')
  return text.replace(regex, '<span class="pm-highlight">$1</span>')
}

function getPromptPath(prompt: Prompt) {
  const path = promptsStore.getFolderPath(prompt.folderId || null)
  return ['全部提示词', ...path.map(f => f.name)].join(' / ')
}

function getFolderIndent(folder: PromptFolder) {
  const path = promptsStore.getFolderPath(folder.parentId)
  return '　'.repeat(path.length)
}

// 文件夹操作
function editFolder(folder: PromptFolder) {
  editingFolder.value = folder
  folderForm.name = folder.name
  folderForm.parentId = folder.parentId
  showFolderModal.value = true
}

function closeFolderModal() {
  showFolderModal.value = false
  editingFolder.value = null
  folderForm.name = ''
  folderForm.parentId = currentFolderId.value
}

async function saveFolder() {
  if (!folderForm.name) return
  try {
    if (editingFolder.value) {
      await promptsStore.updateFolder(editingFolder.value.id, {
        name: folderForm.name,
        parentId: folderForm.parentId
      })
      toast.success('文件夹已更新')
    } else {
      await promptsStore.addFolder({
        name: folderForm.name,
        parentId: folderForm.parentId
      })
      toast.success('文件夹已创建')
    }
    closeFolderModal()
  } catch (error) {
    toast.error('保存失败: ' + error)
  }
}

function confirmDeleteFolder(folder: PromptFolder) {
  confirmMessage.value = `确定要删除文件夹"${folder.name}"及其所有内容吗？`
  confirmCallback.value = async () => {
    try {
      if (currentFolderId.value === folder.id) {
        currentFolderId.value = folder.parentId
      }
      await promptsStore.deleteFolder(folder.id)
      toast.success('文件夹已删除')
    } catch (error) {
      toast.error('删除失败: ' + error)
    }
  }
  showConfirmModal.value = true
}

// 提示词操作
function showNewPromptModal() {
  editingPrompt.value = null
  promptForm.name = ''
  promptForm.icon = 'sparkles'
  promptForm.prompt = ''
  promptForm.folderId = currentFolderId.value
  promptForm.tags = ''
  promptForm.sortOrder = ''
  showPromptModal.value = true
}

function editPrompt(prompt: Prompt) {
  editingPrompt.value = prompt
  promptForm.name = prompt.name
  promptForm.icon = prompt.icon
  promptForm.prompt = prompt.prompt
  promptForm.folderId = prompt.folderId || null
  promptForm.tags = (prompt.tags || []).join(', ')
  promptForm.sortOrder = prompt.sortOrder !== undefined ? prompt.sortOrder : ''
  showPromptModal.value = true
}

function closePromptModal() {
  showPromptModal.value = false
  editingPrompt.value = null
}

async function savePrompt() {
  if (!promptForm.name || !promptForm.prompt) return
  const tags = promptForm.tags.split(',').map(t => t.trim()).filter(t => t)
  const sortOrder = promptForm.sortOrder !== '' ? Number(promptForm.sortOrder) : undefined
  try {
    if (editingPrompt.value) {
      await promptsStore.updatePrompt(editingPrompt.value.id, {
        name: promptForm.name,
        icon: promptForm.icon,
        prompt: promptForm.prompt,
        folderId: promptForm.folderId || undefined,
        tags,
        sortOrder
      })
      toast.success('提示词已更新')
    } else {
      await promptsStore.addPrompt({
        name: promptForm.name,
        icon: promptForm.icon,
        prompt: promptForm.prompt,
        folderId: promptForm.folderId || undefined,
        tags,
        sortOrder
      })
      toast.success('提示词已创建')
    }
    closePromptModal()
  } catch (error) {
    toast.error('保存失败: ' + error)
  }
}

function confirmDeletePrompt(prompt: Prompt) {
  confirmMessage.value = `确定要删除提示词"${prompt.name}"吗？`
  confirmCallback.value = async () => {
    try {
      await promptsStore.deletePrompt(prompt.id)
      toast.success('提示词已删除')
    } catch (error) {
      toast.error('删除失败: ' + error)
    }
  }
  showConfirmModal.value = true
}

function confirmDelete() {
  if (confirmCallback.value) {
    confirmCallback.value()
  }
  showConfirmModal.value = false
  confirmCallback.value = null
}

// 右键菜单
function showFolderContextMenu(e: MouseEvent, folder: PromptFolder) {
  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.type = 'folder'
  contextMenu.target = folder
}

function showPromptContextMenu(e: MouseEvent, prompt: Prompt) {
  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.type = 'prompt'
  contextMenu.target = prompt
}

function hideContextMenu() {
  contextMenu.visible = false
  contextMenu.target = null
}

function handleContextAction(action: 'edit' | 'copy' | 'delete') {
  if (!contextMenu.target) return
  
  if (action === 'edit') {
    if (contextMenu.type === 'folder') {
      editFolder(contextMenu.target as PromptFolder)
    } else {
      editPrompt(contextMenu.target as Prompt)
    }
  } else if (action === 'copy') {
    const prompt = contextMenu.target as Prompt
    navigator.clipboard.writeText(prompt.prompt)
    toast.success('已复制到剪贴板')
  } else if (action === 'delete') {
    if (contextMenu.type === 'folder') {
      confirmDeleteFolder(contextMenu.target as PromptFolder)
    } else {
      confirmDeletePrompt(contextMenu.target as Prompt)
    }
  }
  
  hideContextMenu()
}

// 点击外部关闭下拉菜单和右键菜单
function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.pm-dropdown-wrapper')) {
    showSortDropdown.value = false
    showViewDropdown.value = false
  }
  if (!target.closest('.pm-context-menu')) {
    hideContextMenu()
  }
}

onMounted(async () => {
  // 等待 DOM 渲染完成
  await nextTick()
  
  // 使用 ResizeObserver 监听容器大小变化
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      checkContainerWidth()
    })
    resizeObserver.observe(containerRef.value)
    // 初始检测
    checkContainerWidth()
  }
  
  document.addEventListener('click', handleClickOutside)
  folderForm.parentId = currentFolderId.value
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped src="@/styles/custom-prompts.css"></style>
