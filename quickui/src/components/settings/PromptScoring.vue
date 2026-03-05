<template>
  <div class="prompt-scoring" :class="{ 'wide-mode': isWideScreen }" ref="containerRef">
    <!-- 左侧面板 -->
    <div class="scoring-left-panel">
      <!-- 左侧头部 -->
      <div class="scoring-left-header">
        <div class="scoring-logo">
          <span class="scoring-logo-text">提示词评分优化器</span>
          <span class="scoring-version-tag">GenQuick</span>
        </div>
      </div>

      <!-- 左侧内容 -->
      <div class="scoring-left-content">
        <!-- 提示词输入 -->
        <div class="scoring-input-section">
          <div class="scoring-section-label">
            <div class="scoring-section-label-icon blue">
              <SvgIcon name="file-text" :size="14" />
            </div>
            提示词内容
          </div>
          <div class="scoring-textarea-wrapper">
            <textarea 
              class="scoring-prompt-textarea" 
              v-model="promptInput"
              placeholder="请输入你的提示词内容..."
            ></textarea>
          </div>
          <div class="scoring-textarea-footer">
            <span class="scoring-char-count">{{ promptInput.length }} 字符</span>
          </div>
          <button 
            class="scoring-btn scoring-btn-primary scoring-btn-block" 
            @click="startScoring"
            :disabled="!promptInput.trim() || isScoring"
          >
            <SvgIcon name="zap" :size="18" />
            {{ isScoring ? 'AI 评分中...' : 'AI 评分' }}
          </button>
        </div>

        <div class="scoring-divider"></div>

        <!-- 优化配置 -->
        <div class="scoring-optimize-config" :class="{ collapsed: configCollapsed }">
          <div class="scoring-optimize-config-header" @click="configCollapsed = !configCollapsed">
            <div class="scoring-optimize-config-title">
              <div class="scoring-section-label-icon green">
                <SvgIcon name="settings" :size="14" />
              </div>
              优化配置
            </div>
            <div class="scoring-collapse-arrow">
              <SvgIcon name="chevron-down" :size="16" />
            </div>
          </div>
          <div class="scoring-optimize-config-body">
            <div class="scoring-form-group">
              <label class="scoring-form-label">
                优化前提
                <span class="scoring-optional">（可选）</span>
              </label>
              <input 
                type="text" 
                class="scoring-form-input" 
                v-model="optimizeCondition"
                placeholder="例如：保持输出格式不变、保留核心逻辑"
              >
            </div>

            <div class="scoring-form-group">
              <label class="scoring-form-label">
                优化方向
                <span class="scoring-optional">（可选）</span>
              </label>
              <textarea 
                class="scoring-form-textarea" 
                v-model="optimizeDirection"
                placeholder="例如：提升异常处理能力、增强角色人设"
              ></textarea>
            </div>

            <div class="scoring-form-group">
              <label class="scoring-form-label">优化强度</label>
              <div class="scoring-intensity-options">
                <div 
                  class="scoring-intensity-option" 
                  :class="{ active: optimizeIntensity === 'light' }"
                  @click="optimizeIntensity = 'light'"
                >
                  <div class="scoring-intensity-icon light">
                    <SvgIcon name="sparkles" :size="20" />
                  </div>
                  <div class="scoring-intensity-name">轻度</div>
                  <div class="scoring-intensity-desc">微调措辞</div>
                </div>
                <div 
                  class="scoring-intensity-option" 
                  :class="{ active: optimizeIntensity === 'medium' }"
                  @click="optimizeIntensity = 'medium'"
                >
                  <div class="scoring-intensity-icon medium">
                    <SvgIcon name="tool" :size="20" />
                  </div>
                  <div class="scoring-intensity-name">中度</div>
                  <div class="scoring-intensity-desc">补充优化</div>
                </div>
                <div 
                  class="scoring-intensity-option" 
                  :class="{ active: optimizeIntensity === 'deep' }"
                  @click="optimizeIntensity = 'deep'"
                >
                  <div class="scoring-intensity-icon deep">
                    <SvgIcon name="rocket" :size="20" />
                  </div>
                  <div class="scoring-intensity-name">深度</div>
                  <div class="scoring-intensity-desc">全面重构</div>
                </div>
              </div>
            </div>

            <button 
              class="scoring-btn scoring-btn-success scoring-btn-block" 
              @click="startOptimize"
              :disabled="!hasScoreResult || isOptimizing"
            >
              <SvgIcon name="edit" :size="18" />
              {{ isOptimizing ? 'AI 优化中...' : 'AI 优化' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧面板 - 仅在宽屏模式下显示 -->
    <div class="scoring-right-panel" v-if="isWideScreen">
      <!-- 右侧头部 -->
      <div class="scoring-right-header">
        <div class="scoring-right-title">评分与优化结果</div>
      </div>

      <!-- 右侧内容 -->
      <div class="scoring-right-content">
        <!-- 空状态 -->
        <div class="scoring-empty-state" v-if="!hasScoreResult && !isScoring">
          <div class="scoring-empty-icon">
            <SvgIcon name="file-plus" :size="40" />
          </div>
          <div class="scoring-empty-text">输入提示词后点击「AI 评分」查看结果</div>
        </div>

        <!-- 加载状态 -->
        <div class="scoring-loading-state" v-if="isScoring">
          <div class="scoring-spinner"></div>
          <div class="scoring-loading-text">AI 正在评分中...</div>
        </div>

        <!-- 评分结果容器 -->
        <div class="scoring-results-container" v-if="hasScoreResult && !isScoring">
          <!-- 综合评分 -->
          <div class="scoring-result-card">
            <div class="scoring-result-card-header no-collapse">
              <div class="scoring-result-card-title">
                <div class="scoring-result-card-icon green">
                  <SvgIcon name="check-circle" :size="14" />
                </div>
                AI 综合评分
              </div>
            </div>
            <div class="scoring-result-card-body">
              <div class="scoring-score-main">
                <div class="scoring-score-circle">
                  <svg viewBox="0 0 100 100">
                    <circle class="scoring-score-circle-bg" cx="50" cy="50" r="42"></circle>
                    <circle 
                      class="scoring-score-circle-progress" 
                      :class="scoreLevel"
                      cx="50" cy="50" r="42" 
                      stroke-dasharray="264" 
                      :stroke-dashoffset="264 - (264 * scoreResult.totalScore / 100)"
                    ></circle>
                  </svg>
                  <div class="scoring-score-value">
                    <div class="scoring-score-number">{{ scoreResult.totalScore }}</div>
                    <div class="scoring-score-total">/ 100</div>
                  </div>
                </div>
                <div class="scoring-score-info">
                  <div class="scoring-score-level" :class="scoreLevel">
                    <SvgIcon name="check-circle" :size="14" />
                    {{ scoreLevelText }}
                  </div>
                  <p class="scoring-score-summary">{{ scoreResult.summary }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 各维度评分 -->
          <div class="scoring-result-card" :class="{ collapsed: dimensionCollapsed }">
            <div class="scoring-result-card-header" @click="dimensionCollapsed = !dimensionCollapsed">
              <div class="scoring-result-card-title">
                <div class="scoring-result-card-icon purple">
                  <SvgIcon name="bar-chart" :size="14" />
                </div>
                各维度评分
              </div>
              <div class="scoring-card-collapse-icon">
                <SvgIcon name="chevron-down" :size="16" />
              </div>
            </div>
            <div class="scoring-result-card-body">
              <div 
                class="scoring-dimension-category" 
                v-for="(category, categoryName) in scoreResult.dimensions" 
                :key="categoryName"
              >
                <div class="scoring-dimension-category-title">{{ categoryName }}</div>
                <div class="scoring-dimension-list">
                  <div 
                    class="scoring-dimension-item" 
                    v-for="(score, dimName) in category" 
                    :key="dimName"
                  >
                    <span class="scoring-dimension-name">{{ dimName }}</span>
                    <div class="scoring-dimension-bar">
                      <div 
                        class="scoring-dimension-bar-fill" 
                        :class="getDimensionLevel(score)"
                        :style="{ width: score + '%' }"
                      ></div>
                    </div>
                    <span class="scoring-dimension-score">{{ score }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 改进建议 -->
          <div class="scoring-result-card" :class="{ collapsed: suggestionCollapsed }">
            <div class="scoring-result-card-header" @click="suggestionCollapsed = !suggestionCollapsed">
              <div class="scoring-result-card-title">
                <div class="scoring-result-card-icon orange">
                  <SvgIcon name="alert-circle" :size="14" />
                </div>
                改进建议
              </div>
              <div class="scoring-card-collapse-icon">
                <SvgIcon name="chevron-down" :size="16" />
              </div>
            </div>
            <div class="scoring-result-card-body">
              <div class="scoring-suggestion-list">
                <div 
                  class="scoring-suggestion-item" 
                  :class="suggestion.priority"
                  v-for="(suggestion, index) in scoreResult.suggestions" 
                  :key="index"
                >
                  <span class="scoring-suggestion-priority" :class="suggestion.priority">
                    {{ getPriorityText(suggestion.priority) }}
                  </span>
                  <div class="scoring-suggestion-content">
                    <div class="scoring-suggestion-title">{{ suggestion.title }}</div>
                    <div class="scoring-suggestion-desc">{{ suggestion.description }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 应用场景分析 -->
          <div class="scoring-result-card" :class="{ collapsed: sceneCollapsed }">
            <div class="scoring-result-card-header" @click="sceneCollapsed = !sceneCollapsed">
              <div class="scoring-result-card-title">
                <div class="scoring-result-card-icon cyan">
                  <SvgIcon name="compass" :size="14" />
                </div>
                应用场景分析
              </div>
              <div class="scoring-card-collapse-icon">
                <SvgIcon name="chevron-down" :size="16" />
              </div>
            </div>
            <div class="scoring-result-card-body">
              <div class="scoring-scene-grid">
                <div class="scoring-scene-item">
                  <div class="scoring-scene-label">推荐场景</div>
                  <div class="scoring-scene-tags">
                    <span 
                      class="scoring-scene-tag" 
                      :class="{ primary: index < 2 }"
                      v-for="(scene, index) in scoreResult.scenes?.recommended" 
                      :key="scene"
                    >{{ scene }}</span>
                  </div>
                </div>
                <div class="scoring-scene-item">
                  <div class="scoring-scene-label">任务难度</div>
                  <div class="scoring-scene-value">{{ scoreResult.scenes?.difficulty }}</div>
                </div>
                <div class="scoring-scene-item">
                  <div class="scoring-scene-label">提示词类型</div>
                  <div class="scoring-scene-value">{{ scoreResult.scenes?.type }}</div>
                </div>
                <div class="scoring-scene-item">
                  <div class="scoring-scene-label">预期效果</div>
                  <div class="scoring-scene-value">{{ scoreResult.scenes?.expectedEffect }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 潜在风险 -->
          <div class="scoring-result-card" :class="{ collapsed: riskCollapsed }">
            <div class="scoring-result-card-header" @click="riskCollapsed = !riskCollapsed">
              <div class="scoring-result-card-title">
                <div class="scoring-result-card-icon red">
                  <SvgIcon name="alert-triangle" :size="14" />
                </div>
                潜在风险提示
              </div>
              <div class="scoring-card-collapse-icon">
                <SvgIcon name="chevron-down" :size="16" />
              </div>
            </div>
            <div class="scoring-result-card-body">
              <div class="scoring-risk-list">
                <div class="scoring-risk-item" v-for="(risk, index) in scoreResult.risks" :key="index">
                  <SvgIcon name="alert-circle" :size="18" class="scoring-risk-icon" />
                  <span class="scoring-risk-text" v-html="risk"></span>
                </div>
              </div>
            </div>
          </div>

          <!-- 提示词标签 -->
          <div class="scoring-result-card" :class="{ collapsed: tagCollapsed }">
            <div class="scoring-result-card-header" @click="tagCollapsed = !tagCollapsed">
              <div class="scoring-result-card-title">
                <div class="scoring-result-card-icon blue">
                  <SvgIcon name="tag" :size="14" />
                </div>
                提示词标签
              </div>
              <div class="scoring-card-collapse-icon">
                <SvgIcon name="chevron-down" :size="16" />
              </div>
            </div>
            <div class="scoring-result-card-body">
              <div class="scoring-tag-cloud">
                <span class="scoring-prompt-tag" v-for="tag in scoreResult.tags" :key="tag">{{ tag }}</span>
              </div>
            </div>
          </div>

          <!-- 优化结果 -->
          <div class="scoring-result-card" v-if="hasOptimizeResult">
            <div class="scoring-result-card-header no-collapse">
              <div class="scoring-result-card-title">
                <div class="scoring-result-card-icon green">
                  <SvgIcon name="check-circle" :size="14" />
                </div>
                优化结果
              </div>
            </div>
            <div class="scoring-result-card-body">
              <!-- 主要改动 -->
              <div class="scoring-changes-section">
                <div class="scoring-changes-title">📝 主要改动</div>
                <div class="scoring-changes-list">
                  <div 
                    class="scoring-change-item" 
                    :class="change.type"
                    v-for="(change, index) in optimizeResult.changes" 
                    :key="index"
                  >
                    <div class="scoring-change-icon">
                      <SvgIcon :name="getChangeIcon(change.type)" :size="10" />
                    </div>
                    <span class="scoring-change-text" v-html="change.text"></span>
                  </div>
                </div>
              </div>

              <!-- 优化后的提示词 -->
              <div class="scoring-optimized-section">
                <div class="scoring-optimized-title">📄 优化后的提示词</div>
                <div class="scoring-optimized-prompt">
                  <button class="scoring-copy-btn" @click="copyOptimizedPrompt">
                    <SvgIcon name="copy" :size="14" />
                    
                  </button>
                  <div class="scoring-optimized-prompt-content markdown-body" v-html="renderedOptimizedPrompt"></div>
                </div>
              </div>

              <!-- 优化说明 -->
              <div class="scoring-optimize-explanation">
                <div class="scoring-optimize-explanation-title">
                  <SvgIcon name="help-circle" :size="16" />
                  优化说明
                </div>
                <div class="scoring-optimize-explanation-text">{{ optimizeResult.explanation }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import '@/styles/prompt-scoring.css'
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { marked } from 'marked'
import { useConfigStore } from '@/stores/config'
import { useToast } from '@/composables/useToast'
import SvgIcon from '@/components/icons/SvgIcon.vue'
import { buildScoringPrompt, buildOptimizePrompt } from '@/constants/systemPrompts'

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true
})

const configStore = useConfigStore()
const toast = useToast()

// 容器引用
const containerRef = ref<HTMLElement | null>(null)

// 响应式宽屏检测
const isWideScreen = ref(false)
const WIDE_SCREEN_THRESHOLD = 700 // 容器宽度阈值

let resizeObserver: ResizeObserver | null = null

function checkContainerWidth() {
  if (!containerRef.value) return
  const containerWidth = containerRef.value.offsetWidth
  isWideScreen.value = containerWidth >= WIDE_SCREEN_THRESHOLD
}

onMounted(async () => {
  await nextTick()
  
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      checkContainerWidth()
    })
    resizeObserver.observe(containerRef.value)
    checkContainerWidth()
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

// 输入状态
const promptInput = ref('')
const configCollapsed = ref(true)
const optimizeCondition = ref('')
const optimizeDirection = ref('')
const optimizeIntensity = ref<'light' | 'medium' | 'deep'>('medium')

// 评分状态
const isScoring = ref(false)
const hasScoreResult = ref(false)
const scoreResult = ref<{
  totalScore: number
  summary: string
  dimensions: Record<string, Record<string, number>>
  suggestions: Array<{ priority: string; title: string; description: string }>
  scenes: { recommended: string[]; difficulty: string; type: string; expectedEffect: string }
  risks: string[]
  tags: string[]
}>({
  totalScore: 0,
  summary: '',
  dimensions: {},
  suggestions: [],
  scenes: { recommended: [], difficulty: '', type: '', expectedEffect: '' },
  risks: [],
  tags: []
})

// 折叠状态
const dimensionCollapsed = ref(false)
const suggestionCollapsed = ref(false)
const sceneCollapsed = ref(true)
const riskCollapsed = ref(true)
const tagCollapsed = ref(true)

// 优化状态
const isOptimizing = ref(false)
const hasOptimizeResult = ref(false)
const optimizeResult = ref<{
  changes: Array<{ type: string; text: string }>
  optimizedPrompt: string
  explanation: string
}>({
  changes: [],
  optimizedPrompt: '',
  explanation: ''
})

// 计算属性
const scoreLevel = computed(() => {
  const score = scoreResult.value.totalScore
  if (score >= 90) return 'excellent'
  if (score >= 75) return 'good'
  if (score >= 60) return 'average'
  return 'poor'
})

const scoreLevelText = computed(() => {
  const level = scoreLevel.value
  const map: Record<string, string> = {
    excellent: '优秀',
    good: '良好',
    average: '一般',
    poor: '较差'
  }
  return map[level] || '未知'
})

// 渲染优化后的提示词为 Markdown
const renderedOptimizedPrompt = computed(() => {
  if (!optimizeResult.value.optimizedPrompt) return ''
  try {
    return marked.parse(optimizeResult.value.optimizedPrompt) as string
  } catch {
    return optimizeResult.value.optimizedPrompt
  }
})

function getDimensionLevel(score: number) {
  if (score >= 90) return 'excellent'
  if (score >= 75) return 'good'
  if (score >= 60) return 'average'
  return 'poor'
}

function getPriorityText(priority: string) {
  const map: Record<string, string> = {
    high: '高优先',
    medium: '中优先',
    low: '低优先'
  }
  return map[priority] || priority
}

function getChangeIcon(type: string) {
  const map: Record<string, string> = {
    add: 'plus',
    modify: 'edit',
    delete: 'minus'
  }
  return map[type] || 'edit'
}

// 获取默认API配置
function getDefaultApiConfig() {
  return configStore.activeConfig || configStore.apiConfigs[0]
}

// 开始评分
async function startScoring() {
  if (!promptInput.value.trim()) {
    toast.error('请输入提示词内容')
    return
  }

  const config = getDefaultApiConfig()
  if (!config) {
    toast.error('请先配置API')
    return
  }

  isScoring.value = true
  hasScoreResult.value = false
  hasOptimizeResult.value = false

  const scoringPrompt = buildScoringPrompt(promptInput.value)

  let responseText = ''

  try {
    const unlistenChunk = await listen<string>('ai-chunk', (event) => {
      responseText += event.payload
    })

    const unlistenDone = await listen('ai-done', () => {
      try {
        // 尝试解析JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0])
          scoreResult.value = result
          hasScoreResult.value = true
        } else {
          toast.error('评分结果解析失败')
        }
      } catch (e) {
        console.error('Parse error:', e)
        toast.error('评分结果解析失败')
      }
      isScoring.value = false
      unlistenChunk()
      unlistenDone()
    })

    await invoke('ai_request', {
      endpoint: config.endpoint,
      apiKey: config.apiKey || '',
      model: config.model,
      apiType: config.type,
      messages: [{ role: 'user', content: scoringPrompt }]
    })
  } catch (error) {
    toast.error('评分失败: ' + error)
    isScoring.value = false
  }
}

// 开始优化
async function startOptimize() {
  if (!hasScoreResult.value) {
    toast.error('请先进行AI评分')
    return
  }

  const config = getDefaultApiConfig()
  if (!config) {
    toast.error('请先配置API')
    return
  }

  isOptimizing.value = true

  const optimizePrompt = buildOptimizePrompt({
    originalPrompt: promptInput.value,
    totalScore: scoreResult.value.totalScore,
    suggestions: scoreResult.value.suggestions.map(s => s.title),
    intensity: optimizeIntensity.value,
    condition: optimizeCondition.value || undefined,
    direction: optimizeDirection.value || undefined
  })

  let responseText = ''

  try {
    const unlistenChunk = await listen<string>('ai-chunk', (event) => {
      responseText += event.payload
    })

    const unlistenDone = await listen('ai-done', () => {
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0])
          optimizeResult.value = result
          hasOptimizeResult.value = true
        } else {
          toast.error('优化结果解析失败')
        }
      } catch (e) {
        console.error('Parse error:', e)
        toast.error('优化结果解析失败')
      }
      isOptimizing.value = false
      unlistenChunk()
      unlistenDone()
    })

    await invoke('ai_request', {
      endpoint: config.endpoint,
      apiKey: config.apiKey || '',
      model: config.model,
      apiType: config.type,
      messages: [{ role: 'user', content: optimizePrompt }]
    })
  } catch (error) {
    toast.error('优化失败: ' + error)
    isOptimizing.value = false
  }
}

// 复制优化后的提示词
function copyOptimizedPrompt() {
  if (optimizeResult.value.optimizedPrompt) {
    navigator.clipboard.writeText(optimizeResult.value.optimizedPrompt)
    toast.success('已复制到剪贴板')
  }
}
</script>

<style scoped src="@/styles/prompt-scoring.css"></style>
