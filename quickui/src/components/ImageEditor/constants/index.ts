import type { EditorSettings, ToolSection } from '../types'

// 预设颜色
export const PRESET_COLORS = [
  '#ff0000', '#ff6b6b', '#ff9500', '#ffcc00',
  '#34c759', '#00c7be', '#007aff', '#5856d6',
  '#af52de', '#ff2d55', '#000000', '#8e8e93', '#ffffff',
]

// 默认编辑器设置
export const DEFAULT_SETTINGS: EditorSettings = {
  strokeColor: '#000000',
  fillColor: '#ffffff',
  strokeWidth: 3,
  strokeStyle: 'solid',
  fillShape: true,
  opacity: 1,
  borderRadius: 0,
  fontSize: 24,
  fontFamily: 'Arial',
  polygonSides: 6,
  arrowDirection: 'single',
  arrowHeadType: 'triangle',
}

// 工具分组定义
export const TOOL_SECTIONS: ToolSection[] = [
  {
    title: '基础',
    tools: [
      { type: 'select', name: '选择', icon: 'cursor', shortcut: 'V' },
      { type: 'pan', name: '移动', icon: 'hand', shortcut: 'H' },
    ],
  },
  {
    title: '绘图',
    tools: [
      { type: 'brush', name: '画笔', icon: 'pencil', shortcut: 'B' },
      { type: 'highlighter', name: '荧光笔', icon: 'highlighter' },
      { type: 'marker', name: '马克笔', icon: 'marker' },
      { type: 'eraser', name: '橡皮擦', icon: 'eraser', shortcut: 'E' },
    ],
  },
  {
    title: '形状',
    tools: [
      { type: 'line', name: '直线', icon: 'line-tool', shortcut: 'L' },
      { type: 'arrow', name: '箭头', icon: 'arrow-tool', shortcut: 'A' },
      { type: 'rect', name: '矩形', icon: 'rect-tool', shortcut: 'R' },
      { type: 'circle', name: '圆形', icon: 'circle-tool', shortcut: 'O' },
      { type: 'triangle', name: '三角形', icon: 'triangle-tool' },
      { type: 'diamond', name: '菱形', icon: 'diamond-tool' },
      { type: 'polygon', name: '多边形', icon: 'polygon-tool' },
      { type: 'star', name: '星形', icon: 'star-tool' },
    ],
  },
  {
    title: '标注',
    tools: [
      { type: 'text', name: '文字', icon: 'text-tool', shortcut: 'T' },
      { type: 'highlight', name: '高亮框', icon: 'highlight-tool' },
      { type: 'bubble', name: '气泡框', icon: 'bubble-tool' },
      { type: 'image', name: '图片', icon: 'image-tool' },
    ],
  },
]

// 工具名称映射
export const TOOL_NAMES: Record<string, string> = {
  select: '选择',
  pan: '移动',
  brush: '画笔',
  highlighter: '荧光笔',
  marker: '马克笔',
  eraser: '橡皮擦',
  line: '直线',
  arrow: '箭头',
  rect: '矩形',
  circle: '圆形',
  triangle: '三角形',
  diamond: '菱形',
  polygon: '多边形',
  star: '星形',
  text: '文字',
  highlight: '高亮框',
  bubble: '气泡框',
  image: '图片',
}

// 线条样式映射
export const STROKE_DASH_MAP: Record<string, number[] | null> = {
  solid: null,
  dashed: [10, 5],
  dotted: [2, 4],
}

// 导出质量映射
export const EXPORT_QUALITY_MAP: Record<string, number> = {
  high: 1.0,
  medium: 0.8,
  low: 0.6,
}

// 生成唯一 ID
export function generateId(): string {
  return `shape_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}
