import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useConfigStore } from '@/stores/config'
import { extractBase64Data } from '@/utils/imageProcessor'

export function useAI() {
  const isLoading = ref(false)
  const content = ref('')
  const error = ref<string | null>(null)
  const isDone = ref(false)

  let unlistenChunk: (() => void) | null = null
  let unlistenDone: (() => void) | null = null

  // 开始流式请求（支持图片）
  async function startStream(prompt: string, images?: string[]) {
    isLoading.value = true
    content.value = ''
    error.value = null
    isDone.value = false

    // 获取激活的 API 配置
    const configStore = useConfigStore()
    const activeConfig = configStore.activeConfig

    if (!activeConfig) {
      error.value = '请先配置 API'
      isLoading.value = false
      return
    }

    // 监听流式响应
    unlistenChunk = await listen<string>('ai-chunk', (event) => {
      content.value += event.payload
    })

    unlistenDone = await listen('ai-done', () => {
      isLoading.value = false
      isDone.value = true
      cleanup()
    })

    try {
      // 处理图片：提取纯 Base64 数据
      const imageDataList = images?.map(img => extractBase64Data(img)) || []
      
      await invoke('ai_request', {
        endpoint: activeConfig.endpoint,
        apiKey: activeConfig.apiKey || '',
        model: activeConfig.model,
        apiType: activeConfig.type,
        messages: [{ role: 'user', content: prompt, images: imageDataList.length > 0 ? imageDataList : undefined }]
      })
    } catch (e) {
      error.value = e as string
      isLoading.value = false
      cleanup()
    }
  }

  // 取消请求
  async function cancel() {
    await invoke('ai_cancel')
    isLoading.value = false
    cleanup()
  }

  // 清理监听器
  function cleanup() {
    if (unlistenChunk) {
      unlistenChunk()
      unlistenChunk = null
    }
    if (unlistenDone) {
      unlistenDone()
      unlistenDone = null
    }
  }

  // 重置状态
  function reset() {
    content.value = ''
    error.value = null
    isDone.value = false
    isLoading.value = false
  }

  return {
    isLoading,
    content,
    error,
    isDone,
    startStream,
    cancel,
    reset
  }
}
