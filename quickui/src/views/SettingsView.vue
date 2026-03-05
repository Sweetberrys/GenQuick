<template>
  <div class="settings-wrapper">
    <div class="settings-view">
      <!-- 侧边栏 -->
      <div class="sidebar">
        <div class="sidebar-header" data-tauri-drag-region>
          <img src="@/assets/GenQuick.png" alt="GenQuick" class="logo" />
          <span class="title">GenQuick</span>
        </div>
        <nav class="nav">
          <div 
            v-for="item in navItems" 
            :key="item.id"
            class="nav-item"
            :class="{ active: activeTab === item.id }"
            @click="activeTab = item.id"
          >
            <SvgIcon :name="item.icon" :size="16" />
            <span class="text">{{ item.name }}</span>
          </div>
        </nav>
        <div class="sidebar-footer">
          <span class="version">v1.0.0</span>
        </div>
      </div>

      <!-- 内容区 -->
      <div class="content">
        <!-- 顶部标题栏（可拖拽） -->
        <div class="content-header">
          <span class="header-title" data-tauri-drag-region>{{ currentNavItem?.name }}</span>
          <WindowControls @close="closeWindow" />
        </div>

        <!-- 内容滚动区域 -->
        <div class="content-body">
          <!-- 常规设置 -->
          <GeneralSettings v-if="activeTab === 'general'" />

          <!-- API 配置 -->
          <ApiSettings v-if="activeTab === 'api'" />

          <!-- 提示词管理 -->
          <PromptsSettings v-if="activeTab === 'prompts'" />

          <!-- 提示词调优 -->
          <PromptTuning v-if="activeTab === 'tuning'" />

          <!-- 关于 -->
          <AboutSettings 
            v-if="activeTab === 'about'" 
            :data-path="dataPath"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import '@/styles/settings-base.css'
import { ref, computed, onMounted, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useConfigStore } from '@/stores/config'
import { usePromptsStore } from '@/stores/prompts'
import { useSettingsStore } from '@/stores/settings'
import SvgIcon from '@/components/icons/SvgIcon.vue'
import WindowControls from '@/components/WindowControls.vue'

// 设置组件
import GeneralSettings from '@/components/settings/GeneralSettings.vue'
import ApiSettings from '@/components/settings/ApiSettings.vue'
import PromptsSettings from '@/components/settings/PromptsSettings.vue'
import PromptTuning from '@/components/settings/PromptTuning.vue'
import AboutSettings from '@/components/settings/AboutSettings.vue'

const configStore = useConfigStore()
const promptsStore = usePromptsStore()
const settingsStore = useSettingsStore()

const activeTab = ref('general')
const dataPath = ref('')

const navItems = [
  { id: 'general', name: '常规设置', icon: 'settings' },
  { id: 'api', name: '大模型配置', icon: 'ai' },
  { id: 'prompts', name: '提示词管理', icon: 'edit' },
  { id: 'tuning', name: '提示词调优', icon: 'sparkles' },
  { id: 'about', name: '关于', icon: 'info' }
]

const currentNavItem = computed(() => {
  return navItems.find(item => item.id === activeTab.value)
})

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

// 关闭窗口
const closeWindow = async () => {
  console.log('=== 关闭按钮被点击 ===')
  try {
    const window = getCurrentWindow()
    await window.close()
  } catch (error) {
    console.error('关闭失败:', error)
    alert('关闭失败: ' + error)
  }
}

onMounted(async () => {
  await settingsStore.loadSettings()
  await configStore.loadApiConfigs()
  await promptsStore.loadPrompts()
  dataPath.value = await invoke<string>('get_data_path')
  
  // 应用主题
  applyTheme(settingsStore.settings.theme)
  
  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settingsStore.settings.theme === 'system') {
      applyTheme('system')
    }
  })
})

// 使用 watch 监听主题变化
watch(() => settingsStore.settings.theme, (newTheme) => {
  applyTheme(newTheme)
})
</script>

<style scoped>
/* 样式已通过 import 导入，这里可以添加额外的 scoped 样式 */
</style>
