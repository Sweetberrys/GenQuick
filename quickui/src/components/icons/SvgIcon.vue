<template>
  <svg 
    :width="size" 
    :height="size" 
    :viewBox="viewBox" 
    fill="none" 
    :stroke="stroke"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    :class="['svg-icon', `icon-${name}`]"
  >
    <component :is="iconComponent" />
  </svg>
</template>
<script setup lang="ts">
import { computed, defineComponent, h } from 'vue'

interface Props {
  name: string
  size?: number | string
  stroke?: string
  strokeWidth?: number | string
}

const props = withDefaults(defineProps<Props>(), {
  size: 16,
  stroke: 'currentColor',
  strokeWidth: 2
})

const viewBox = computed(() => '0 0 24 24')

// 图标路径定义
const icons: Record<string, any> = {
  // 光标/选择
  cursor: defineComponent({
    render: () => [
      h('path', { d: 'M4 4l7 17 2.5-6.5L20 12 4 4z' }),
      h('path', { d: 'M13.5 14.5L19 20' })
    ]
  }),

  // 画笔
  pencil: defineComponent({
    render: () => [
      h('path', { d: 'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z' }),
      h('path', { d: 'M15 5l4 4' })
    ]
  }),

  // 荧光笔/马克笔
  highlighter: defineComponent({
    render: () => [
      h('path', { d: 'M9 11l-6 6v3h9l3-3' }),
      h('path', { d: 'M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4' })
    ]
  }),

  // 橡皮擦
  eraser: defineComponent({
    render: () => [
      h('path', { d: 'M7 21h10' }),
      h('path', { d: 'M5.5 13.5L12 7l5 5-6.5 6.5a2.12 2.12 0 0 1-3 0L5.5 16.5a2.12 2.12 0 0 1 0-3z' })
    ]
  }),

  // 直线
  'line-tool': defineComponent({
    render: () => h('path', { d: 'M5 19L19 5' })
  }),

  // 箭头工具
  'arrow-tool': defineComponent({
    render: () => [
      h('path', { d: 'M5 12h14' }),
      h('path', { d: 'M13 5l7 7-7 7' })
    ]
  }),

  // 矩形工具
  'rect-tool': defineComponent({
    render: () => h('rect', { x: '3', y: '3', width: '18', height: '18', rx: '2' })
  }),

  // 圆形工具
  'circle-tool': defineComponent({
    render: () => h('circle', { cx: '12', cy: '12', r: '9' })
  }),

  // 文字工具
  'text-tool': defineComponent({
    render: () => [
      h('path', { d: 'M4 7V4h16v3' }),
      h('path', { d: 'M9 20h6' }),
      h('path', { d: 'M12 4v16' })
    ]
  }),

  // 马赛克工具
  'mosaic': defineComponent({
    render: () => [
      h('rect', { x: '3', y: '3', width: '6', height: '6', fill: 'currentColor', stroke: 'none' }),
      h('rect', { x: '15', y: '3', width: '6', height: '6', fill: 'currentColor', stroke: 'none' }),
      h('rect', { x: '9', y: '9', width: '6', height: '6', fill: 'currentColor', stroke: 'none' }),
      h('rect', { x: '3', y: '15', width: '6', height: '6', fill: 'currentColor', stroke: 'none' }),
      h('rect', { x: '15', y: '15', width: '6', height: '6', fill: 'currentColor', stroke: 'none' })
    ]
  }),

  // 撤销
  undo: defineComponent({
    render: () => [
      h('path', { d: 'M3 7v6h6' }),
      h('path', { d: 'M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13' })
    ]
  }),

  // 重做
  redo: defineComponent({
    render: () => [
      h('path', { d: 'M21 7v6h-6' }),
      h('path', { d: 'M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7' })
    ]
  }),

  // 编辑
  edit: defineComponent({
    render: () => h('path', { d: 'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z' })
  }),
  
  // 复制
  copy: defineComponent({
    render: () => [
      h('rect', { x: '9', y: '9', width: '13', height: '13', rx: '2' }),
      h('path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' })
    ]
  }),
  
  // 插入
  insert: defineComponent({
    render: () => [
      h('path', { d: 'M12 5v14' }),
      h('path', { d: 'M5 12h14' })
    ]
  }),

  // 前置插入（向左箭头+加号）
  'insert-before': defineComponent({
    render: () => [
      h('path', { d: 'M11 5v14' }),
      h('path', { d: 'M4 12h14' }),
      h('path', { d: 'M7 9l-3 3 3 3' })
    ]
  }),

  // 后置插入（向右箭头+加号）
  'insert-after': defineComponent({
    render: () => [
      h('path', { d: 'M13 5v14' }),
      h('path', { d: 'M6 12h14' }),
      h('path', { d: 'M17 9l3 3-3 3' })
    ]
  }),
  
  // 替换
  replace: defineComponent({
    render: () => [
      h('path', { d: 'M12 2v6m0 8v6' }),
      h('path', { d: 'M2 12h6m8 0h6' })
    ]
  }),
  
  // 重试
  retry: defineComponent({
    render: () => [
      h('path', { d: 'M21 2v6h-6' }),
      h('path', { d: 'M3 12a9 9 0 0 1 15-6.7L21 8' }),
      h('path', { d: 'M3 22v-6h6' }),
      h('path', { d: 'M21 12a9 9 0 0 1-15 6.7L3 16' })
    ]
  }),
  
  // 关闭
  close: defineComponent({
    render: () => [
      h('path', { d: 'M18 6L6 18' }),
      h('path', { d: 'M6 6l12 12' })
    ]
  }),
  
  // 发送
  send: defineComponent({
    render: () => [
      h('path', { d: 'M22 2L11 13' }),
      h('path', { d: 'M22 2l-7 20-4-9-9-4 20-7z' })
    ]
  }),
  
  // 附件/上传
  attachment: defineComponent({
    render: () => [
      h('path', { d: 'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48' })
    ]
  }),
  
  // 图片
  image: defineComponent({
    render: () => [
      h('rect', { x: '3', y: '3', width: '18', height: '18', rx: '2', ry: '2' }),
      h('circle', { cx: '9', cy: '9', r: '2' }),
      h('path', { d: 'M21 15l-5-5L5 21' })
    ]
  }),
  
  // 设置
  settings: defineComponent({
    render: () => [
      h('line', { x1: '4', y1: '6', x2: '20', y2: '6' }),
      h('line', { x1: '4', y1: '12', x2: '20', y2: '12' }),
      h('line', { x1: '4', y1: '18', x2: '20', y2: '18' }),
      h('circle', { cx: '8', cy: '6', r: '2' }),
      h('circle', { cx: '16', cy: '12', r: '2' }),
      h('circle', { cx: '10', cy: '18', r: '2' })
    ]
  }),

  // 大模型配置
  ai: defineComponent({
    render: () => [
      h('rect', { x: '4', y: '6', width: '16', height: '14', rx: '3' }),
      h('circle', { cx: '9', cy: '12', r: '1.5' }),
      h('circle', { cx: '15', cy: '12', r: '1.5' }),
      h('path', { d: 'M9 16h6' }),
      h('path', { d: 'M12 2v4' }),
      h('path', { d: 'M2 10h2m16 0h2' })
    ]
  }),

  // 大模型配置
  api:defineComponent({
    render: () => [
      h('rect', { x: '6', y: '6', width: '12', height: '12', rx: '2' }),
      h('path', { d: 'M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m12 0h4M2 15h4m12 0h4' }),
      h('circle', { cx: '12', cy: '12', r: '2' })
    ]
  }),
  
  // 删除
  trash: defineComponent({
    render: () => [
      h('path', { d: 'M3 6h18' }),
      h('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' }),
      h('path', { d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' })
    ]
  }),
  
  // 加号
  plus: defineComponent({
    render: () => [
      h('path', { d: 'M12 5v14' }),
      h('path', { d: 'M5 12h14' })
    ]
  }),
  
  // 减号
  minus: defineComponent({
    render: () => h('path', { d: 'M5 12h14' })
  }),
  
  // 检查/完成
  check: defineComponent({
    render: () => h('path', { d: 'M20 6L9 17l-5-5' })
  }),
  
  // 下载
  download: defineComponent({
    render: () => [
      h('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
      h('path', { d: 'M7 10l5 5 5-5' }),
      h('path', { d: 'M12 15V3' })
    ]
  }),
  
  // 搜索
  search: defineComponent({
    render: () => [
      h('circle', { cx: '11', cy: '11', r: '8' }),
      h('path', { d: 'M21 21l-4.35-4.35' })
    ]
  }),
  
  // 菜单
  menu: defineComponent({
    render: () => [
      h('path', { d: 'M3 12h18' }),
      h('path', { d: 'M3 6h18' }),
      h('path', { d: 'M3 18h18' })
    ]
  }),
  
  // 箭头向下
  'chevron-down': defineComponent({
    render: () => h('path', { d: 'M6 9l6 6 6-6' })
  }),
  
  // 箭头向上
  'chevron-up': defineComponent({
    render: () => h('path', { d: 'M18 15l-6-6-6 6' })
  }),
  
  // 箭头向左
  'chevron-left': defineComponent({
    render: () => h('path', { d: 'M15 18l-6-6 6-6' })
  }),
  
  // 箭头向右
  'chevron-right': defineComponent({
    render: () => h('path', { d: 'M9 18l6-6-6-6' })
  }),
  
  // 信息
  info: defineComponent({
    render: () => [
      h('circle', { cx: '12', cy: '12', r: '10' }),
      h('path', { d: 'M12 16v-4' }),
      h('path', { d: 'M12 8h.01' })
    ]
  }),
  
  // 警告
  alert: defineComponent({
    render: () => [
      h('path', { d: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' }),
      h('path', { d: 'M12 9v4' }),
      h('path', { d: 'M12 17h.01' })
    ]
  }),
  
  // 错误
  error: defineComponent({
    render: () => [
      h('circle', { cx: '12', cy: '12', r: '10' }),
      h('path', { d: 'M15 9l-6 6' }),
      h('path', { d: 'M9 9l6 6' })
    ]
  }),
  
  // 成功
  success: defineComponent({
    render: () => [
      h('circle', { cx: '12', cy: '12', r: '10' }),
      h('path', { d: 'M9 12l2 2 4-4' })
    ]
  }),
  
  // 加载中/旋转
  loader: defineComponent({
    render: () => [
      h('path', { d: 'M21 12a9 9 0 1 1-6.219-8.56' })
    ]
  }),
  
  // 眼睛（显示）
  eye: defineComponent({
    render: () => [
      h('path', { d: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' }),
      h('circle', { cx: '12', cy: '12', r: '3' })
    ]
  }),
  
  // 眼睛关闭（隐藏）
  'eye-off': defineComponent({
    render: () => [
      h('path', { d: 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24' }),
      h('path', { d: 'M1 1l22 22' })
    ]
  }),
  
  // 外部链接
  'external-link': defineComponent({
    render: () => [
      h('path', { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' }),
      h('path', { d: 'M15 3h6v6' }),
      h('path', { d: 'M10 14L21 3' })
    ]
  }),
  
  // 刷新
  refresh: defineComponent({
    render: () => [
      h('path', { d: 'M21.5 2v6h-6' }),
      h('path', { d: 'M2.5 22v-6h6' }),
      h('path', { d: 'M2 11.5a10 10 0 0 1 18.8-4.3' }),
      h('path', { d: 'M22 12.5a10 10 0 0 1-18.8 4.2' })
    ]
  }),

  // 闪光/调优
  sparkles: defineComponent({
    render: () => [
      h('path', { d: 'M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z' }),
      h('path', { d: 'M19 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z' }),
      h('path', { d: 'M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z' })
    ]
  }),

  // 工具/扳手
  tool: defineComponent({
    render: () => [
      h('path', { d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' })
    ]
  }),

  // 火箭
  rocket: defineComponent({
    render: () => [
      h('path', { d: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z' }),
      h('path', { d: 'M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z' }),
      h('path', { d: 'M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0' }),
      h('path', { d: 'M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5' })
    ]
  }),

  // 聊天
  chat: defineComponent({
    render: () => h('path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' })
  }),

  // 文件夹
  folder: defineComponent({
    render: () => h('path', { d: 'M3 7c0-1.1.9-2 2-2h5l2 2h7c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z', fill: 'currentColor', stroke: 'none' })
  }),

  // 文件
  file: defineComponent({
    render: () => [
      h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
      h('polyline', { points: '14 2 14 8 20 8' }),
      h('line', { x1: '16', y1: '13', x2: '8', y2: '13' }),
      h('line', { x1: '16', y1: '17', x2: '8', y2: '17' })
    ]
  }),

  // 首页
  home: defineComponent({
    render: () => [
      h('path', { d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }),
      h('polyline', { points: '9 22 9 12 15 12 15 22' })
    ]
  }),

  // 排序
  sort: defineComponent({
    render: () => [
      h('line', { x1: '4', y1: '21', x2: '4', y2: '14' }),
      h('line', { x1: '4', y1: '10', x2: '4', y2: '3' }),
      h('line', { x1: '12', y1: '21', x2: '12', y2: '12' }),
      h('line', { x1: '12', y1: '8', x2: '12', y2: '3' }),
      h('line', { x1: '20', y1: '21', x2: '20', y2: '16' }),
      h('line', { x1: '20', y1: '12', x2: '20', y2: '3' })
    ]
  }),

  // 网格视图
  grid: defineComponent({
    render: () => [
      h('rect', { x: '3', y: '3', width: '7', height: '7' }),
      h('rect', { x: '14', y: '3', width: '7', height: '7' }),
      h('rect', { x: '14', y: '14', width: '7', height: '7' }),
      h('rect', { x: '3', y: '14', width: '7', height: '7' })
    ]
  }),

  // 列表视图
  list: defineComponent({
    render: () => [
      h('line', { x1: '8', y1: '6', x2: '21', y2: '6' }),
      h('line', { x1: '8', y1: '12', x2: '21', y2: '12' }),
      h('line', { x1: '8', y1: '18', x2: '21', y2: '18' }),
      h('line', { x1: '3', y1: '6', x2: '3.01', y2: '6' }),
      h('line', { x1: '3', y1: '12', x2: '3.01', y2: '12' }),
      h('line', { x1: '3', y1: '18', x2: '3.01', y2: '18' })
    ]
  }),

  // 更多（三个点）
  more: defineComponent({
    render: () => [
      h('circle', { cx: '12', cy: '12', r: '1' }),
      h('circle', { cx: '12', cy: '5', r: '1' }),
      h('circle', { cx: '12', cy: '19', r: '1' })
    ]
  }),

  // 文件文本
  'file-text': defineComponent({
    render: () => [
      h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
      h('polyline', { points: '14 2 14 8 20 8' }),
      h('line', { x1: '16', y1: '13', x2: '8', y2: '13' }),
      h('line', { x1: '16', y1: '17', x2: '8', y2: '17' }),
      h('line', { x1: '10', y1: '9', x2: '8', y2: '9' })
    ]
  }),

  // 闪电
  zap: defineComponent({
    render: () => h('polygon', { points: '13 2 3 14 12 14 11 22 21 10 12 10 13 2' })
  }),

  // 文件添加
  'file-plus': defineComponent({
    render: () => [
      h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
      h('polyline', { points: '14 2 14 8 20 8' }),
      h('line', { x1: '12', y1: '18', x2: '12', y2: '12' }),
      h('line', { x1: '9', y1: '15', x2: '15', y2: '15' })
    ]
  }),

  // 检查圆圈
  'check-circle': defineComponent({
    render: () => [
      h('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }),
      h('polyline', { points: '22 4 12 14.01 9 11.01' })
    ]
  }),

  // 柱状图
  'bar-chart': defineComponent({
    render: () => [
      h('line', { x1: '18', y1: '20', x2: '18', y2: '10' }),
      h('line', { x1: '12', y1: '20', x2: '12', y2: '4' }),
      h('line', { x1: '6', y1: '20', x2: '6', y2: '14' })
    ]
  }),

  // 警告圆圈
  'alert-circle': defineComponent({
    render: () => [
      h('circle', { cx: '12', cy: '12', r: '10' }),
      h('line', { x1: '12', y1: '8', x2: '12', y2: '12' }),
      h('line', { x1: '12', y1: '16', x2: '12.01', y2: '16' })
    ]
  }),

  // 指南针
  compass: defineComponent({
    render: () => [
      h('circle', { cx: '12', cy: '12', r: '10' }),
      h('polygon', { points: '16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76' })
    ]
  }),

  // 警告三角
  'alert-triangle': defineComponent({
    render: () => [
      h('path', { d: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' }),
      h('line', { x1: '12', y1: '9', x2: '12', y2: '13' }),
      h('line', { x1: '12', y1: '17', x2: '12.01', y2: '17' })
    ]
  }),

  // 标签
  tag: defineComponent({
    render: () => [
      h('path', { d: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z' }),
      h('line', { x1: '7', y1: '7', x2: '7.01', y2: '7' })
    ]
  }),

  // 帮助圆圈
  'help-circle': defineComponent({
    render: () => [
      h('circle', { cx: '12', cy: '12', r: '10' }),
      h('path', { d: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3' }),
      h('line', { x1: '12', y1: '17', x2: '12.01', y2: '17' })
    ]
  }),

  // 停止
  stop: defineComponent({
    render: () => h('rect', { x: '6', y: '6', width: '12', height: '12', rx: '2', fill: 'currentColor', stroke: 'none' })
  }),

  // 最小化
  minimize: defineComponent({
    render: () => h('line', { x1: '5', y1: '12', x2: '19', y2: '12' })
  }),

  // 最大化
  maximize: defineComponent({
    render: () => h('rect', { x: '6', y: '6', width: '12', height: '12', rx: '1' })
  }),

  // 还原（缩小）
  restore: defineComponent({
    render: () => [
      h('rect', { x: '8', y: '8', width: '12', height: '12', rx: '1' }),
      h('path', { d: 'M4 16V4h12' })
    ]
  }),

  // 两栏布局
  columns: defineComponent({
    render: () => [
      h('rect', { x: '3', y: '3', width: '7', height: '18', rx: '1' }),
      h('rect', { x: '14', y: '3', width: '7', height: '18', rx: '1' })
    ]
  }),

  // 代码
  code: defineComponent({
    render: () => [
      h('polyline', { points: '16 18 22 12 16 6' }),
      h('polyline', { points: '8 6 2 12 8 18' })
    ]
  }),

  // 格式化
  format: defineComponent({
    render: () => [
      h('line', { x1: '21', y1: '10', x2: '3', y2: '10' }),
      h('line', { x1: '21', y1: '6', x2: '3', y2: '6' }),
      h('line', { x1: '21', y1: '14', x2: '3', y2: '14' }),
      h('line', { x1: '21', y1: '18', x2: '3', y2: '18' })
    ]
  }),

  // 文本处理（文档+笔）
  'text-edit': defineComponent({
    render: () => [
      h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
      h('polyline', { points: '14 2 14 8 20 8' }),
      h('path', { d: 'M16 13l-4 4-2-2' })
    ]
  }),

  // 图表（饼图样式）
  chart: defineComponent({
    render: () => [
      h('path', { d: 'M21.21 15.89A10 10 0 1 1 8 2.83' }),
      h('path', { d: 'M22 12A10 10 0 0 0 12 2v10z' })
    ]
  }),

  // 流程图
  flowchart: defineComponent({
    render: () => [
      h('rect', { x: '3', y: '3', width: '6', height: '6', rx: '1' }),
      h('rect', { x: '15', y: '3', width: '6', height: '6', rx: '1' }),
      h('rect', { x: '9', y: '15', width: '6', height: '6', rx: '1' }),
      h('path', { d: 'M6 9v3a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V9' }),
      h('path', { d: 'M12 12v3' })
    ]
  }),

  // 思维导图 - jsMind 专用，放射状结构
  mindmap: defineComponent({
    render: () => [
      h('circle', { cx: '12', cy: '12', r: '3' }),
      h('path', { d: 'M15 12h5' }),
      h('path', { d: 'M4 12h5' }),
      h('path', { d: 'M14.1 9.9l3.5-3.5' }),
      h('path', { d: 'M6.4 17.6l3.5-3.5' }),
      h('path', { d: 'M14.1 14.1l3.5 3.5' }),
      h('path', { d: 'M6.4 6.4l3.5 3.5' }),
      h('circle', { cx: '20', cy: '12', r: '1.5' }),
      h('circle', { cx: '4', cy: '12', r: '1.5' }),
      h('circle', { cx: '18', cy: '6', r: '1.5' }),
      h('circle', { cx: '6', cy: '18', r: '1.5' }),
      h('circle', { cx: '18', cy: '18', r: '1.5' }),
      h('circle', { cx: '6', cy: '6', r: '1.5' })
    ]
  }),

  // 时序图
  sequence: defineComponent({
    render: () => [
      h('rect', { x: '3', y: '3', width: '4', height: '4', rx: '1' }),
      h('rect', { x: '17', y: '3', width: '4', height: '4', rx: '1' }),
      h('line', { x1: '5', y1: '7', x2: '5', y2: '21' }),
      h('line', { x1: '19', y1: '7', x2: '19', y2: '21' }),
      h('path', { d: 'M5 11h14' }),
      h('path', { d: 'M16 11l3-2v4l-3-2' }),
      h('path', { d: 'M19 16H5' }),
      h('path', { d: 'M8 16l-3 2v-4l3 2' })
    ]
  }),

  // 甘特图
  gantt: defineComponent({
    render: () => [
      h('rect', { x: '3', y: '4', width: '8', height: '3', rx: '1' }),
      h('rect', { x: '6', y: '10', width: '12', height: '3', rx: '1' }),
      h('rect', { x: '4', y: '16', width: '10', height: '3', rx: '1' })
    ]
  }),

  // 饼图
  'pie-chart': defineComponent({
    render: () => [
      h('path', { d: 'M21.21 15.89A10 10 0 1 1 8 2.83' }),
      h('path', { d: 'M22 12A10 10 0 0 0 12 2v10z' })
    ]
  }),

  // 折线图
  'line-chart': defineComponent({
    render: () => [
      h('path', { d: 'M3 3v18h18' }),
      h('path', { d: 'M7 16l4-4 4 4 5-6' })
    ]
  }),

  // 翻译/语言
  translate: defineComponent({
    render: () => [
      h('path', { d: 'M5 8l6 6' }),
      h('path', { d: 'M4 14h6' }),
      h('path', { d: 'M2 5h12' }),
      h('path', { d: 'M7 2v3' }),
      h('path', { d: 'M22 22l-5-10-5 10' }),
      h('path', { d: 'M14 18h6' })
    ]
  }),

  // 语言/地球
  language: defineComponent({
    render: () => [
      h('circle', { cx: '12', cy: '12', r: '10' }),
      h('path', { d: 'M2 12h20' }),
      h('path', { d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' })
    ]
  }),

  // 智能润色 - 魔法棒 + 星星
  polish: defineComponent({
    render: () => [
      h('path', { d: 'M9 4l1.5 3.5L14 9l-3.5 1.5L9 14l-1.5-3.5L4 9l3.5-1.5L9 4' }),
      h('path', { d: 'M19 11l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2' }),
      h('path', { d: 'M14 17l.75 1.5 1.5.75-1.5.75L14 21l-.75-1.5-1.5-.75 1.5-.75L14 17' })
    ]
  }),

  // 扩写内容 - 展开箭头 + 文字行
  expand: defineComponent({
    render: () => [
      h('path', { d: 'M3 8h12' }),
      h('path', { d: 'M3 12h18' }),
      h('path', { d: 'M3 16h18' }),
      h('path', { d: 'M19 4l2 2-2 2' }),
      h('path', { d: 'M21 6h-6' })
    ]
  }),

  // 提取摘要 - 文档压缩
  summarize: defineComponent({
    render: () => [
      h('rect', { x: '4', y: '2', width: '16', height: '20', rx: '2' }),
      h('path', { d: 'M8 6h8' }),
      h('path', { d: 'M8 10h8' }),
      h('path', { d: 'M8 14h4' }),
      h('path', { d: 'M15 14l2 2 2-2' }),
      h('path', { d: 'M17 14v6' })
    ]
  }),

// 翻译英文 - 地球 + EN文字
'translate-en': defineComponent({
  render: () => [
    h('circle', { cx: '8', cy: '12', r: '6' }),
    h('path', { d: 'M2 12h12' }),
    h('path', { d: 'M8 6c-1.2 1.8-1.2 4.2 0 12' }),
    h('path', { d: 'M8 6c1.2 1.8 1.2 4.2 0 12' }),
    h('text', { x: '16', y: '16', 'font-size': '8' }, 'E')
  ]
}),

// 翻译中文 - 地球 + CN文字
'translate-cn': defineComponent({
  render: () => [
    h('circle', { cx: '8', cy: '12', r: '6' }),
    h('path', { d: 'M2 12h12' }),
    h('path', { d: 'M8 6c-1.2 1.8-1.2 4.2 0 12' }),
    h('path', { d: 'M8 6c1.2 1.8 1.2 4.2 0 12' }),
    h('text', { x: '16', y: '16', 'font-size': '8' }, 'C')
  ]
}),

  // 工作日报 - 日历 + 勾
  'report': defineComponent({
    render: () => [
      h('rect', { x: '3', y: '4', width: '18', height: '18', rx: '2' }),
      h('path', { d: 'M3 10h18' }),
      h('path', { d: 'M8 2v4' }),
      h('path', { d: 'M16 2v4' }),
      h('path', { d: 'M9 15l2 2 4-4' })
    ]
  }),

  // 去除AI味 - AI + 禁止圈
'remove-ai': defineComponent({
  render: () => [
    // A
    h('path', { d: 'M6 16l3-8' }),
    h('path', { d: 'M9 8l3 8' }),
    h('path', { d: 'M7 13h4' }),
    // I
    h('path', { d: 'M15 8v8' }),
    h('path', { d: 'M13.5 8h3' }),
    h('path', { d: 'M13.5 16h3' }),
    // 禁止圆圈 + 斜线
    h('circle', { cx: '12', cy: '12', r: '9', fill: 'none' }),
    h('path', { d: 'M5 5l14 14', 'stroke-width': '1.5' })
  ]
}),

  // 云/词云 - ECharts 词云图专用
  cloud: defineComponent({
    render: () => [
      h('path', { d: 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z' }),
      h('line', { x1: '7', y1: '14', x2: '10', y2: '14' }),
      h('line', { x1: '11', y1: '14', x2: '15', y2: '14' }),
      h('line', { x1: '8', y1: '17', x2: '14', y2: '17' })
    ]
  }),

  // Git 分支 / Markmap 树状思维导图
  'git-branch': defineComponent({
    render: () => [
      h('line', { x1: '6', y1: '3', x2: '6', y2: '15' }),
      h('circle', { cx: '18', cy: '6', r: '3' }),
      h('circle', { cx: '6', cy: '18', r: '3' }),
      h('path', { d: 'M18 9a9 9 0 0 1-9 9' }),
      h('line', { x1: '18', y1: '9', x2: '18', y2: '14' }),
      h('circle', { cx: '18', cy: '17', r: '2' })
    ]
  }),
  // 专业系统提示词 - 皇冠 + 齿轮（代表专业和系统）
  'professional-prompt': defineComponent({
    render: () => [
      h('path', { d: 'M3 18h18v2H3v-2' }),
      h('path', { d: 'M3 18l3-12 6 4 6-4 3 12H3' }),
      h('circle', { cx: '12', cy: '4', r: '2' }),
      h('circle', { cx: '6', cy: '8', r: '1.5' }),
      h('circle', { cx: '18', cy: '8', r: '1.5' })
    ]
  }),

  // 系统提示词优化 - 齿轮 + 向上箭头
  'system-prompt-optimize': defineComponent({
    render: () => [
      h('circle', { cx: '12', cy: '12', r: '3' }),
      h('path', { d: 'M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83' }),
      h('path', { d: 'M12 8V4M9 7l3-3 3 3', 'stroke-width': '2' })
    ]
  }),

  // 步骤规划 - 带数字的流程步骤
  'step-planning': defineComponent({
    render: () => [
      h('circle', { cx: '6', cy: '5', r: '3' }),
      h('circle', { cx: '6', cy: '12', r: '3' }),
      h('circle', { cx: '6', cy: '19', r: '3' }),
      h('path', { d: 'M11 5h10' }),
      h('path', { d: 'M11 12h10' }),
      h('path', { d: 'M11 19h10' }),
      h('path', { d: 'M6 8v1M6 15v1' })
    ]
  }),

  // 基础优化 - 基石 + 上升箭头
  'basic-optimize': defineComponent({
    render: () => [
      h('path', { d: 'M4 20h16' }),
      h('path', { d: 'M6 20v-6h4v6' }),
      h('path', { d: 'M14 20v-10h4v10' }),
      h('path', { d: 'M18 6l-4-4-4 4' }),
      h('path', { d: 'M14 2v8' })
    ]
  }),

  // 专业优化 - 奖章/徽章 + 闪光
  'professional-optimize': defineComponent({
    render: () => [
      h('circle', { cx: '12', cy: '9', r: '6' }),
      h('path', { d: 'M9 14.5L7 22l5-3 5 3-2-7.5' }),
      h('path', { d: 'M12 6v6l3 2' }),
      h('path', { d: 'M20 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2' })
    ]
  }),

  // 提问优化 - 问号 + 魔法/优化光芒
  'question-optimize': defineComponent({
    render: () => [
      h('circle', { cx: '12', cy: '12', r: '9' }),
      h('path', { d: 'M9 9a3 3 0 1 1 4 2.83V14' }),
      h('circle', { cx: '12', cy: '17', r: '1' }),
      h('path', { d: 'M20 2l1 2.5L23.5 5.5 21 6.5 20 9l-1-2.5L16.5 5.5l2.5-1L20 2' })
    ]
  }),
  // 翻译专家
  'translate-expert': defineComponent({
    render: () => [
      h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
      h('path', { d: 'M14 2v6h6' }),
      h('path', { d: 'M8 13h2' }),
      h('path', { d: 'M9 13v4' }),
      h('path', { d: 'M14 13l1.5 4 1.5-4' }),
      h('path', { d: 'M14.5 15h2' })
    ]
  }),

  // 拖拽手柄
  'grip': defineComponent({
    render: () => [
      h('circle', { cx: '9', cy: '6', r: '1.5', fill: 'currentColor', stroke: 'none' }),
      h('circle', { cx: '15', cy: '6', r: '1.5', fill: 'currentColor', stroke: 'none' }),
      h('circle', { cx: '9', cy: '12', r: '1.5', fill: 'currentColor', stroke: 'none' }),
      h('circle', { cx: '15', cy: '12', r: '1.5', fill: 'currentColor', stroke: 'none' }),
      h('circle', { cx: '9', cy: '18', r: '1.5', fill: 'currentColor', stroke: 'none' }),
      h('circle', { cx: '15', cy: '18', r: '1.5', fill: 'currentColor', stroke: 'none' })
    ]
  }),

  // 手/移动画布
  hand: defineComponent({
    render: () => h('path', { d: 'M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15' })
  }),

  // 马克笔
  marker: defineComponent({
    render: () => [
      h('path', { d: 'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z' }),
      h('path', { d: 'M15 5l4 4' }),
      h('path', { d: 'M9 11l4 4' })
    ]
  }),

  // 三角形工具
  'triangle-tool': defineComponent({
    render: () => h('path', { d: 'M12 3L3 21h18L12 3z' })
  }),

  // 菱形工具
  'diamond-tool': defineComponent({
    render: () => h('path', { d: 'M12 2L2 12l10 10 10-10L12 2z' })
  }),

  // 多边形工具
  'polygon-tool': defineComponent({
    render: () => h('path', { d: 'M12 2l-5.5 4v6l5.5 4 5.5-4V6L12 2z' })
  }),

  // 星形工具
  'star-tool': defineComponent({
    render: () => h('path', { d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' })
  }),

  // 高亮框工具
  'highlight-tool': defineComponent({
    render: () => [
      h('rect', { x: '3', y: '3', width: '18', height: '18', rx: '2', fill: 'rgba(255,255,0,0.3)' }),
      h('rect', { x: '3', y: '3', width: '18', height: '18', rx: '2' })
    ]
  }),

  // 气泡框工具
  'bubble-tool': defineComponent({
    render: () => h('path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' })
  }),

  // 图片工具
  'image-tool': defineComponent({
    render: () => [
      h('rect', { x: '3', y: '3', width: '18', height: '18', rx: '2' }),
      h('circle', { cx: '9', cy: '9', r: '2' }),
      h('path', { d: 'M21 15l-5-5L5 21' })
    ]
  })

}

const iconComponent = computed(() => {
  return icons[props.name] || icons.info
})
</script>

<style scoped>
.svg-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
