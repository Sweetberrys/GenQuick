import { ref, computed } from 'vue'

const MAX_HISTORY = 50

export function useHistory(
  getState: () => string,
  setState: (state: string) => Promise<void>
) {
  const history = ref<string[]>([])
  const historyIndex = ref(-1)
  const isRestoring = ref(false)

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  // 保存状态
  function saveState() {
    if (isRestoring.value) return

    const state = getState()
    
    // 如果不是在历史末尾，删除后面的历史
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }

    history.value.push(state)
    historyIndex.value = history.value.length - 1

    // 限制历史记录数量
    if (history.value.length > MAX_HISTORY) {
      history.value.shift()
      historyIndex.value--
    }
  }

  // 撤销
  async function undo() {
    if (!canUndo.value) return

    isRestoring.value = true
    historyIndex.value--
    await setState(history.value[historyIndex.value])
    isRestoring.value = false
  }

  // 重做
  async function redo() {
    if (!canRedo.value) return

    isRestoring.value = true
    historyIndex.value++
    await setState(history.value[historyIndex.value])
    isRestoring.value = false
  }

  // 初始化
  function init() {
    history.value = []
    historyIndex.value = -1
    saveState()
  }

  return {
    canUndo,
    canRedo,
    saveState,
    undo,
    redo,
    init,
  }
}
