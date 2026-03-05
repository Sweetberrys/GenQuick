<template>
  <div class="panel">
    <h2>常规设置</h2>
    <p class="desc">自定义应用的基本行为，所有更改自动保存</p>
    
    <div class="settings-group">
      <div class="settings-group-title">启动选项</div>
      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">开机自动启动</div>
          <div class="settings-item-desc">登录 Windows 时自动运行 GenQuick</div>
        </div>
        <div class="settings-item-control">
          <div 
            class="toggle-switch" 
            :class="{ active: settingsStore.settings.autoStart }"
            @click="toggleAutoStart"
          ></div>
        </div>
      </div>
    </div>

    <div class="settings-group">
      <div class="settings-group-title">外观</div>
      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">主题模式</div>
          <div class="settings-item-desc">选择界面的配色方案</div>
        </div>
        <div class="settings-item-control">
          <div class="theme-switcher">
            <button 
              class="theme-btn"
              :class="{ active: settingsStore.settings.theme === 'light' }"
              @click="setTheme('light')"
            >
              <SvgIcon name="eye" :size="16" />
              <span>明亮</span>
            </button>
            <button 
              class="theme-btn"
              :class="{ active: settingsStore.settings.theme === 'dark' }"
              @click="setTheme('dark')"
            >
              <SvgIcon name="eye-off" :size="16" />
              <span>暗黑</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-group">
      <div class="settings-group-title">快捷键</div>
      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">全局激活快捷键</div>
          <div class="settings-item-desc">选中文本后按此快捷键激活菜单</div>
          <div class="settings-item-desc">(支持功能键+数字/字母)</div>
        </div>
        <div class="settings-item-control">
          <div class="shortcut-recorder">
            <div 
              class="shortcut-display"
              :class="{ recording: isRecordingShortcut }"
              @click="startRecordingShortcut"
            >
              <template v-if="isRecordingShortcut">
                <span class="recording-text">按下快捷键...</span>
              </template>
              <template v-else>
                <span class="shortcut-keys">{{ settingsStore.settings.shortcut || '点击设置' }}</span>
              </template>
            </div>
            <button 
              v-if="isRecordingShortcut" 
              class="btn-icon"
              @click="cancelRecording"
              title="取消"
            >
              <SvgIcon name="close" :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 保存状态提示 -->
    <div v-if="saveStatus" class="save-status" :class="saveStatus.type">
      <SvgIcon :name="saveStatus.type === 'success' ? 'check' : 'error'" :size="14" />
      <span>{{ saveStatus.message }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import '@/styles/settings-general.css'
import { ref, onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart'
import SvgIcon from '@/components/icons/SvgIcon.vue'

const settingsStore = useSettingsStore()

const isRecordingShortcut = ref(false)
const recordedKeys = ref<string[]>([])
const saveStatus = ref<{ type: 'success' | 'error'; message: string } | null>(null)

// 显示保存状态
function showSaveStatus(type: 'success' | 'error', message: string) {
  saveStatus.value = { type, message }
  setTimeout(() => { saveStatus.value = null }, 2000)
}

// 切换开机自启动（自动保存）
async function toggleAutoStart() {
  try {
    const newValue = !settingsStore.settings.autoStart
    if (newValue) {
      await enable()
    } else {
      await disable()
    }
    settingsStore.settings.autoStart = newValue
    await settingsStore.saveSettings()
    showSaveStatus('success', '已保存')
  } catch (error) {
    console.error('设置开机自启动失败:', error)
    showSaveStatus('error', `设置失败: ${error}`)
  }
}

// 设置主题（自动保存）
async function setTheme(theme: 'light' | 'dark') {
  try {
    settingsStore.settings.theme = theme
    await settingsStore.saveSettings()
    showSaveStatus('success', '已保存')
  } catch (error) {
    console.error('保存主题失败:', error)
    showSaveStatus('error', '保存失败')
  }
}

// 初始化时同步自启动状态
async function syncAutoStartStatus() {
  try {
    const enabled = await isEnabled()
    settingsStore.settings.autoStart = enabled
  } catch (error) {
    console.error('获取自启动状态失败:', error)
  }
}

function startRecordingShortcut() {
  isRecordingShortcut.value = true
  recordedKeys.value = []
}

// 禁止使用的快捷键列表
const FORBIDDEN_SHORTCUTS = ['Ctrl+C', 'Ctrl+V', 'Ctrl+X', 'Ctrl+A', 'Ctrl+Z']

async function handleKeyDown(e: KeyboardEvent) {
  if (!isRecordingShortcut.value) return
  
  e.preventDefault()
  e.stopPropagation()
  
  const keys: string[] = []
  
  if (e.ctrlKey) keys.push('Ctrl')
  if (e.shiftKey) keys.push('Shift')
  if (e.altKey) keys.push('Alt')
  if (e.metaKey) keys.push('Meta')
  
  if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
    const key = e.key.toUpperCase()
    if (key.length === 1 || /^F\d+$/.test(key)) {
      keys.push(key)
    }
  }
  
  const modifierCount = keys.filter(k => ['Ctrl', 'Shift', 'Alt', 'Meta'].includes(k)).length
  const mainKeyCount = keys.length - modifierCount
  
  if (modifierCount >= 1 && mainKeyCount === 1) {
    const newShortcut = keys.join('+')
    
    // 校验：禁止系统快捷键
    if (FORBIDDEN_SHORTCUTS.includes(newShortcut)) {
      showSaveStatus('error', `${newShortcut} 是系统快捷键，无法使用`)
      return
    }
    
    // 校验：禁止与当前快捷键相同
    if (newShortcut === settingsStore.settings.shortcut) {
      showSaveStatus('error', '与当前快捷键相同，请选择其他组合')
      isRecordingShortcut.value = false
      return
    }
    
    recordedKeys.value = keys
    settingsStore.settings.shortcut = newShortcut
    isRecordingShortcut.value = false
    
    // 自动保存快捷键
    try {
      await settingsStore.updateShortcut(newShortcut)
      await settingsStore.saveSettings()
      showSaveStatus('success', '快捷键已保存')
    } catch (error) {
      const errorMsg = String(error)
      if (errorMsg.includes('HotKey already registered') || errorMsg.includes('already registered')) {
        showSaveStatus('success', '快捷键已保存')
      } else {
        showSaveStatus('error', '快捷键保存失败')
      }
    }
  }
}

function cancelRecording() {
  isRecordingShortcut.value = false
  recordedKeys.value = []
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  syncAutoStartStatus()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped src="@/styles/settings-general.css"></style>
