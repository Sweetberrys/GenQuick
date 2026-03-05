<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'

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

// 监听主题变化
watch(() => settingsStore.settings.theme, (newTheme) => {
  applyTheme(newTheme)
}, { immediate: true })

// 监听系统主题变化
onMounted(async () => {
  await settingsStore.loadSettings()
  applyTheme(settingsStore.settings.theme)
  
  // 禁用右键菜单
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault()
  })
})
</script>

<style>
/*
 * 全局样式重置
 * 确保所有元素背景透明，让 Tauri 的透明窗口生效
 */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent !important;
}

body {
  font-family: "Segoe UI", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  user-select: none;
  -webkit-user-select: none;
}

/* 允许拖拽元素正常工作 */
[draggable="true"] {
  -webkit-user-drag: element;
  user-select: none;
}

/* 隐藏 Windows 系统的 resize 手柄 */
::-webkit-resizer {
  display: none !important;
  background: transparent !important;
}

/* 隐藏滚动条的 resize 角落 */
::-webkit-scrollbar-corner {
  background: transparent !important;
}
</style>
