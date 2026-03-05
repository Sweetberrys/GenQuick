// 文字相关类型
export * from './text'

// 图片源类型
export type ImageSource = string | HTMLImageElement | HTMLCanvasElement

// 导出格式
export type ExportFormat = 'png' | 'jpg'

// 导出质量
export type ExportQuality = 'high' | 'medium' | 'low'

// 工具类型
export type ToolType =
  | 'select'
  | 'pan'
  | 'brush'
  | 'highlighter'
  | 'marker'
  | 'eraser'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'polygon'
  | 'star'
  | 'text'
  | 'highlight'
  | 'bubble'
  | 'image'

// 线条样式
export type StrokeStyle = 'solid' | 'dashed' | 'dotted'

// 箭头方向
export type ArrowDirection = 'single' | 'double'

// 箭头头部类型
export type ArrowHeadType = 'triangle' | 'diamond' | 'circle' | 'open'

// 编辑器设置
export interface EditorSettings {
  strokeColor: string
  fillColor: string
  strokeWidth: number
  strokeStyle: StrokeStyle
  fillShape: boolean
  opacity: number
  borderRadius: number
  fontSize: number
  fontFamily: string
  polygonSides: number
  arrowDirection: ArrowDirection
  arrowHeadType: ArrowHeadType
}

// 工具定义
export interface ToolDefinition {
  type: ToolType
  name: string
  icon: string
  shortcut?: string
}

// 工具分组
export interface ToolSection {
  title: string
  tools: ToolDefinition[]
}

// 编辑器状态
export interface EditorState {
  tool: ToolType
  selectedId: string | null
  isDrawing: boolean
}
