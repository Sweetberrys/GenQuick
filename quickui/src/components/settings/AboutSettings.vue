<template>
  <div class="panel about">
    <div class="about-header">
      <img src="@/assets/GenQuick.png" alt="GenQuick" class="logo" />
      <h1>GenQuick</h1>
      <p class="version">版本 1.0.0</p>
    </div>
    
    <p class="about-desc">
      AI 智能助手，让处理更高效。
    </p>
    
    <div class="about-info">
      <div class="info-item">
        <span class="label">快捷键</span>
        <span class="value">Alt + 1</span>
      </div>
      <div class="info-item">
        <span class="label">数据目录</span>
        <span class="value clickable" @click="copyPath" :title="dataPath">{{ truncatedPath }}</span>
      </div>
      <div class="info-item">
        <span class="label">开发者</span>
        <span class="value">GenQuick Team</span>
      </div>
    </div>

    <div class="about-links">
      <a href="#" @click.prevent="openLink('https://github.com')">GitHub</a>
      <a href="#" @click.prevent="openLink('https://genquick.app')">官网</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import '@/styles/settings-about.css'
import { computed } from 'vue'
import { open } from '@tauri-apps/plugin-shell'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  dataPath: string
}>()

const toast = useToast()

// 截断路径显示，保留前15个字符，超过则显示 "前15个字符..."
const truncatedPath = computed(() => {
  if (!props.dataPath) return ''
  if (props.dataPath.length <= 30) return props.dataPath
  return props.dataPath.slice(0, 30) + '...'
})

async function openLink(url: string) {
  await open(url)
}

async function copyPath() {
  try {
    await navigator.clipboard.writeText(props.dataPath)
    toast.success('路径已复制')
  } catch (err) {
    console.error('复制失败:', err)
    toast.error('复制失败')
  }
}
</script>

<style scoped src="@/styles/settings-about.css"></style>
