import { defineStore } from 'pinia'
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export interface AppSettings {
  shortcut: string
  theme: 'light' | 'dark' | 'system'
  autoStart: boolean
  language: 'zh-CN' | 'en-US'
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({
    shortcut: 'Alt+1',
    theme: 'light',
    autoStart: false,
    language: 'zh-CN'
  })
  
  const isLoading = ref(false)

  // 加载设置
  async function loadSettings() {
    try {
      settings.value = await invoke<AppSettings>('cmd_get_settings')
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }

  // 保存设置
  async function saveSettings() {
    try {
      await invoke('cmd_save_settings', { settings: settings.value })
    } catch (error) {
      console.error('保存设置失败:', error)
      throw error
    }
  }

  // 更新快捷键
  async function updateShortcut(newShortcut: string) {
    try {
      isLoading.value = true
      await invoke('cmd_update_shortcut', { newShortcut })
      settings.value.shortcut = newShortcut
    } catch (error) {
      const errorMsg = String(error)
      // 如果快捷键已经注册（可能是当前快捷键），不抛出错误
      if (errorMsg.includes('HotKey already registered') || errorMsg.includes('already registered')) {
        console.log('快捷键已注册，保持当前设置:', newShortcut)
        settings.value.shortcut = newShortcut
        return
      }
      console.error('更新快捷键失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  return {
    settings,
    isLoading,
    loadSettings,
    saveSettings,
    updateShortcut
  }
})
