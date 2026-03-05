<template>
  <div class="panel">
    <div class="panel-header">
      <div>
        <h2>API 配置</h2>
        <p class="desc">配置大模型的 API 信息，支持多个配置切换</p>
      </div>
      <button class="btn secondary" @click="showAddApiModal = true">
        <SvgIcon name="plus" :size="12" />
        <span>添加配置</span>
      </button>
    </div>

    <!-- API类型Tab -->
    <div class="api-tabs">
      <button 
        v-for="(info, type) in API_TYPE_INFO" 
        :key="type"
        class="api-tab"
        :class="{ active: apiConfigTab === type }"
        @click="apiConfigTab = type as ApiType"
      >
        {{ info.name }}
      </button>
    </div>
    
    <!-- API 配置列表 -->
    <div class="api-list">
      <div 
        v-for="config in configStore.apiConfigs.filter(c => c.type === apiConfigTab)" 
        :key="config.id" 
        class="api-card"
        :class="{ active: config.id === configStore.activeApiId }"
      >
        <div class="api-card-header">
          <div class="api-info">
            <span class="api-type-badge" :class="config.type">
              {{ API_TYPE_INFO[config.type as ApiType]?.name || config.type }}
            </span>
            <span class="api-name">{{ config.name }}</span>
          </div>
          <div class="api-actions">
            <button 
              v-if="config.id !== configStore.activeApiId"
              class="btn-text primary"
              @click="setActiveApi(config.id)"
            >
              设为当前
            </button>
            <span v-else class="active-badge">✓ 当前使用</span>
            <button class="btn-icon" @click="editApi(config)" title="编辑">
              <SvgIcon name="edit" :size="14" />
            </button>
            <button class="btn-icon danger" @click="deleteApi(config.id)" title="删除">
              <SvgIcon name="trash" :size="14" />
            </button>
          </div>
        </div>
        <div class="api-card-body">
          <div class="api-detail">
            <span class="label">端点:</span>
            <span class="value">{{ config.endpoint }}</span>
          </div>
          <div class="api-detail">
            <span class="label">模型:</span>
            <span class="value">{{ config.model }}</span>
          </div>
          <div class="api-detail">
            <span class="label">API Key:</span>
            <span class="value">{{ maskApiKey(config.apiKey) }}</span>
          </div>
        </div>
      </div>

      <div v-if="configStore.apiConfigs.filter(c => c.type === apiConfigTab).length === 0" class="empty-state">
        <SvgIcon name="api" :size="48" class="empty-icon" />
        <p>暂无 {{ API_TYPE_INFO[apiConfigTab].name }} 配置</p>
      </div>
    </div>

    <!-- 添加/编辑 API 配置弹窗 -->
    <div v-if="showAddApiModal || editingApi" class="modal-overlay" @click.self="closeApiModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingApi ? '编辑 API 配置' : '添加 API 配置' }}</h3>
          <button class="btn-icon" @click="closeApiModal">
            <SvgIcon name="close" :size="14" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>配置名称 *</label>
            <input v-model="apiForm.name" type="text" placeholder="例如：我的 OpenAI" />
          </div>
          
          <div class="form-group">
            <label>API 类型 *</label>
            <div class="api-type-selector">
              <div 
                v-for="(info, type) in API_TYPE_INFO" 
                :key="type"
                class="api-type-option"
                :class="{ active: apiForm.type === type }"
                @click="selectApiType(type as ApiType)"
              >
                <span class="type-name">{{ info.name }}</span>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label>API 端点 *</label>
            <input v-model="apiForm.endpoint" type="text" :placeholder="currentTypeInfo?.defaultEndpoint" />
          </div>
          
          <div class="form-group">
            <label>API Key {{ currentTypeInfo?.requiresApiKey ? '*' : '(可选)' }}</label>
            <input v-model="apiForm.apiKey" type="password" :placeholder="currentTypeInfo?.requiresApiKey ? 'sk-...' : '留空即可'" />
          </div>
          
          <div class="form-group">
            <label>模型 *</label>
            <input v-model="apiForm.model" type="text" :placeholder="currentTypeInfo?.modelPlaceholder" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" @click="closeApiModal">取消</button>
          <button class="btn primary" @click="saveApiForm" :disabled="!isApiFormValid">
            {{ editingApi ? '保存' : '添加' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import '@/styles/settings-api.css'
import { ref, reactive, computed } from 'vue'
import { useConfigStore } from '@/stores/config'
import { useToast } from '@/composables/useToast'
import type { ApiConfig, ApiType } from '@/types'
import { API_TYPE_INFO } from '@/types'
import SvgIcon from '@/components/icons/SvgIcon.vue'

const configStore = useConfigStore()
const toast = useToast()

const apiConfigTab = ref<ApiType>('openai')
const showAddApiModal = ref(false)
const editingApi = ref<ApiConfig | null>(null)

const apiForm = reactive({
  name: '',
  type: 'openai' as ApiType,
  endpoint: API_TYPE_INFO.openai.defaultEndpoint,
  apiKey: '',
  model: ''
})

const currentTypeInfo = computed(() => API_TYPE_INFO[apiForm.type])

const isApiFormValid = computed(() => {
  const requiresApiKey = API_TYPE_INFO[apiForm.type]?.requiresApiKey ?? true
  return apiForm.name && apiForm.endpoint && apiForm.model && (requiresApiKey ? apiForm.apiKey : true)
})

function selectApiType(type: ApiType) {
  const oldType = apiForm.type
  const oldTypeInfo = API_TYPE_INFO[oldType]
  const newTypeInfo = API_TYPE_INFO[type]
  
  apiForm.type = type
  
  // 如果 endpoint 为空或是旧类型的默认值，则更新为新类型的默认值
  if (!apiForm.endpoint || apiForm.endpoint === oldTypeInfo?.defaultEndpoint) {
    apiForm.endpoint = newTypeInfo.defaultEndpoint
  }
}

function resetApiForm() {
  apiForm.name = ''
  apiForm.type = 'openai'
  apiForm.endpoint = API_TYPE_INFO.openai.defaultEndpoint
  apiForm.apiKey = ''
  apiForm.model = ''
}

function editApi(config: ApiConfig) {
  editingApi.value = config
  apiForm.name = config.name
  apiForm.type = config.type as ApiType
  apiForm.endpoint = config.endpoint
  apiForm.apiKey = config.apiKey
  apiForm.model = config.model
}

function closeApiModal() {
  showAddApiModal.value = false
  editingApi.value = null
  resetApiForm()
}

async function saveApiForm() {
  try {
    if (editingApi.value) {
      await configStore.updateApiConfig(editingApi.value.id, {
        name: apiForm.name,
        type: apiForm.type,
        endpoint: apiForm.endpoint,
        apiKey: apiForm.apiKey,
        model: apiForm.model
      })
    } else {
      await configStore.addApiConfig({
        name: apiForm.name,
        type: apiForm.type,
        endpoint: apiForm.endpoint,
        apiKey: apiForm.apiKey,
        model: apiForm.model
      })
    }
    closeApiModal()
  } catch (error) {
    console.error('保存失败:', error)
    toast.error('保存失败: ' + error)
  }
}

async function setActiveApi(id: string) {
  await configStore.setActiveConfig(id)
}

async function deleteApi(id: string) {
  const confirmed = await toast.confirm({
    title: '删除 API 配置',
    message: '确定要删除这个 API 配置吗？',
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger'
  })
  
  if (confirmed) {
    try {
      await configStore.deleteApiConfig(id)
      toast.success('API 配置已删除')
    } catch (error) {
      toast.error('删除失败: ' + error)
    }
  }
}

function maskApiKey(key: string) {
  if (!key) return ''
  if (key.length <= 8) return '****'
  return key.substring(0, 4) + '****' + key.substring(key.length - 4)
}
</script>

<style scoped src="@/styles/settings-api.css"></style>
