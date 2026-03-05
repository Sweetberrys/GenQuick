<template>
  <div class="quick-menu">
    <!-- 搜索框（可拖拽区域） -->
    <div class="search-box" ref="searchBoxRef">
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        type="text"
        :placeholder="activeTab === 'text' ? '搜索操作...' : '搜索图表类型...'"
        @keydown="handleKeydown"
      />
    </div>

    <!-- Tab 切换栏 -->
    <div class="tab-bar">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'text' }"
        @click="activeTab = 'text'"
      >
        <SvgIcon name="text-edit" :size="15" class="tab-icon" />
        <span>文本处理</span>
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'chart' }"
        @click="activeTab = 'chart'"
      >
        <SvgIcon name="chart" :size="15" class="tab-icon" />
        <span>图表生成</span>
      </button>
    </div>

    <!-- 提示词列表（文本处理） -->
    <div v-if="activeTab === 'text'" class="menu-list">
      <div
        v-for="(prompt, index) in filteredPrompts"
        :key="prompt.id"
        class="menu-item"
        :class="{ active: index === activeIndex }"
        @click="selectPrompt(prompt)"
        @mouseenter="activeIndex = index"
      >
        <SvgIcon v-if="isSvgIconName(prompt.icon)" :name="prompt.icon" :size="18" class="icon-svg" />
        <span v-else class="icon">{{ prompt.icon }}</span>
        <span class="name">{{ prompt.name }}</span>
        <span class="shortcut">{{ index + 1 }}</span>
      </div>

      <div v-if="filteredPrompts.length === 0" class="empty">
        未找到匹配的操作
      </div>
    </div>

    <!-- 图表类型列表 -->
    <div v-else class="menu-list">
      <div
        v-for="(chart, index) in filteredCharts"
        :key="chart.id"
        class="menu-item"
        :class="{ active: index === activeIndex }"
        @click="selectChart(chart)"
        @mouseenter="activeIndex = index"
      >
        <SvgIcon :name="getChartIcon(chart.id)" :size="18" class="icon-svg" />
        <span class="name">{{ chart.name }}</span>
        <span class="desc">{{ chart.description }}</span>
        <span class="shortcut">{{ index + 1 }}</span>
      </div>

      <div v-if="filteredCharts.length === 0" class="empty">
        未找到匹配的图表类型
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="menu-footer">
      <span>GenQuick 你的快捷 AI 助手</span>
      <span>Esc 关闭</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { usePromptsStore } from '@/stores/prompts'
import { CHART_CONFIGS } from '@/types'
import type { Prompt, ChartConfig, ChartType } from '@/types'
import SvgIcon from './icons/SvgIcon.vue'

const emit = defineEmits<{
  select: [prompt: Prompt]
  selectChart: [chart: ChartConfig]
  close: []
}>()

const promptsStore = usePromptsStore()

const searchInputRef = ref<HTMLInputElement>()
const searchBoxRef = ref<HTMLElement>()
const searchQuery = ref('')
const activeIndex = ref(0)
const activeTab = ref<'text' | 'chart'>('text')

// 图表类型对应的图标映射
function getChartIcon(chartId: ChartType): string {
  const iconMap: Record<ChartType, string> = {
    'mermaid': 'flowchart',
    'graphviz': 'chart',
    'echarts': 'line-chart',
    'wordcloud': 'cloud',
    'markmap': 'git-branch',
  }
  return iconMap[chartId] || 'chart'
}

// 判断是否为 SVG 图标名称（非 emoji）
function isSvgIconName(icon: string): boolean {
  if (!icon || icon.length === 0) return false
  // SVG 图标名称只包含小写字母、数字和连字符，且长度通常大于1
  // emoji 通常是单个或少数几个 Unicode 字符
  return /^[a-z][a-z0-9-]*$/.test(icon) && icon.length > 1
}

// 过滤提示词
const filteredPrompts = computed(() => {
  if (!searchQuery.value) return promptsStore.prompts
  const query = searchQuery.value.toLowerCase()
  return promptsStore.prompts.filter(p =>
    p.name.toLowerCase().includes(query)
  )
})

// 过滤图表类型
const filteredCharts = computed(() => {
  if (!searchQuery.value) return CHART_CONFIGS
  const query = searchQuery.value.toLowerCase()
  return CHART_CONFIGS.filter(c =>
    c.name.toLowerCase().includes(query) ||
    c.description.toLowerCase().includes(query)
  )
})

// 当前列表长度
const currentListLength = computed(() => {
  return activeTab.value === 'text' 
    ? filteredPrompts.value.length 
    : filteredCharts.value.length
})

