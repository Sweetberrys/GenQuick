// 文字相关类型定义

// 预设字体列表
export const PRESET_FONTS = [
  { name: '微软雅黑', value: 'Microsoft YaHei' },
  { name: '宋体', value: 'SimSun' },
  { name: '黑体', value: 'SimHei' },
  { name: '楷体', value: 'KaiTi' },
  { name: 'Arial', value: 'Arial' },
  { name: 'Times New Roman', value: 'Times New Roman' },
  { name: 'Courier New', value: 'Courier New' },
  { name: 'Georgia', value: 'Georgia' },
]

// 默认文字配置
export const DEFAULT_TEXT_CONFIG = {
  fontSize: 18,
  fontFamily: 'Microsoft YaHei',
  fontStyle: 'normal' as 'normal' | 'bold' | 'italic' | 'bold italic',
  textDecoration: '' as '' | 'underline' | 'line-through',
  fill: '#ff0000',
}

// 文字工具配置类型
export interface TextToolConfig {
  fontSize: number
  fontFamily: string
  fontStyle: 'normal' | 'bold' | 'italic' | 'bold italic'
  textDecoration: '' | 'underline' | 'line-through'
  fill: string
}
