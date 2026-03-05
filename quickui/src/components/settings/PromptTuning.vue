<template>
  <div class="prompt-tuning" :class="{ 'show-right-panel': isWideScreen }">
    <!-- 顶部导航栏 -->
    <header class="tuning-header">
      <div class="header-left">
        <div class="logo">
          <div class="logo-icon">
            <SvgIcon name="sparkles" :size="14" />
          </div>
          <span>提示词调优</span>
        </div>
        <nav class="nav-tabs">
          <button 
            class="nav-tab" 
            :class="{ active: tuningMode === 'system' }"
            @click="tuningMode = 'system'"
          >
            提示词优化
          </button>
          <button 
            class="nav-tab"
            :class="{ active: tuningMode === 'scoring' }"
            @click="tuningMode = 'scoring'"
          >
            提示词评分
          </button>
        </nav>
      </div>
    </header>

    <!-- 提示词评分模式 -->
    <PromptScoring v-if="tuningMode === 'scoring'" />

    <!-- 系统提示词优化模式 -->
    <main class="tuning-main" v-else>
      <!-- 左侧面板 - 始终显示 -->
      <div class="left-panel">
        <!-- 原始提示词卡片 -->
        <div class="tuning-card">
          <div class="card-header">
            <span class="card-title">原始提示词</span>
            <div class="card-actions">
              <button class="card-action-btn" @click="copyText(originalPrompt)" title="复制">
                <SvgIcon name="copy" :size="16" />
              </button>
              <button class="card-action-btn" @click="originalCollapsed = !originalCollapsed" title="折叠">
                <SvgIcon :name="originalCollapsed ? 'chevron-down' : 'chevron-up'" :size="16" />
              </button>
            </div>
          </div>
          <div class="card-body" v-show="!originalCollapsed">
            <div class="textarea-wrapper">
              <textarea 
                class="textarea" 
                v-model="originalPrompt"
                placeholder="请输入需要优化的提示词..."
              ></textarea>
              <span class="char-count">{{ originalPrompt.length }}</span>
            </div>
            <div class="form-row form-row-inline">
              <div class="form-group">
                <label class="form-label">优化模型</label>
                <div class="custom-select" :class="{ open: modelDropdownOpen }" v-click-outside="closeModelDropdown">
                  <div class="custom-select-trigger" @click="modelDropdownOpen = !modelDropdownOpen">
                    <template v-if="selectedModel">
                      <SvgIcon name="cpu" :size="14" />
                      <span class="select-text">{{ selectedModel.name }} ({{ selectedModel.model }})</span>
                    </template>
                    <span v-else class="select-placeholder">请选择模型</span>
                    <SvgIcon name="chevron-down" :size="12" class="select-arrow" />
                  </div>
                  <div class="custom-select-dropdown" v-show="modelDropdownOpen">
                    <div 
                      class="custom-select-option"
                      @click="selectModel('')"
                    >
                      <span class="option-text">请选择模型</span>
                    </div>
                    <div 
                      class="custom-select-option"
                      v-for="config in configStore.apiConfigs" 
                      :key="config.id"
                      :class="{ selected: optimizeModel === config.id }"
                      @click="selectModel(config.id)"
                    >
                      <SvgIcon name="cpu" :size="14" />
                      <span class="option-text">{{ config.name }} ({{ config.model }})</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">优化场景</label>
                <div class="custom-select" :class="{ open: sceneDropdownOpen }" v-click-outside="closeSceneDropdown">
                  <div class="custom-select-trigger" @click="sceneDropdownOpen = !sceneDropdownOpen">
                    <template v-if="selectedScene">
                      <SvgIcon :name="selectedScene.icon || 'file-text'" :size="14" />
                      <span class="select-text">{{ selectedScene.name }}</span>
                    </template>
                    <span v-else class="select-placeholder">请选择提示词</span>
                    <SvgIcon name="chevron-down" :size="12" class="select-arrow" />
                  </div>
                  <div class="custom-select-dropdown" v-show="sceneDropdownOpen">
                    <div 
                      class="custom-select-option"
                      @click="selectScene('')"
                    >
                      <span class="option-text">请选择提示词</span>
                    </div>
                    <div 
                      class="custom-select-option"
                      v-for="prompt in allPrompts" 
                      :key="prompt.id"
                      :class="{ selected: optimizeScene === prompt.id }"
                      @click="selectScene(prompt.id)"
                    >
                      <SvgIcon :name="prompt.icon || 'file-text'" :size="14" />
                      <span class="option-text">{{ prompt.name }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                class="optimize-btn" 
                @click="startOptimize"
                :disabled="!canOptimize || isOptimizing"
              >
                {{ isOptimizing ? '优化中...' : '开始优化' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 优化后的提示词卡片 -->
        <div class="tuning-card optimized-card">
          <div class="card-header">
            <span class="card-title">优化后的提示词</span>
            <div class="card-actions">
              <button 
                class="card-action-btn" 
                @click="copyText(optimizedPrompt)" 
                title="复制"
                :disabled="!optimizedPrompt"
              >
                <SvgIcon name="copy" :size="16" />
              </button>
            </div>
          </div>
          <div class="card-body">
            <div class="textarea-wrapper editable-result">
              <template v-if="isOptimizing">
                <div class="loading-indicator">
                  <span class="loading-dot"></span>
                  <span class="loading-dot"></span>
                  <span class="loading-dot"></span>
                </div>
              </template>
              <template v-else>
                <textarea 
                  class="textarea result-textarea" 
                  v-model="optimizedPrompt"
                  placeholder="优化后的提示词将显示在这里..."
                ></textarea>
              </template>
              <span class="char-count">{{ optimizedPrompt.length }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧面板 - 仅在宽屏时显示 -->
      <div class="right-panel" v-if="isWideScreen">
        <!-- 测试内容卡片 -->
        <div class="tuning-card test-card">
          <div class="card-header">
            <span class="card-title">测试内容</span>
            <div class="card-actions">
              <button class="card-action-btn" @click="copyText(testContent)" title="复制">
                <SvgIcon name="copy" :size="16" />
              </button>
              <button class="card-action-btn" @click="testContentCollapsed = !testContentCollapsed" title="折叠">
                <SvgIcon :name="testContentCollapsed ? 'chevron-down' : 'chevron-up'" :size="16" />
              </button>
            </div>
          </div>
          <div class="card-body" v-show="!testContentCollapsed">
            <div class="textarea-wrapper">
              <textarea 
                class="textarea" 
                v-model="testContent"
                placeholder="请输入要测试的内容..."
              ></textarea>
              <span class="char-count">{{ testContent.length }}</span>
            </div>
            <div class="test-model-row">
              <span class="test-model-label">测试模型：</span>
              <div class="custom-select test-model-select" :class="{ open: testModelDropdownOpen }" v-click-outside="closeTestModelDropdown">
                <div class="custom-select-trigger" @click="testModelDropdownOpen = !testModelDropdownOpen">
                  <template v-if="selectedTestModel">
                    <SvgIcon name="cpu" :size="14" />
                    <span class="select-text">{{ selectedTestModel.name }} ({{ selectedTestModel.model }})</span>
                  </template>
                  <span v-else class="select-placeholder">请选择模型</span>
                  <SvgIcon name="chevron-down" :size="12" class="select-arrow" />
                </div>
                <div class="custom-select-dropdown" v-show="testModelDropdownOpen">
                  <div 
                    class="custom-select-option"
                    @click="selectTestModel('')"
                  >
                    <span class="option-text">请选择模型</span>
                  </div>
                  <div 
                    class="custom-select-option"
                    v-for="config in configStore.apiConfigs" 
                    :key="config.id"
                    :class="{ selected: testModel === config.id }"
                    @click="selectTestModel(config.id)"
                  >
                    <SvgIcon name="cpu" :size="14" />
                    <span class="option-text">{{ config.name }} ({{ config.model }})</span>
                  </div>
                </div>
              </div>
              <div class="toggle-wrapper">
                <div 
                  class="toggle" 
                  :class="{ active: compareMode }"
                  @click="compareMode = !compareMode"
                ></div>
                <span class="toggle-label">对比模式</span>
              </div>
              <button 
                class="run-btn" 
                @click="runTest"
                :disabled="!canRunTest || isTesting"
              >
                {{ isTesting ? '运行中...' : '运行测试' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 结果对比区域 -->
        <div class="results-row">
          <!-- 原始提示词结果 -->
          <div class="tuning-card result-card" v-if="compareMode">
            <div class="card-header">
              <div class="result-title-wrapper">
                <span class="card-title">原始提示词结果</span>
                <span class="result-tag">原文</span>
              </div>
              <div class="card-actions">
                <button 
                  class="card-action-btn" 
                  @click="copyText(originalResult)" 
                  title="复制"
                  :disabled="!originalResult"
                >
                  <SvgIcon name="copy" :size="16" />
                </button>
              </div>
            </div>
            <div class="card-body">
              <div class="textarea-wrapper editable-result">
                <template v-if="isTestingOriginal">
                  <div class="loading-indicator">
                    <span class="loading-dot"></span>
                    <span class="loading-dot"></span>
                    <span class="loading-dot"></span>
                  </div>
                </template>
                <template v-else>
                  <textarea 
                    class="textarea result-textarea" 
                    v-model="originalResult"
                    placeholder="暂无内容"
                  ></textarea>
                </template>
                <span class="char-count">{{ originalResult.length }}</span>
              </div>
            </div>
          </div>

          <!-- 优化后提示词结果 -->
          <div class="tuning-card result-card">
            <div class="card-header">
              <div class="result-title-wrapper">
                <span class="card-title">{{ compareMode ? '优化后提示词结果' : '测试结果' }}</span>
                <span class="result-tag">{{ compareMode ? '优化' : '结果' }}</span>
              </div>
              <div class="card-actions">
                <button 
                  class="card-action-btn" 
                  @click="copyText(optimizedResult)" 
                  title="复制"
                  :disabled="!optimizedResult"
                >
                  <SvgIcon name="copy" :size="16" />
                </button>
              </div>
            </div>
            <div class="card-body">
              <div class="textarea-wrapper editable-result">
                <template v-if="isTestingOptimized">
                  <div class="loading-indicator">
                    <span class="loading-dot"></span>
                    <span class="loading-dot"></span>
                    <span class="loading-dot"></span>
                  </div>
                </template>
                <template v-else>
                  <textarea 
                    class="textarea result-textarea" 
                    v-model="optimizedResult"
                    placeholder="暂无内容"
                  ></textarea>
                </template>
                <span class="char-count">{{ optimizedResult.length }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import '@/styles/prompt-tuning.css'
import { ref, computed, onMounted, onUnmounted, type Directive } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useConfigStore } from '@/stores/config'
import { usePromptsStore } from '@/stores/prompts'
import { useToast } from '@/composables/useToast'
import SvgIcon from '@/components/icons/SvgIcon.vue'
import PromptScoring from './PromptScoring.vue'
import { buildTuningPrompt } from '@/constants/systemPrompts'

// v-click-outside 指令
const vClickOutside: Directive = {
  mounted(el, binding) {
    el._clickOutside = (event: MouseEvent) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value()
      }
    }
    document.addEventListener('click', el._clickOutside)
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutside)
  }
}

const configStore = useConfigStore()
const promptsStore = usePromptsStore()
const toast = useToast()

// 响应式宽屏检测
const isWideScreen = ref(false)
const WIDE_SCREEN_THRESHOLD = 1000 // 宽度阈值

function checkScreenWidth() {
  isWideScreen.value = window.innerWidth >= WIDE_SCREEN_THRESHOLD
}

onMounted(() => {
  checkScreenWidth()
  window.addEventListener('resize', checkScreenWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenWidth)
})

// 调优模式
const tuningMode = ref<'system' | 'scoring'>('system')

// 原始提示词
const originalPrompt = ref('')
const originalCollapsed = ref(false)

// 优化设置
const optimizeModel = ref('')
const optimizeScene = ref('')
const optimizedPrompt = ref('')
const isOptimizing = ref(false)

// 测试设置
const testContent = ref('')
const testModel = ref('')
const compareMode = ref(true)
const testContentCollapsed = ref(false)

// 测试结果
const originalResult = ref('')
const optimizedResult = ref('')
const isTesting = ref(false)
const isTestingOriginal = ref(false)
const isTestingOptimized = ref(false)

// 所有提示词
const allPrompts = computed(() => promptsStore.prompts)

// 场景下拉框状态
const sceneDropdownOpen = ref(false)

// 模型下拉框状态
const modelDropdownOpen = ref(false)

// 选中的场景
const selectedScene = computed(() => {
  if (!optimizeScene.value) return null
  return allPrompts.value.find(p => p.id === optimizeScene.value)
})

// 选中的模型
const selectedModel = computed(() => {
  if (!optimizeModel.value) return null
  return configStore.apiConfigs.find(c => c.id === optimizeModel.value)
})

// 选择场景
function selectScene(id: string) {
  optimizeScene.value = id
  sceneDropdownOpen.value = false
}

// 选择模型
function selectModel(id: string) {
  optimizeModel.value = id
  modelDropdownOpen.value = false
}

// 关闭场景下拉框
function closeSceneDropdown() {
  sceneDropdownOpen.value = false
}

// 关闭模型下拉框
function closeModelDropdown() {
  modelDropdownOpen.value = false
}

// 测试模型下拉框状态
const testModelDropdownOpen = ref(false)

// 选中的测试模型
const selectedTestModel = computed(() => {
  if (!testModel.value) return null
  return configStore.apiConfigs.find(c => c.id === testModel.value)
})

// 选择测试模型
function selectTestModel(id: string) {
  testModel.value = id
  testModelDropdownOpen.value = false
}

// 关闭测试模型下拉框
function closeTestModelDropdown() {
  testModelDropdownOpen.value = false
}

// 是否可以优化
const canOptimize = computed(() => {
  return originalPrompt.value.trim() && optimizeModel.value
})

// 是否可以运行测试
const canRunTest = computed(() => {
  return testContent.value.trim() && testModel.value && (originalPrompt.value.trim() || optimizedPrompt.value.trim())
})

function copyText(text: string) {
  if (!text) return
  navigator.clipboard.writeText(text)
  toast.success('已复制到剪贴板')
}

// 获取API配置
function getApiConfig(configId: string) {
  return configStore.apiConfigs.find(c => c.id === configId)
}

// 开始优化
async function startOptimize() {
  if (!canOptimize.value) return
  
  const config = getApiConfig(optimizeModel.value)
  if (!config) {
    toast.error('请选择有效的优化模型')
    return
  }

  console.log('========== 开始优化 ==========')
  console.log('[优化] 原始提示词:', originalPrompt.value.substring(0, 200) + '...')
  console.log('[优化] 使用模型:', config.name, config.model)
  console.log('[优化] 优化场景:', optimizeScene.value || '无')

  isOptimizing.value = true
  optimizedPrompt.value = ''

  // 检查是否选择了优化场景
  let systemPrompt = ''
  let userContent = originalPrompt.value
  
  if (optimizeScene.value) {
    // 选择了优化场景，直接使用场景的提示词作为 system prompt
    const scenePrompt = allPrompts.value.find(p => p.id === optimizeScene.value)
    if (scenePrompt) {
      systemPrompt = scenePrompt.prompt
      console.log('[优化] 使用场景提示词作为 system prompt:', systemPrompt.substring(0, 200) + '...')
    }
  } else {
    // 没有选择场景，使用默认的优化模板
    userContent = buildTuningPrompt(originalPrompt.value)
    console.log('[优化] 使用默认优化模板')
  }

  try {
    const unlistenChunk = await listen<string>('ai-chunk', (event) => {
      optimizedPrompt.value += event.payload
    })

    const unlistenDone = await listen('ai-done', () => {
      console.log('[优化] 优化完成，结果长度:', optimizedPrompt.value.length)
      console.log('[优化] 优化后提示词预览:', optimizedPrompt.value.substring(0, 300) + '...')
      isOptimizing.value = false
      unlistenChunk()
      unlistenDone()
    })

    // 构建消息列表
    const messages = systemPrompt 
      ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }]
      : [{ role: 'user', content: userContent }]

    console.log('[优化] 发送消息:', messages.length, '条')

    await invoke('ai_request', {
      endpoint: config.endpoint,
      apiKey: config.apiKey || '',
      model: config.model,
      apiType: config.type,
      messages: messages
    })
  } catch (error) {
    console.error('[优化] 优化失败:', error)
    toast.error('优化失败: ' + error)
    isOptimizing.value = false
  }
}

// 运行测试
async function runTest() {
  if (!canRunTest.value) return

  const config = getApiConfig(testModel.value)
  if (!config) {
    toast.error('请选择有效的测试模型')
    return
  }

  console.log('========== 开始测试 ==========')
  console.log('[测试] 对比模式:', compareMode.value)
  console.log('[测试] 测试模型:', config.name, config.model)
  console.log('[测试] 测试内容:', testContent.value)
  console.log('[测试] 原始提示词长度:', originalPrompt.value.length)
  console.log('[测试] 优化后提示词长度:', optimizedPrompt.value.length)

  isTesting.value = true
  originalResult.value = ''
  optimizedResult.value = ''

  // 对比模式：并行发起两个独立会话
  if (compareMode.value && originalPrompt.value.trim()) {
    const originalRequestId = `original-${Date.now()}`
    const optimizedRequestId = `optimized-${Date.now()}`
    
    console.log('[测试] 对比模式 - 并行执行两个测试')
    console.log('[测试] 原始请求ID:', originalRequestId)
    console.log('[测试] 优化请求ID:', optimizedRequestId)
    
    // 并行执行两个测试
    await Promise.all([
      runSingleTest(config, originalPrompt.value.trim(), 'original', originalRequestId),
      runSingleTest(config, optimizedPrompt.value.trim() || originalPrompt.value.trim(), 'optimized', optimizedRequestId)
    ])
  } else {
    // 非对比模式：只用优化后的提示词（或原始提示词）
    const requestId = `single-${Date.now()}`
    const systemPrompt = optimizedPrompt.value.trim() || originalPrompt.value.trim()
    
    console.log('[测试] 单独模式 - 执行单个测试')
    console.log('[测试] 请求ID:', requestId)
    
    await runSingleTest(config, systemPrompt, 'optimized', requestId)
  }

  console.log('========== 测试完成 ==========')
  isTesting.value = false
}

async function runSingleTest(
  config: { endpoint: string; apiKey: string; model: string; type: string },
  systemPrompt: string,
  type: 'original' | 'optimized',
  requestId: string
) {
  console.log(`---------- [${type}] 单次测试开始 ----------`)
  console.log(`[${type}] 请求ID:`, requestId)
  console.log(`[${type}] System Prompt (前500字):`, systemPrompt.substring(0, 500))
  console.log(`[${type}] System Prompt 完整长度:`, systemPrompt.length)
  console.log(`[${type}] User Content (测试内容):`, testContent.value)
  
  if (type === 'original') {
    isTestingOriginal.value = true
  } else {
    isTestingOptimized.value = true
  }

  // 构建消息：系统提示词作为system角色，测试内容作为user角色
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: testContent.value }
  ]

  console.log(`[${type}] 发送的 messages 结构:`, JSON.stringify(messages.map(m => ({
    role: m.role,
    contentLength: m.content.length,
    contentPreview: m.content.substring(0, 100) + '...'
  })), null, 2))

  return new Promise<void>((resolve) => {
    let unlistenChunk: (() => void) | null = null
    let unlistenDone: (() => void) | null = null
    let resolved = false

    const cleanup = () => {
      if (resolved) return
      resolved = true
      
      console.log(`[${type}] 测试完成，结果长度:`, type === 'original' ? originalResult.value.length : optimizedResult.value.length)
      
      if (unlistenChunk) unlistenChunk()
      if (unlistenDone) unlistenDone()
      if (type === 'original') {
        isTestingOriginal.value = false
      } else {
        isTestingOptimized.value = false
      }
      resolve()
    }

    // 使用带 requestId 的事件名
    const chunkEvent = `ai-chunk-${requestId}`
    const doneEvent = `ai-done-${requestId}`
    
    console.log(`[${type}] 监听事件:`, chunkEvent, doneEvent)

    // 先注册监听器
    Promise.all([
      listen<string>(chunkEvent, (event) => {
        if (type === 'original') {
          originalResult.value += event.payload
        } else {
          optimizedResult.value += event.payload
        }
      }),
      listen(doneEvent, () => {
        console.log(`[${type}] 收到完成事件`)
        cleanup()
      })
    ]).then(([chunkUnlisten, doneUnlisten]) => {
      unlistenChunk = chunkUnlisten
      unlistenDone = doneUnlisten

      console.log(`[${type}] 发起 AI 请求...`)
      
      // 发起请求，传入 requestId
      invoke('ai_request', {
        endpoint: config.endpoint,
        apiKey: config.apiKey || '',
        model: config.model,
        apiType: config.type,
        messages: messages,
        requestId: requestId
      }).catch((error) => {
        console.error(`[${type}] 请求失败:`, error)
        toast.error(`测试失败 (${type}): ` + error)
        cleanup()
      })
    })
  })
}

</script>

<style scoped src="@/styles/prompt-tuning.css"></style>