// 当过滤结果或 Tab 变化时重置 activeIndex
watch([filteredPrompts, filteredCharts, activeTab], () => {
  activeIndex.value = 0
})

// 选择提示词
function selectPrompt(prompt: Prompt) {
  console.log('QuickMenu: 点击了', prompt.name)
  emit('select', prompt)
}

// 选择图表类型
function selectChart(chart: ChartConfig) {
  console.log('QuickMenu: 选择图表类型', chart.name)
  emit('selectChart', chart)
}

// 键盘导航
function handleKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault()
      activeIndex.value = Math.max(0, activeIndex.value - 1)
      break
    case 'ArrowDown':
      e.preventDefault()
      activeIndex.value = Math.min(currentListLength.value - 1, activeIndex.value + 1)
      break
    case 'Tab':
      e.preventDefault()
      activeTab.value = activeTab.value === 'text' ? 'chart' : 'text'
      searchQuery.value = ''
      break
    case 'Enter':
      e.preventDefault()
      if (activeTab.value === 'text') {
        if (filteredPrompts.value[activeIndex.value]) {
          selectPrompt(filteredPrompts.value[activeIndex.value])
        }
      } else {
        if (filteredCharts.value[activeIndex.value]) {
          selectChart(filteredCharts.value[activeIndex.value])
        }
      }
      break
    case 'Escape':
      e.preventDefault()
      emit('close')
      break
    default:
      // 数字键快速选择 (1-9)
      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1
        if (activeTab.value === 'text') {
          if (filteredPrompts.value[index]) {
            selectPrompt(filteredPrompts.value[index])
          }
        } else {
          if (filteredCharts.value[index]) {
            selectChart(filteredCharts.value[index])
          }
        }
      }
  }
}

onMounted(() => {
  searchInputRef.value?.focus()
  
  // 设置拖拽功能
  if (searchBoxRef.value) {
    const currentWindow = getCurrentWindow()
    
    searchBoxRef.value.addEventListener('mousedown', async (e) => {
      // 如果点击的是输入框，不触发拖拽
      if ((e.target as HTMLElement).tagName === 'INPUT') {
        return
      }
      await currentWindow.startDragging()
    })
  }
})
</script>

<style scoped lang="scss">
/*
 * QuickMenu 组件样式
 * 注意：不要在这里设置 border-radius，由父容器 .main-view 统一控制
 */
.quick-menu {
  width: 100%;
  height: 100%;
  background: var(--bg-primary);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.search-box {
  padding: 12px;
  flex-shrink: 0;

  input {
    width: 100%;
    padding: 10px 14px;
    border: 1.5px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-tertiary);
    color: var(--text-primary);
    font-size: 14px;
    transition: all 0.2s;

    &:focus {
      border-color: var(--accent-color);
      background: var(--bg-primary);
      box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.1);
    }

    &::placeholder {
      color: var(--text-tertiary);
    }
  }
}

.tab-bar {
  display: flex;
  padding: 0 12px 8px;
  gap: 8px;
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1.5px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  &.active {
    background: var(--accent-color);
    border-color: var(--accent-color);
    color: white;
  }

  .tab-icon {
    flex-shrink: 0;
  }
}

.menu-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin: 2px 0;
  cursor: pointer;
  transition: all 0.15s;
  gap: 12px;
  border-radius: 8px;
  color: var(--text-primary);

  &:hover {
    background: var(--bg-secondary);
  }

  &.active {
    background: var(--accent-color);
    color: white;

    .shortcut {
      color: rgba(255, 255, 255, 0.8);
      background: rgba(255, 255, 255, 0.2);
    }

    .desc {
      color: rgba(255, 255, 255, 0.7);
    }
  }

  .icon {
    font-size: 18px;
    width: 26px;
    text-align: center;
    flex-shrink: 0;
  }

  .icon-svg {
    width: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .name {
    flex: 1;
    font-size: 14px;
    font-weight: 450;
  }

  .desc {
    font-size: 12px;
    color: var(--text-tertiary);
    margin-right: 8px;
  }

  .shortcut {
    font-size: 11px;
    color: var(--text-tertiary);
    font-family: "Cascadia Code", "Consolas", monospace;
    background: var(--bg-secondary);
    padding: 2px 7px;
    border-radius: 4px;
    flex-shrink: 0;
  }
}

.empty {
  padding: 32px;
  text-align: center;
  color: var(--text-tertiary);
}

.menu-footer {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 10px 16px;
  border-top: 1px solid var(--border-color-light);
  font-size: 12px;
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  flex-shrink: 0;
}
</style>
