<template>
  <div class="pm-tree-node" :class="{ collapsed: isCollapsed }" :data-level="level">
    <!-- 根节点 -->
    <div 
      v-if="folder === null"
      class="pm-tree-item"
      :class="{ active: currentFolderId === null }"
      @click="$emit('select', null)"
    >
      <span class="pm-arrow-placeholder"></span>
      <SvgIcon name="folder" :size="18" class="pm-folder-icon" />
      <span class="pm-node-name">全部提示词</span>
      <span class="pm-node-count">{{ promptsStore.customPrompts.length }}</span>
    </div>
    
    <!-- 普通文件夹节点 -->
    <div 
      v-else
      class="pm-tree-item"
      :class="{ active: currentFolderId === folder.id }"
      @click="handleClick"
    >
      <SvgIcon 
        v-if="hasChildren" 
        name="chevron-down" 
        :size="16" 
        class="pm-arrow-icon"
      />
      <span v-else class="pm-arrow-placeholder"></span>
      <SvgIcon name="folder" :size="18" class="pm-folder-icon" />
      <span class="pm-node-name">{{ folder.name }}</span>
      <div class="pm-tree-item-actions">
        <button class="pm-tree-item-action" title="编辑" @click.stop="$emit('edit', folder)">
          <SvgIcon name="edit" :size="14" />
        </button>
        <button class="pm-tree-item-action" title="删除" @click.stop="$emit('delete', folder)">
          <SvgIcon name="trash" :size="14" />
        </button>
      </div>
      <span class="pm-node-count">{{ promptsStore.getTotalPromptCount(folder.id) }}</span>
    </div>

    <!-- 子节点 -->
    <div class="pm-tree-children" v-if="!isCollapsed">
      <TreeNode
        v-for="child in childFolders"
        :key="child.id"
        :folder="child"
        :level="level + 1"
        :current-folder-id="currentFolderId"
        :collapsed-folders="collapsedFolders"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePromptsStore } from '@/stores/prompts'
import type { PromptFolder } from '@/types'
import SvgIcon from '@/components/icons/SvgIcon.vue'

const props = defineProps<{
  folder: PromptFolder | null
  level: number
  currentFolderId: string | null
  collapsedFolders: Set<string>
}>()

const emit = defineEmits<{
  select: [folderId: string | null]
  toggle: [folderId: string]
  edit: [folder: PromptFolder]
  delete: [folder: PromptFolder]
}>()

const promptsStore = usePromptsStore()

const childFolders = computed(() => {
  if (props.folder === null) {
    return promptsStore.getChildFolders(null)
  }
  return promptsStore.getChildFolders(props.folder.id)
})

const hasChildren = computed(() => childFolders.value.length > 0)

const isCollapsed = computed(() => {
  if (props.folder === null) return false
  return props.collapsedFolders.has(props.folder.id)
})

function handleClick() {
  if (props.folder) {
    if (hasChildren.value) {
      emit('toggle', props.folder.id)
    }
    emit('select', props.folder.id)
  }
}
</script>

<style scoped>
.pm-tree-node {
  user-select: none;
}

.pm-tree-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.1s;
  gap: 8px;
  position: relative;
}

.pm-tree-item:hover {
  background: var(--bg-secondary);
}

.pm-tree-item:hover .pm-tree-item-actions {
  opacity: 1;
}

.pm-tree-item.active {
  background: var(--bg-tertiary);
  color: var(--accent-color);
}

.pm-tree-item.active .pm-folder-icon {
  color: var(--accent-color);
}

/* 缩进 */
.pm-tree-node[data-level="2"] .pm-tree-item { padding-left: 36px; }
.pm-tree-node[data-level="3"] .pm-tree-item { padding-left: 56px; }
.pm-tree-node[data-level="4"] .pm-tree-item { padding-left: 76px; }

.pm-arrow-icon {
  width: 16px;
  height: 16px;
  color: var(--text-tertiary);
  flex-shrink: 0;
  transition: transform 0.2s;
}

.pm-tree-node.collapsed .pm-arrow-icon {
  transform: rotate(-90deg);
}

.pm-arrow-placeholder {
  width: 16px;
  flex-shrink: 0;
}

.pm-folder-icon {
  width: 18px;
  height: 18px;
  color: #f5a623;
  flex-shrink: 0;
}

.pm-node-name {
  flex: 1;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pm-node-count {
  font-size: 11px;
  color: var(--text-tertiary);
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 10px;
  flex-shrink: 0;
}

.pm-tree-item-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
  margin-left: auto;
}

.pm-tree-item-action {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-tertiary);
  background: transparent;
  border: none;
}

.pm-tree-item-action:hover {
  background: var(--border-color);
  color: var(--text-secondary);
}

.pm-tree-children {
  overflow: hidden;
}

.pm-tree-node.collapsed > .pm-tree-children {
  display: none;
}
</style>
