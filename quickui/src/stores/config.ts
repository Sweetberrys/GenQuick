import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { ApiConfig, ApiConfigStore } from '@/types'

export const useConfigStore = defineStore('config', () => {
  const apiConfigs = ref<ApiConfig[]>([])
  const activeApiId = ref<string | null>(null)
  const isLoading = ref(false)

  // 获取当前激活的配置
  const activeConfig = computed(() => {
    if (!activeApiId.value) return apiConfigs.value[0] || null
    return apiConfigs.value.find(c => c.id === activeApiId.value) || null
  })

  // 加载 API 配置
  async function loadApiConfigs() {
    try {
      const store = await invoke<ApiConfigStore>('get_api_configs')
      apiConfigs.value = store.configs
      activeApiId.value = store.activeId
    } catch (error) {
      console.error('加载 API 配置失败:', error)
    }
  }

  // 保存 API 配置
  async function saveApiConfigs() {
    try {
      await invoke('save_api_configs', {
        configs: {
          configs: apiConfigs.value,
          activeId: activeApiId.value
        }
      })
    } catch (error) {
      console.error('保存 API 配置失败:', error)
      throw error
    }
  }

  // 添加 API 配置
  async function addApiConfig(config: Omit<ApiConfig, 'id' | 'createdAt' | 'isActive'>) {
    const newConfig: ApiConfig = {
      ...config,
      id: crypto.randomUUID(),
      isActive: apiConfigs.value.length === 0,
      createdAt: new Date().toISOString()
    }
    
    apiConfigs.value.push(newConfig)
    
    // 如果是第一个配置，自动设为激活
    if (apiConfigs.value.length === 1) {
      activeApiId.value = newConfig.id
    }
    
    await saveApiConfigs()
    return newConfig
  }

  // 更新 API 配置
  async function updateApiConfig(id: string, updates: Partial<ApiConfig>) {
    const index = apiConfigs.value.findIndex(c => c.id === id)
    if (index !== -1) {
      apiConfigs.value[index] = { ...apiConfigs.value[index], ...updates }
      await saveApiConfigs()
    }
  }

  // 删除 API 配置
  async function deleteApiConfig(id: string) {
    const index = apiConfigs.value.findIndex(c => c.id === id)
    if (index !== -1) {
      apiConfigs.value.splice(index, 1)
      
      // 如果删除的是激活的配置，切换到第一个
      if (activeApiId.value === id) {
        activeApiId.value = apiConfigs.value[0]?.id || null
      }
      
      await saveApiConfigs()
    }
  }

  // 设置激活的配置
  async function setActiveConfig(id: string) {
    activeApiId.value = id
    await saveApiConfigs()
  }

  return {
    apiConfigs,
    activeApiId,
    activeConfig,
    isLoading,
    loadApiConfigs,
    saveApiConfigs,
    addApiConfig,
    updateApiConfig,
    deleteApiConfig,
    setActiveConfig
  }
})
