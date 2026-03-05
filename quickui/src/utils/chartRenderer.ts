import mermaid from 'mermaid'
import { instance as vizInstance } from '@viz-js/viz'
import * as echarts from 'echarts'
import 'echarts-wordcloud'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'
import type { ChartType } from '@/types'

// markmap 实例存储
let markmapInstance: Markmap | null = null

// 初始化 Mermaid - 使用亮色主题和透明背景
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',  // 使用 neutral 主题，避免深色背景
  securityLevel: 'loose',
  themeVariables: {
    // 强制设置透明/浅色背景
    background: 'transparent',
    primaryColor: '#f5f5f5',
    primaryBorderColor: '#333333',
    primaryTextColor: '#333333',
    secondaryColor: '#f5f5f5',
    tertiaryColor: '#f5f5f5',
    lineColor: '#333333',
    textColor: '#333333',
    mainBkg: 'transparent',
    nodeBorder: '#333333',
    clusterBkg: 'transparent',
    titleColor: '#333333',
    edgeLabelBackground: 'transparent',
  },
  flowchart: {
    useMaxWidth: false,
    htmlLabels: false
  },
  sequence: {
    useMaxWidth: false
  },
  gantt: {
    useMaxWidth: false
  }
})

// 清理代码：移除 markdown 代码块标记
function cleanCode(code: string, type: ChartType): string {
  let cleaned = code.trim()
  
  // 移除开头的 ```xxx 标记
  const codeBlockPatterns = [
    /^```(?:dot|graphviz|mermaid|json|javascript|js|echarts|wordcloud|markdown|md|markmap)?\s*\n?/i,
    /^```\s*\n?/
  ]
  
  for (const pattern of codeBlockPatterns) {
    cleaned = cleaned.replace(pattern, '')
  }
  
  // 移除结尾的 ``` 标记
  cleaned = cleaned.replace(/\n?```\s*$/, '')
  
  // 对于 JSON 类型（echarts, wordcloud），尝试提取有效的 JSON
  if (type === 'echarts' || type === 'wordcloud') {
    // 尝试找到 JSON 对象的开始和结束
    const jsonStart = cleaned.indexOf('{')
    const jsonEnd = cleaned.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1)
    }
  }
  
  return cleaned.trim()
}

// 渲染 Mermaid 图表
export async function renderMermaid(code: string, container: HTMLElement): Promise<string> {
  try {
    const cleanedCode = cleanCode(code, 'mermaid')
    const id = `mermaid-${Date.now()}`
    const { svg } = await mermaid.render(id, cleanedCode)
    container.innerHTML = svg
    return svg
  } catch (error) {
    throw new Error(`Mermaid 渲染失败: ${error}`)
  }
}

// 渲染 Graphviz 图表
export async function renderGraphviz(code: string, container: HTMLElement): Promise<string> {
  try {
    const cleanedCode = cleanCode(code, 'graphviz')
    const viz = await vizInstance()
    const svg = viz.renderSVGElement(cleanedCode)
    container.innerHTML = ''
    container.appendChild(svg)
    return svg.outerHTML
  } catch (error) {
    throw new Error(`Graphviz 渲染失败: ${error}`)
  }
}

// 渲染 ECharts 图表
export function renderECharts(optionStr: string, container: HTMLElement): echarts.ECharts {
  try {
    const cleanedCode = cleanCode(optionStr, 'echarts')
    // 解析 JSON 配置
    const option = JSON.parse(cleanedCode)
    
    // 销毁已有实例
    const existingChart = echarts.getInstanceByDom(container)
    if (existingChart) {
      existingChart.dispose()
    }
    
    // 根据数据量动态计算尺寸
    let dataCount = 0
    let maxLabelLength = 0
    
    // 检查 X 轴数据量和标签长度
    if (option.xAxis) {
      const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis
      if (xAxis && xAxis.data) {
        dataCount = xAxis.data.length
        // 检查标签长度
        xAxis.data.forEach((label: any) => {
          const len = String(label).length
          if (len > maxLabelLength) maxLabelLength = len
        })
      }
    }
    
    // 检查 series 数据量
    if (option.series && Array.isArray(option.series)) {
      option.series.forEach((s: any) => {
        if (s.data && s.data.length > dataCount) {
          dataCount = s.data.length
        }
      })
    }
    
    // 根据数据量和标签长度计算尺寸
    const hasLongLabels = maxLabelLength > 4
    const baseWidth = 700
    const baseHeight = 450
    const widthPerItem = 80
    // 左边需要足够空间显示旋转45度的第一个标签
    // 旋转45度时，标签占用的水平空间约为 字符数 * 字体大小 * cos(45°) ≈ 字符数 * 12 * 0.7
    const leftMargin = hasLongLabels ? Math.max(120, maxLabelLength * 9) : 80
    const bottomMargin = hasLongLabels ? Math.max(150, maxLabelLength * 11) : 80
    const calculatedWidth = Math.max(baseWidth, dataCount * widthPerItem + leftMargin + 80)
    const calculatedHeight = hasLongLabels ? Math.max(baseHeight, 400 + bottomMargin) : baseHeight
    
    // 设置容器尺寸
    container.style.width = `${calculatedWidth}px`
    container.style.height = `${calculatedHeight}px`
    
    // 初始化 ECharts
    const chart = echarts.init(container, null, {
      width: calculatedWidth,
      height: calculatedHeight
    })
    
    // 强制设置 grid 配置，确保有足够空间
    if (!option.grid) {
      option.grid = {}
    }
    // 使用固定像素值
    option.grid.left = option.grid.left || leftMargin
    option.grid.bottom = option.grid.bottom || bottomMargin
    option.grid.right = option.grid.right || 60
    option.grid.top = option.grid.top || 80
    option.grid.containLabel = false
    
    // 确保 tooltip 渲染到 body，避免被 overflow:hidden 遮挡
    if (!option.tooltip) {
      option.tooltip = {}
    }
    option.tooltip.appendToBody = true
    
    chart.setOption(option)
    
    return chart
  } catch (error) {
    throw new Error(`ECharts 渲染失败: ${error}`)
  }
}

// 渲染词云图
export function renderWordCloud(optionStr: string, container: HTMLElement): echarts.ECharts {
  try {
    let cleanedCode = cleanCode(optionStr, 'wordcloud')
    
    // 移除可能存在的 function 定义（AI 可能会返回带函数的 JSON）
    // 匹配 "color": function(){...} 或 "color":function(){...}
    cleanedCode = cleanedCode.replace(/"color"\s*:\s*function\s*\([^)]*\)\s*\{[^}]*\}/g, '')
    // 清理可能留下的多余逗号
    cleanedCode = cleanedCode.replace(/,\s*,/g, ',')
    cleanedCode = cleanedCode.replace(/,\s*}/g, '}')
    cleanedCode = cleanedCode.replace(/,\s*]/g, ']')
    
    // 解析 JSON 配置
    const option = JSON.parse(cleanedCode)
    
    // 销毁已有实例
    const existingChart = echarts.getInstanceByDom(container)
    if (existingChart) {
      existingChart.dispose()
    }
    
    // 根据词云数据量动态计算尺寸
    let dataCount = 0
    if (option.series && option.series[0] && option.series[0].data) {
      dataCount = option.series[0].data.length
    }
    
    // 根据数据量和最大值动态计算尺寸
    // 数据越多、值越大，需要更大的空间
    const baseWidth = 600
    const baseHeight = 400
    const widthFactor = Math.min(2, 1 + dataCount / 50) // 最多扩大2倍
    const heightFactor = Math.min(1.8, 1 + dataCount / 60)
    
    const width = Math.round(baseWidth * widthFactor)
    const height = Math.round(baseHeight * heightFactor)
    
    // 设置容器尺寸
    container.style.width = `${width}px`
    container.style.height = `${height}px`
    
    // 初始化 ECharts
    const chart = echarts.init(container, null, {
      width: width,
      height: height
    })
    
    // 设置背景色为白色，避免出现灰色区域
    if (!option.backgroundColor) {
      option.backgroundColor = '#ffffff'
    }
    
    // 确保 tooltip 渲染到 body，避免被 overflow:hidden 遮挡
    if (!option.tooltip) {
      option.tooltip = {}
    }
    option.tooltip.appendToBody = true
    
    // 处理词云配置，添加随机颜色函数
    if (option.series && option.series[0] && option.series[0].type === 'wordCloud') {
      const series = option.series[0]
      
      // 设置默认的文字样式（随机颜色）
      if (!series.textStyle) {
        series.textStyle = {}
      }
      series.textStyle.color = function() {
        // 学术风格配色
        const colors = [
          '#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F',
          '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC',
          '#8ECFC9', '#FFBE7A', '#FA7F6F', '#82B0D2', '#2878B5'
        ]
        return colors[Math.floor(Math.random() * colors.length)]
      }
      
      // 设置默认值
      if (!series.shape) series.shape = 'circle'
      if (!series.gridSize) series.gridSize = 8
      // 根据容器尺寸动态调整字号范围
      if (!series.sizeRange) {
        const minSize = Math.max(12, Math.round(14 * (width / baseWidth)))
        const maxSize = Math.max(40, Math.round(60 * (width / baseWidth)))
        series.sizeRange = [minSize, maxSize]
      }
      if (!series.rotationRange) series.rotationRange = [-45, 45]
      if (!series.rotationStep) series.rotationStep = 15
      
      // 设置词云绘制区域为整个容器
      if (!series.left) series.left = 'center'
      if (!series.top) series.top = 'center'
      if (!series.width) series.width = '90%'
      if (!series.height) series.height = '90%'
    }
    
    chart.setOption(option)
    
    return chart
  } catch (error) {
    throw new Error(`词云渲染失败: ${error}`)
  }
}

// 渲染 Markmap 思维导图
export function renderMarkmap(markdown: string, container: HTMLElement): void {
  try {
    const cleanedCode = cleanCode(markdown, 'markmap')
    
    // 清空容器
    container.innerHTML = ''
    markmapInstance = null
    
    // 创建 SVG 元素
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.id = 'markmap-svg'
    svg.setAttribute('width', '800')
    svg.setAttribute('height', '600')
    svg.style.width = '800px'
    svg.style.height = '600px'
    container.appendChild(svg)
    
    // 设置容器尺寸
    container.style.width = '800px'
    container.style.height = '600px'
    container.style.overflow = 'visible'
    
    // 使用 Transformer 解析 Markdown
    const transformer = new Transformer()
    const { root } = transformer.transform(cleanedCode)
    
    // 创建 Markmap 实例
    markmapInstance = Markmap.create(svg, {
      autoFit: true,
      color: (node: any) => {
        // 根据层级设置颜色
        const colors = ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948']
        return colors[node.state?.depth % colors.length] || colors[0]
      },
      paddingX: 16,
      spacingHorizontal: 80,
      spacingVertical: 10,
    }, root)
    
    // 适应内容
    requestAnimationFrame(() => {
      if (markmapInstance) {
        markmapInstance.fit()
      }
    })
  } catch (error) {
    throw new Error(`Markmap 渲染失败: ${error}`)
  }
}

// 获取当前 Markmap 实例
export function getMarkmapInstance(): Markmap | null {
  return markmapInstance
}

// 统一渲染接口
export async function renderChart(
  type: ChartType, 
  code: string, 
  container: HTMLElement
): Promise<void> {
  switch (type) {
    case 'mermaid':
      await renderMermaid(code, container)
      break
    case 'graphviz':
      await renderGraphviz(code, container)
      break
    case 'echarts':
      renderECharts(code, container)
      break
    case 'wordcloud':
      renderWordCloud(code, container)
      break
    case 'markmap':
      renderMarkmap(code, container)
      break
    default:
      throw new Error(`不支持的图表类型: ${type}`)
  }
}

// 移除 SVG 中的深色背景，准备导出
function removeDarkBackground(svgEl: SVGElement): void {
  if (!svgEl) return
  
  // 1. 移除 SVG 根元素的背景样式（安全检查）
  if (svgEl.style) {
    svgEl.style.backgroundColor = 'transparent'
    svgEl.style.background = 'transparent'
  }
  
  // 2. 获取 SVG 尺寸用于判断背景矩形
  const svgWidth = parseFloat(svgEl.getAttribute('width') || '0')
  const svgHeight = parseFloat(svgEl.getAttribute('height') || '0')
  
  // 3. 处理所有矩形元素
  const allRects = svgEl.querySelectorAll('rect')
  allRects.forEach((rect, index) => {
    const rectWidth = parseFloat(rect.getAttribute('width') || '0')
    const rectHeight = parseFloat(rect.getAttribute('height') || '0')
    const fill = rect.getAttribute('fill')?.toLowerCase() || ''
    const className = rect.getAttribute('class') || ''
    
    // 判断是否为背景矩形
    const isBackgroundRect = 
      index === 0 || // 第一个矩形通常是背景
      className.includes('background') ||
      (rectWidth >= svgWidth * 0.9 && rectHeight >= svgHeight * 0.9) // 尺寸接近 SVG 尺寸
    
    // 判断是否为深色填充
    const isDarkFill = fill && (
      fill === 'black' ||
      fill === '#000' ||
      fill === '#000000' ||
      /^#[0-3][0-9a-f]{5}$/i.test(fill) || // #0xxxxx - #3xxxxx
      /^#[0-3][0-9a-f]{2}$/i.test(fill) || // #0xx - #3xx
      /^rgb\s*\(\s*[0-5]\d?\s*,/.test(fill) // rgb(0-59, ...)
    )
    
    if (isBackgroundRect || isDarkFill) {
      rect.setAttribute('fill', 'transparent')
      rect.setAttribute('fill-opacity', '0')
    }
  })
  
  // 4. 处理带深色背景的元素
  const darkBgSelectors = [
    'rect.er',
    'rect[class*="background"]',
    'rect[fill="#1f2020"]',
    'rect[fill="#333"]',
    'rect[fill="#333333"]',
    'rect[fill="#222"]',
    'rect[fill="#222222"]',
    'rect[fill="#111"]',
    'rect[fill="#111111"]',
    'rect[fill="black"]',
    'rect[fill="#000"]',
    'rect[fill="#000000"]'
  ]
  
  darkBgSelectors.forEach(selector => {
    try {
      svgEl.querySelectorAll(selector).forEach(el => {
        el.setAttribute('fill', 'transparent')
        el.setAttribute('fill-opacity', '0')
      })
    } catch {
      // 忽略无效选择器
    }
  })
  
  // 5. 移除内联样式中的深色背景（安全检查）
  try {
    svgEl.querySelectorAll('[style*="background"]').forEach(el => {
      const htmlEl = el as HTMLElement
      if (htmlEl && htmlEl.style) {
        htmlEl.style.backgroundColor = 'transparent'
        htmlEl.style.background = 'transparent'
      }
    })
  } catch {
    // 忽略错误
  }
}

// 添加亮色主题样式，确保导出后文字和线条可见
function addLightThemeStyles(svgDoc: Document, svgEl: SVGElement): void {
  const lightThemeStyles = `
    /* 根元素透明背景 */
    svg { background: transparent !important; background-color: transparent !important; }
    
    /* 移除深色背景 */
    .er, .relationshipLabelBox, .entityBox, .attributeBoxOdd, .attributeBoxEven { 
      fill: #f9f9f9 !important; 
    }
    rect[class*="background"] { fill: transparent !important; }
    
    /* 文字颜色 - 确保在透明背景上可见 */
    text, tspan, .label, .nodeLabel, .edgeLabel, .labelText, .loopText, 
    .noteText, .messageText, .labelBox, .cluster-label,
    .actor, .classLabel, .relationshipLabel, .entityLabel,
    .flowchart-label, .statediagram-state .state-title { 
      fill: #333333 !important; 
      color: #333333 !important; 
    }
    
    /* 节点样式 */
    .node rect, .node circle, .node ellipse, .node polygon, .node path,
    .basic, .actor-man, .actor, .statediagram-state rect,
    .entityBox, .attributeBoxOdd, .attributeBoxEven { 
      stroke: #333333 !important; 
      fill: #f5f5f5 !important;
    }
    
    /* 连接线和路径 */
    .edgePath path, .flowchart-link, .relation, .transition,
    line, path.path, .messageLine0, .messageLine1,
    .statediagram-state path, .path { 
      stroke: #333333 !important; 
    }
    
    /* 箭头 */
    .marker, marker path, .arrowheadPath, marker polygon { 
      fill: #333333 !important; 
      stroke: #333333 !important;
    }
    
    /* 集群/分组背景 */
    .cluster rect, .cluster path, .subgraph rect { 
      fill: #f0f0f0 !important; 
      stroke: #999999 !important; 
    }
    
    /* 注释框 */
    .note, .noteBox { 
      fill: #ffffcc !important; 
      stroke: #999999 !important; 
    }
    
    /* 序列图特殊处理 */
    .activation0, .activation1, .activation2 {
      fill: #f5f5f5 !important;
      stroke: #333333 !important;
    }
    
    /* 甘特图特殊处理 */
    .section0, .section1, .section2, .section3 {
      fill: #f5f5f5 !important;
    }
    
    /* 饼图特殊处理 */
    .pieTitleText {
      fill: #333333 !important;
    }
  `
  
  const styleEl = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'style')
  styleEl.textContent = lightThemeStyles
  
  // 将样式插入到最前面
  if (svgEl.firstChild) {
    svgEl.insertBefore(styleEl, svgEl.firstChild)
  } else {
    svgEl.appendChild(styleEl)
  }
}

// 获取 SVG 尺寸
function getSvgDimensions(svgEl: SVGElement, originalElement?: SVGElement): { width: number; height: number } {
  let width = 0
  let height = 0
  
  // 尝试从 width/height 属性获取
  const widthAttr = svgEl.getAttribute('width')
  const heightAttr = svgEl.getAttribute('height')
  
  if (widthAttr && heightAttr) {
    width = parseFloat(widthAttr)
    height = parseFloat(heightAttr)
  }
  
  // 如果没有，尝试从 viewBox 获取
  if (!width || !height) {
    const viewBox = svgEl.getAttribute('viewBox')
    if (viewBox) {
      const parts = viewBox.split(/\s+|,/)
      if (parts.length >= 4) {
        width = parseFloat(parts[2])
        height = parseFloat(parts[3])
      }
    }
  }
  
  // 如果还是没有，尝试从原始元素的 getBoundingClientRect 获取
  if ((!width || !height) && originalElement) {
    const bbox = originalElement.getBoundingClientRect()
    width = bbox.width || 800
    height = bbox.height || 600
  }
  
  // 默认尺寸
  if (!width || width <= 0) width = 800
  if (!height || height <= 0) height = 600
  
  return { width, height }
}

// 将 SVG 转换为 PNG Blob（白色背景，确保在任何主题下都能正确显示）
export async function svgToPngBlob(svgElement: SVGElement | string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let svgString = typeof svgElement === 'string' 
      ? svgElement 
      : svgElement.outerHTML
    
    // 解析 SVG
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml')
    const svgEl = svgDoc.querySelector('svg')
    
    if (!svgEl) {
      reject(new Error('无效的 SVG'))
      return
    }
    
    // 获取 SVG 尺寸
    const originalElement = typeof svgElement !== 'string' ? svgElement : undefined
    const { width, height } = getSvgDimensions(svgEl, originalElement)
    
    // 确保 SVG 有明确的尺寸属性
    svgEl.setAttribute('width', String(width))
    svgEl.setAttribute('height', String(height))
    
    // 移除深色背景（改为白色）
    removeDarkBackground(svgEl)
    
    // 添加亮色主题样式
    addLightThemeStyles(svgDoc, svgEl)
    
    // 添加 xmlns 属性（确保独立 SVG 有效）
    svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    svgEl.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
    
    // 序列化 SVG
    const serializer = new XMLSerializer()
    svgString = serializer.serializeToString(svgEl)
    
    // 创建 canvas 进行转换
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('无法创建 canvas context'))
      return
    }

    const img = new Image()
    
    // 使用 base64 编码避免特殊字符问题
    const base64 = btoa(unescape(encodeURIComponent(svgString)))
    const dataUrl = `data:image/svg+xml;base64,${base64}`

    img.onload = () => {
      // 设置 canvas 尺寸，增加分辨率
      const scale = 2
      canvas.width = width * scale
      canvas.height = height * scale
      
      // 填充白色背景
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // 绘制图片
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('转换 PNG 失败'))
        }
      }, 'image/png')
    }

    img.onerror = (e) => {
      console.error('SVG 加载失败:', e)
      reject(new Error('加载 SVG 失败，可能包含不支持的元素'))
    }

    img.src = dataUrl
  })
}

// 将 ECharts 实例转换为 PNG Blob（白色背景）
export function echartsToPngBlob(chart: echarts.ECharts): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const dataUrl = chart.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      })
      
      // 将 data URL 转换为 Blob
      fetch(dataUrl)
        .then(res => res.blob())
        .then(resolve)
        .catch(reject)
    } catch (error) {
      reject(error)
    }
  })
}

// 将 Markmap 转换为 PNG Blob
export async function markmapToPngBlob(container: HTMLElement): Promise<Blob> {
  // 等待渲染完成
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // 确保 markmap 已经 fit
  if (markmapInstance) {
    markmapInstance.fit()
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  const svg = container.querySelector('svg')
  if (!svg) {
    throw new Error('Markmap SVG 未找到')
  }
  
  // 获取 SVG 的实际边界
  const bbox = svg.getBBox()
  const padding = 40
  
  // 计算实际内容尺寸
  const width = Math.max(bbox.width + padding * 2, 800)
  const height = Math.max(bbox.height + padding * 2, 600)
  
  // 克隆 SVG 以避免影响原始显示
  const clonedSvg = svg.cloneNode(true) as SVGElement
  
  // 设置 viewBox 以包含所有内容
  const viewBoxX = bbox.x - padding
  const viewBoxY = bbox.y - padding
  clonedSvg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${width} ${height}`)
  clonedSvg.setAttribute('width', String(width))
  clonedSvg.setAttribute('height', String(height))
  
  // 添加白色背景矩形
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  bgRect.setAttribute('x', String(viewBoxX))
  bgRect.setAttribute('y', String(viewBoxY))
  bgRect.setAttribute('width', String(width))
  bgRect.setAttribute('height', String(height))
  bgRect.setAttribute('fill', '#ffffff')
  clonedSvg.insertBefore(bgRect, clonedSvg.firstChild)
  
  // 确保所有文本和路径都有正确的样式
  clonedSvg.querySelectorAll('text').forEach(text => {
    if (!text.getAttribute('fill') || text.getAttribute('fill') === 'none') {
      text.setAttribute('fill', '#333333')
    }
  })
  
  clonedSvg.querySelectorAll('path').forEach(path => {
    if (!path.getAttribute('stroke') || path.getAttribute('stroke') === 'none') {
      const fill = path.getAttribute('fill')
      if (!fill || fill === 'none') {
        path.setAttribute('stroke', '#999999')
      }
    }
  })
  
  // 添加必要的 xmlns 属性
  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  
  // 序列化 SVG
  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(clonedSvg)
  
  // 转换为 PNG
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('无法创建 canvas context'))
      return
    }
    
    const scale = 2
    canvas.width = width * scale
    canvas.height = height * scale
    
    const img = new Image()
    const base64 = btoa(unescape(encodeURIComponent(svgString)))
    const dataUrl = `data:image/svg+xml;base64,${base64}`
    
    img.onload = () => {
      // 白色背景
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // 绘制 SVG
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('转换 PNG 失败'))
        }
      }, 'image/png')
    }
    
    img.onerror = (e) => {
      console.error('Markmap SVG 加载失败:', e)
      reject(new Error('加载 Markmap SVG 失败'))
    }
    
    img.src = dataUrl
  })
}

// 准备 SVG 用于导出（克隆并处理，不影响页面显示）
export function prepareSvgForExport(container: HTMLElement): SVGElement | null {
  const svg = container.querySelector('svg')
  if (!svg) return null
  
  // 克隆 SVG 避免影响页面显示
  const clonedSvg = svg.cloneNode(true) as SVGElement
  
  // 移除深色背景
  removeDarkBackground(clonedSvg)
  
  return clonedSvg
}