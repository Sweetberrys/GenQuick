/**
 * 图片预处理工具
 * 1. 压缩图片
 * 2. 转换为 JPEG 格式
 * 3. 输出 Base64
 */

export interface ImageProcessOptions {
  maxWidth?: number      // 最大宽度，默认 1024
  maxHeight?: number     // 最大高度，默认 1024
  quality?: number       // JPEG 质量 0-1，默认 0.8
}

const DEFAULT_OPTIONS: Required<ImageProcessOptions> = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8
}

/**
 * 压缩并转换图片为 JPEG Base64
 */
export async function processImage(
  file: File | Blob,
  options: ImageProcessOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  // 创建图片对象
  const img = await loadImage(file)
  
  // 计算缩放后的尺寸
  const { width, height } = calculateSize(img.width, img.height, opts.maxWidth, opts.maxHeight)
  
  // 创建 canvas 进行压缩
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('无法创建 canvas context')
  }
  
  // 绘制图片（白色背景，处理透明图片）
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  
  // 转换为 JPEG Base64
  const base64 = canvas.toDataURL('image/jpeg', opts.quality)
  
  return base64
}

/**
 * 批量处理图片
 */
export async function processImages(
  files: (File | Blob)[],
  options: ImageProcessOptions = {}
): Promise<string[]> {
  return Promise.all(files.map(file => processImage(file, options)))
}

/**
 * 从 Base64 或 URL 加载并处理图片
 */
export async function processImageFromUrl(
  url: string,
  options: ImageProcessOptions = {}
): Promise<string> {
  // 如果已经是处理过的 JPEG base64，检查是否需要重新处理
  if (url.startsWith('data:image/jpeg;base64,')) {
    // 检查图片尺寸是否超标
    const img = await loadImageFromUrl(url)
    const opts = { ...DEFAULT_OPTIONS, ...options }
    
    if (img.width <= opts.maxWidth && img.height <= opts.maxHeight) {
      return url // 已经符合要求，直接返回
    }
  }
  
  // 需要处理
  const response = await fetch(url)
  const blob = await response.blob()
  return processImage(blob, options)
}

/**
 * 从文件加载图片
 */
function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    
    img.src = url
  })
}

/**
 * 从 URL 加载图片
 */
function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    
    img.src = url
  })
}

/**
 * 计算等比缩放后的尺寸
 */
function calculateSize(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height }
  }
  
  const ratio = Math.min(maxWidth / width, maxHeight / height)
  
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio)
  }
}

/**
 * 从 Base64 提取纯数据部分（去掉 data:image/xxx;base64, 前缀）
 */
export function extractBase64Data(base64: string): string {
  const match = base64.match(/^data:image\/\w+;base64,(.+)$/)
  return match ? match[1] : base64
}

/**
 * 获取图片的 MIME 类型
 */
export function getImageMimeType(base64: string): string {
  const match = base64.match(/^data:(image\/\w+);base64,/)
  return match ? match[1] : 'image/jpeg'
}
