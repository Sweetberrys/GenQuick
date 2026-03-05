import { ref, reactive, computed, shallowRef } from 'vue'
import * as fabric from 'fabric'
import type { ToolType, EditorSettings } from '../types'
import { DEFAULT_SETTINGS, STROKE_DASH_MAP, generateId } from '../constants'

// 扩展 Fabric 对象类型
declare module 'fabric' {
  interface FabricObject {
    name?: string
    isArrowLine?: boolean
    isBubble?: boolean
  }
}

export function useEditorCore() {
  const canvas = shallowRef<fabric.Canvas | null>(null)
  const currentTool = ref<ToolType>('select')
  const settings = reactive<EditorSettings>({ ...DEFAULT_SETTINGS })
  
  // 绘制状态
  const isDrawing = ref(false)
  const startPoint = ref<{ x: number; y: number } | null>(null)
  const currentShape = shallowRef<fabric.FabricObject | null>(null)
  
  // 平移状态
  const isPanning = ref(false)
  const lastPanPoint = ref<{ x: number; y: number } | null>(null)
  
  // 橡皮擦状态
  const isEraserMode = ref(false)
  const isErasing = ref(false)
  
  // 缩放
  const zoom = ref(1)
  
  // 侧栏折叠
  const leftCollapsed = ref(false)

  // 对象数量
  const objectCount = ref(0)
  const hasObjects = computed(() => objectCount.value > 0)

  // 鼠标位置
  const mousePos = ref({ x: 0, y: 0 })

  // 初始化画布
  function initCanvas(canvasEl: HTMLCanvasElement, width: number, height: number): fabric.Canvas {
    const fabricCanvas = new fabric.Canvas(canvasEl, {
      width,
      height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    })

    // 设置默认样式
    fabric.FabricObject.prototype.transparentCorners = false
    fabric.FabricObject.prototype.cornerColor = '#4a90d9'
    fabric.FabricObject.prototype.cornerStyle = 'circle'
    fabric.FabricObject.prototype.borderColor = '#4a90d9'
    fabric.FabricObject.prototype.cornerSize = 10

    canvas.value = fabricCanvas
    return fabricCanvas
  }

  function updateObjectCount() {
    if (!canvas.value) return
    objectCount.value = canvas.value.getObjects().length
  }

  function resizeCanvas(width: number, height: number) {
    if (!canvas.value) return
    canvas.value.setDimensions({ width, height })
    canvas.value.renderAll()
  }

  // 切换工具
  function setTool(tool: ToolType) {
    currentTool.value = tool
    isEraserMode.value = false
    isErasing.value = false

    if (!canvas.value) return

    // 重置画布模式
    canvas.value.isDrawingMode = false
    canvas.value.selection = true
    canvas.value.defaultCursor = 'default'

    // 确保所有对象可选择（除了背景图片等不可选对象）
    canvas.value.forEachObject(obj => {
      // 保留原本不可选择对象的状态（如背景图片）
      if (obj.selectable === false && obj.evented === false) return
      obj.selectable = true
      obj.evented = true
    })

    switch (tool) {
      case 'brush':
        enableBrush()
        break
      case 'highlighter':
        enableHighlighter()
        break
      case 'marker':
        enableMarker()
        break
      case 'eraser':
        enableEraser()
        break
      case 'pan':
        canvas.value.defaultCursor = 'grab'
        canvas.value.selection = false
        break
      case 'text':
        canvas.value.defaultCursor = 'text'
        break
      case 'select':
        break
      default:
        // 形状工具 - 不禁用对象选择,让用户可以选中和编辑已有对象
        canvas.value.selection = true
        canvas.value.defaultCursor = 'crosshair'
        break
    }

    canvas.value.renderAll()
  }

  // 画笔工具
  function enableBrush() {
    if (!canvas.value) return
    canvas.value.isDrawingMode = true
    canvas.value.freeDrawingBrush = new fabric.PencilBrush(canvas.value)
    canvas.value.freeDrawingBrush.color = settings.strokeColor
    canvas.value.freeDrawingBrush.width = settings.strokeWidth
  }

  // 荧光笔
  function enableHighlighter() {
    if (!canvas.value) return
    canvas.value.isDrawingMode = true
    canvas.value.freeDrawingBrush = new fabric.PencilBrush(canvas.value)
    canvas.value.freeDrawingBrush.color = hexToRgba(settings.strokeColor, 0.4)
    canvas.value.freeDrawingBrush.width = Math.max(settings.strokeWidth * 3, 15)
  }

  // 马克笔
  function enableMarker() {
    if (!canvas.value) return
    canvas.value.isDrawingMode = true
    canvas.value.freeDrawingBrush = new fabric.PencilBrush(canvas.value)
    canvas.value.freeDrawingBrush.color = hexToRgba(settings.strokeColor, 0.6)
    canvas.value.freeDrawingBrush.width = Math.max(settings.strokeWidth * 2, 8)
  }

  // 橡皮擦
  function enableEraser() {
    if (!canvas.value) return
    canvas.value.isDrawingMode = false
    canvas.value.selection = false
    canvas.value.defaultCursor = 'crosshair'
    isEraserMode.value = true
  }

  function hexToRgba(hex: string, alpha: number): string {
    let r = 0, g = 0, b = 0
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16)
      g = parseInt(hex[2] + hex[2], 16)
      b = parseInt(hex[3] + hex[3], 16)
    } else if (hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16)
      g = parseInt(hex.slice(3, 5), 16)
      b = parseInt(hex.slice(5, 7), 16)
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  // 鼠标按下
  function onMouseDown(opt: fabric.TPointerEventInfo) {
    if (!canvas.value) return

    // 如果点击的是对象且不是橡皮擦模式,不处理
    if (opt.target && currentTool.value !== 'eraser' && currentTool.value !== 'pan' && currentTool.value !== 'text') {
      return
    }

    // Fabric.js 7.0: 使用 scenePoint 替代 getPointer()
    const pointer = opt.scenePoint
    startPoint.value = { x: pointer.x, y: pointer.y }
    mousePos.value = { x: Math.round(pointer.x), y: Math.round(pointer.y) }

    // 橡皮擦模式
    if (currentTool.value === 'eraser') {
      isErasing.value = true
      eraseAtPoint(pointer)
      return
    }

    // 移动画布模式
    if (currentTool.value === 'pan') {
      isPanning.value = true
      const evt = opt.e as MouseEvent
      lastPanPoint.value = { x: evt.clientX, y: evt.clientY }
      canvas.value.defaultCursor = 'grabbing'
      return
    }

    // 文字工具 - 只在空白处创建
    if (currentTool.value === 'text') {
      const target = opt.target
      if (!target) {
        createText(pointer)
      }
      return
    }

    // 形状工具 - 只在空白处创建
    const shapeTools = ['line', 'arrow', 'rect', 'circle', 'triangle', 'diamond', 'polygon', 'star', 'highlight', 'bubble']
    if (shapeTools.includes(currentTool.value) && !opt.target) {
      isDrawing.value = true
      createShape(pointer)
    }
  }

  // 鼠标移动
  function onMouseMove(opt: fabric.TPointerEventInfo) {
    if (!canvas.value) return
    // Fabric.js 7.0: 使用 scenePoint 替代 getPointer()
    const pointer = opt.scenePoint
    mousePos.value = { x: Math.round(pointer.x), y: Math.round(pointer.y) }

    // 橡皮擦模式
    if (currentTool.value === 'eraser' && isErasing.value) {
      eraseAtPoint(pointer)
      return
    }

    // 移动画布
    if (isPanning.value && currentTool.value === 'pan' && lastPanPoint.value) {
      const evt = opt.e as MouseEvent
      const deltaX = evt.clientX - lastPanPoint.value.x
      const deltaY = evt.clientY - lastPanPoint.value.y
      canvas.value.relativePan(new fabric.Point(deltaX, deltaY))
      lastPanPoint.value = { x: evt.clientX, y: evt.clientY }
      return
    }

    // 绘制形状
    if (isDrawing.value && currentShape.value && startPoint.value) {
      updateShape(pointer)
    }
  }

  // 鼠标松开
  function onMouseUp() {
    if (!canvas.value) return

    // 橡皮擦模式
    if (currentTool.value === 'eraser' && isErasing.value) {
      isErasing.value = false
      return
    }

    // 移动画布
    if (isPanning.value) {
      isPanning.value = false
      canvas.value.defaultCursor = 'grab'
    }

    // 完成形状绘制
    if (isDrawing.value && currentShape.value) {
      isDrawing.value = false
      canvas.value.setActiveObject(currentShape.value)
      currentShape.value = null
    }
  }

  // 橡皮擦 - 删除接触到的对象 (参考原型实现)
  function eraseAtPoint(pointer: { x: number; y: number }) {
    if (!canvas.value) return

    // 使用原型的橡皮擦尺寸计算
    const eraserSize = Math.max(settings.strokeWidth * 5, 20)
    const objects = canvas.value.getObjects()
    const toRemove: fabric.FabricObject[] = []

    objects.forEach(obj => {
      // 跳过不可选择的对象（如背景图片）
      if (!obj.selectable && !obj.evented) return

      // 获取对象边界
      const bounds = obj.getBoundingRect()

      // 检查橡皮擦是否接触到对象边界
      if (
        pointer.x >= bounds.left - eraserSize &&
        pointer.x <= bounds.left + bounds.width + eraserSize &&
        pointer.y >= bounds.top - eraserSize &&
        pointer.y <= bounds.top + bounds.height + eraserSize
      ) {
        // 对于路径对象（画笔绘制），检查是否真的接触
        if (obj.type === 'path') {
          if (isPointNearPath(pointer, obj as fabric.Path, eraserSize)) {
            toRemove.push(obj)
          }
        } else {
          toRemove.push(obj)
        }
      }
    })

    // 删除所有标记的对象
    toRemove.forEach(obj => {
      canvas.value!.remove(obj)
    })

    if (toRemove.length > 0) {
      canvas.value!.renderAll()
      updateObjectCount()
    }
  }

  // 检查点是否靠近路径 (参考原型实现)
  function isPointNearPath(point: { x: number; y: number }, pathObj: fabric.Path, threshold: number): boolean {
    if (!pathObj.path) return false

    // 增加路径本身的线宽到检测范围
    const pathWidth = pathObj.strokeWidth || 1
    const actualThreshold = threshold + pathWidth / 2

    // 获取路径的变换矩阵
    const matrix = pathObj.calcTransformMatrix()

    // 获取路径的偏移量
    const pathOffset = (pathObj as any).pathOffset || { x: 0, y: 0 }

    for (let i = 0; i < pathObj.path.length; i++) {
      const cmd = pathObj.path[i]
      let px: number, py: number

      if (cmd[0] === 'M') {
        px = cmd[1] as number
        py = cmd[2] as number
      } else if (cmd[0] === 'L') {
        px = cmd[1] as number
        py = cmd[2] as number
      } else if (cmd[0] === 'Q') {
        // 二次贝塞尔曲线
        const cp1 = {
          x: matrix[0] * (cmd[1] - pathOffset.x) + matrix[2] * (cmd[2] - pathOffset.y) + matrix[4],
          y: matrix[1] * (cmd[1] - pathOffset.x) + matrix[3] * (cmd[2] - pathOffset.y) + matrix[5]
        }
        if (Math.sqrt(Math.pow(point.x - cp1.x, 2) + Math.pow(point.y - cp1.y, 2)) < actualThreshold) {
          return true
        }
        const endP = {
          x: matrix[0] * (cmd[3] - pathOffset.x) + matrix[2] * (cmd[4] - pathOffset.y) + matrix[4],
          y: matrix[1] * (cmd[3] - pathOffset.x) + matrix[3] * (cmd[4] - pathOffset.y) + matrix[5]
        }
        if (Math.sqrt(Math.pow(point.x - endP.x, 2) + Math.pow(point.y - endP.y, 2)) < actualThreshold) {
          return true
        }
        continue
      } else if (cmd[0] === 'C') {
        // 三次贝塞尔曲线 - 跳过
        continue
      } else {
        continue
      }

      // 检查点到路径点的距离
      const transformed = {
        x: matrix[0] * (px - pathOffset.x) + matrix[2] * (py - pathOffset.y) + matrix[4],
        y: matrix[1] * (px - pathOffset.x) + matrix[3] * (py - pathOffset.y) + matrix[5]
      }
      const dist = Math.sqrt(Math.pow(point.x - transformed.x, 2) + Math.pow(point.y - transformed.y, 2))
      if (dist < actualThreshold) {
        return true
      }
    }

    return false
  }

  // 创建形状
  function createShape(pointer: { x: number; y: number }) {
    if (!canvas.value) return
    const strokeDashArray = STROKE_DASH_MAP[settings.strokeStyle] || null

    const options = {
      stroke: settings.strokeColor,
      strokeWidth: settings.strokeWidth,
      strokeDashArray,
      fill: settings.fillShape ? settings.fillColor : 'transparent',
      selectable: true,
      evented: true,
      name: generateId(),
    }

    let shape: fabric.FabricObject | null = null

    switch (currentTool.value) {
      case 'line':
        shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          ...options,
          strokeLineCap: 'round',
          strokeLineJoin: 'round',
        })
        break
      case 'arrow':
        // 箭头工具 - 创建一个Group对象作为占位符
        shape = createArrow(pointer, pointer)
        break
      case 'rect':
        shape = new fabric.Rect({
          ...options,
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          rx: settings.borderRadius,
          ry: settings.borderRadius,
        })
        break
      case 'circle':
        shape = new fabric.Circle({
          ...options,
          left: pointer.x,
          top: pointer.y,
          radius: 0,
        })
        break
      case 'triangle':
        shape = new fabric.Triangle({
          ...options,
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
        })
        break
      case 'diamond':
        shape = new fabric.Polygon(
          [{ x: 0, y: -50 }, { x: 50, y: 0 }, { x: 0, y: 50 }, { x: -50, y: 0 }],
          { ...options, left: pointer.x, top: pointer.y, originX: 'center', originY: 'center', scaleX: 0.01, scaleY: 0.01 }
        )
        break
      case 'polygon':
        shape = new fabric.Polygon(
          getPolygonPoints(settings.polygonSides, 50),
          { ...options, left: pointer.x, top: pointer.y, originX: 'center', originY: 'center', scaleX: 0.01, scaleY: 0.01 }
        )
        break
      case 'star':
        shape = new fabric.Polygon(
          getStarPoints(5, 50, 25),
          { ...options, left: pointer.x, top: pointer.y, originX: 'center', originY: 'center', scaleX: 0.01, scaleY: 0.01 }
        )
        break
      case 'highlight':
        shape = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: 'rgba(255, 255, 0, 0.3)',
          stroke: 'rgba(255, 200, 0, 0.8)',
          strokeWidth: 2,
          selectable: true,
          evented: true,
          name: generateId(),
        })
        break
      case 'bubble':
        shape = new fabric.Rect({
          ...options,
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          rx: 10,
          ry: 10,
          isBubble: true,
        } as any)
        break
    }

    if (shape) {
      canvas.value.add(shape)
      currentShape.value = shape
      canvas.value.renderAll() // 确保形状立即显示
    }
  }

  // 更新形状
  function updateShape(pointer: { x: number; y: number }) {
    if (!canvas.value || !currentShape.value || !startPoint.value) return

    const width = pointer.x - startPoint.value.x
    const height = pointer.y - startPoint.value.y

    switch (currentTool.value) {
      case 'line':
        (currentShape.value as fabric.Line).set({ x2: pointer.x, y2: pointer.y })
        break
      case 'arrow':
        updateArrow(currentShape.value as fabric.Group, startPoint.value, pointer)
        break
      case 'rect':
      case 'highlight':
      case 'bubble':
        currentShape.value.set({
          width: Math.abs(width),
          height: Math.abs(height),
          left: width < 0 ? pointer.x : startPoint.value.x,
          top: height < 0 ? pointer.y : startPoint.value.y,
        })
        break
      case 'circle':
        const radius = Math.sqrt(width * width + height * height) / 2
        ;(currentShape.value as fabric.Circle).set({ radius })
        break
      case 'triangle':
        currentShape.value.set({
          width: Math.abs(width),
          height: Math.abs(height),
          left: width < 0 ? pointer.x : startPoint.value.x,
          top: height < 0 ? pointer.y : startPoint.value.y,
        })
        break
      case 'diamond':
      case 'polygon':
      case 'star':
        const scale = Math.max(Math.abs(width), Math.abs(height)) / 50
        currentShape.value.set({ scaleX: scale, scaleY: scale })
        break
    }

    canvas.value.renderAll()
  }

  // 创建箭头（只支持直线）
  function createArrow(start: { x: number; y: number }, end: { x: number; y: number }): fabric.Group {
    const strokeDashArray = STROKE_DASH_MAP[settings.strokeStyle] || undefined
    const angle = Math.atan2(end.y - start.y, end.x - start.x)
    const headSize = Math.max(12, settings.strokeWidth * 4)
    const objects: fabric.FabricObject[] = []

    // 创建直线
    const line = new fabric.Line([start.x, start.y, end.x, end.y], {
      stroke: settings.strokeColor,
      strokeWidth: settings.strokeWidth,
      strokeDashArray,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      selectable: false,
      evented: false,
    })
    objects.push(line)

    // 终点箭头
    const endHead = createArrowHead(end.x, end.y, angle, headSize)
    objects.push(endHead)

    // 双向箭头
    if (settings.arrowDirection === 'double') {
      const startHead = createArrowHead(start.x, start.y, angle + Math.PI, headSize)
      objects.push(startHead)
    }

    return new fabric.Group(objects, { selectable: true, evented: true })
  }

  // 更新箭头（重新创建以避免 Fabric.js 7.0 Group 坐标问题）
  function updateArrow(arrowGroup: fabric.Group, start: { x: number; y: number }, end: { x: number; y: number }) {
    if (!canvas.value) return

    // 在 Fabric.js 7.0 中，Group 内部对象的坐标是相对的
    // 最简单的方法是删除旧的 Group 并创建新的
    canvas.value.remove(arrowGroup)
    
    const newArrow = createArrow(start, end)
    canvas.value.add(newArrow)
    
    // 更新 currentShape 引用
    currentShape.value = newArrow
  }

  // 创建箭头头部
  function createArrowHead(x: number, y: number, angle: number, size: number): fabric.FabricObject {
    const halfSize = size / 2

    switch (settings.arrowHeadType) {
      case 'diamond': {
        const points = [
          { x: 0, y: -halfSize },
          { x: halfSize, y: 0 },
          { x: 0, y: halfSize },
          { x: -halfSize, y: 0 },
        ]
        const rotatedPoints = points.map(p => ({
          x: x + p.x * Math.cos(angle) - p.y * Math.sin(angle),
          y: y + p.x * Math.sin(angle) + p.y * Math.cos(angle),
        }))
        return new fabric.Polygon(rotatedPoints, { fill: settings.strokeColor, selectable: false, evented: false })
      }
      case 'circle':
        return new fabric.Circle({
          left: x,
          top: y,
          radius: halfSize,
          fill: settings.strokeColor,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
        })
      case 'open': {
        const points = [
          { x: x - size * Math.cos(angle - Math.PI / 6), y: y - size * Math.sin(angle - Math.PI / 6) },
          { x, y },
          { x: x - size * Math.cos(angle + Math.PI / 6), y: y - size * Math.sin(angle + Math.PI / 6) },
        ]
        return new fabric.Polyline(points, {
          stroke: settings.strokeColor,
          strokeWidth: settings.strokeWidth,
          fill: 'transparent',
          selectable: false,
          evented: false,
        })
      }
      default:
        return new fabric.Triangle({
          left: x,
          top: y,
          width: size,
          height: size,
          fill: settings.strokeColor,
          angle: (angle * 180) / Math.PI + 90,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
        })
    }
  }

  // 多边形顶点
  function getPolygonPoints(sides: number, radius: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = []
    const angleStep = (2 * Math.PI) / sides
    const startAngle = -Math.PI / 2
    for (let i = 0; i < sides; i++) {
      const angle = startAngle + i * angleStep
      points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) })
    }
    return points
  }

  // 星形顶点
  function getStarPoints(numPoints: number, outerRadius: number, innerRadius: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = []
    const angleStep = Math.PI / numPoints
    const startAngle = -Math.PI / 2
    for (let i = 0; i < numPoints * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius
      const angle = startAngle + i * angleStep
      points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) })
    }
    return points
  }

  // 创建文本
  function createText(pointer: { x: number; y: number }) {
    if (!canvas.value) return
    const text = new fabric.IText('双击编辑', {
      left: pointer.x,
      top: pointer.y,
      fontSize: settings.fontSize,
      fontFamily: settings.fontFamily,
      fill: settings.strokeColor,
      editable: true,
      selectable: true,
      evented: true,
      name: generateId(),
    })
    canvas.value.add(text)
    canvas.value.setActiveObject(text)
    canvas.value.renderAll()
    updateObjectCount()
  }

  // 插入图片
  function insertImage(file: File) {
    if (!canvas.value) return
    const reader = new FileReader()
    reader.onload = (e) => {
      fabric.FabricImage.fromURL(e.target?.result as string).then((img) => {
        const maxWidth = canvas.value!.width! * 0.8
        const maxHeight = canvas.value!.height! * 0.8
        if (img.width! > maxWidth || img.height! > maxHeight) {
          const scale = Math.min(maxWidth / img.width!, maxHeight / img.height!)
          img.scale(scale)
        }
        img.set({
          left: (canvas.value!.width! - img.getScaledWidth()) / 2,
          top: (canvas.value!.height! - img.getScaledHeight()) / 2,
          selectable: true,
          evented: true,
          name: generateId(),
        })
        canvas.value!.add(img)
        canvas.value!.setActiveObject(img)
        canvas.value!.renderAll()
        updateObjectCount()
      })
    }
    reader.readAsDataURL(file)
  }

  // 更新选中对象
  function updateSelectedObjects() {
    if (!canvas.value) return
    const activeObjects = canvas.value.getActiveObjects()
    if (!activeObjects.length) return

    const strokeDashArray = STROKE_DASH_MAP[settings.strokeStyle] || null

    activeObjects.forEach(obj => {
      obj.set({
        stroke: settings.strokeColor,
        strokeWidth: settings.strokeWidth,
        strokeDashArray,
        opacity: settings.opacity,
      })

      if (settings.fillShape && obj.type !== 'line' && obj.type !== 'path') {
        obj.set('fill', settings.fillColor)
      }

      if (obj.type === 'rect') {
        obj.set({ rx: settings.borderRadius, ry: settings.borderRadius })
      }

      if (obj.type === 'i-text' || obj.type === 'text') {
        obj.set({
          fontSize: settings.fontSize,
          fontFamily: settings.fontFamily,
          fill: settings.strokeColor,
        })
      }
    })

    canvas.value.renderAll()
  }

  // 删除选中
  function deleteSelected() {
    if (!canvas.value) return
    const activeObjects = canvas.value.getActiveObjects()
    if (activeObjects.length) {
      activeObjects.forEach(obj => canvas.value!.remove(obj))
      canvas.value.discardActiveObject()
      canvas.value.renderAll()
      updateObjectCount()
    }
  }

  // 全选
  function selectAll() {
    if (!canvas.value) return
    canvas.value.discardActiveObject()
    const selection = new fabric.ActiveSelection(canvas.value.getObjects(), { canvas: canvas.value })
    canvas.value.setActiveObject(selection)
    canvas.value.renderAll()
  }

  // 清空
  function clearAll() {
    if (!canvas.value) return
    canvas.value.clear()
    canvas.value.backgroundColor = '#ffffff'
    canvas.value.renderAll()
    updateObjectCount()
  }

  // 缩放
  function setZoom(newZoom: number) {
    if (!canvas.value) return
    zoom.value = Math.min(Math.max(0.1, newZoom), 5)
    const center = canvas.value.getVpCenter()
    canvas.value.zoomToPoint(center, zoom.value)
  }

  function zoomIn() {
    setZoom(zoom.value * 1.2)
  }

  function zoomOut() {
    setZoom(zoom.value / 1.2)
  }

  // 导出图片
  function exportImage(pixelRatio = 2): string {
    if (!canvas.value) return ''
    canvas.value.discardActiveObject()
    canvas.value.renderAll()
    return canvas.value.toDataURL({ format: 'png', multiplier: pixelRatio })
  }

  // 获取/设置状态
  function getState(): string {
    if (!canvas.value) return '[]'
    return JSON.stringify(canvas.value.toJSON())
  }

  async function setState(state: string): Promise<void> {
    if (!canvas.value) return
    await canvas.value.loadFromJSON(state)
    canvas.value.renderAll()
    updateObjectCount()
  }

  // 销毁
  function dispose() {
    if (canvas.value) {
      canvas.value.dispose()
      canvas.value = null
    }
  }

  // 更新设置
  function updateSettings(newSettings: Partial<EditorSettings>) {
    Object.assign(settings, newSettings)
    // 更新画笔
    if (canvas.value?.isDrawingMode && canvas.value.freeDrawingBrush) {
      if (currentTool.value === 'brush') {
        canvas.value.freeDrawingBrush.color = settings.strokeColor
        canvas.value.freeDrawingBrush.width = settings.strokeWidth
      } else if (currentTool.value === 'highlighter') {
        canvas.value.freeDrawingBrush.color = hexToRgba(settings.strokeColor, 0.4)
        canvas.value.freeDrawingBrush.width = Math.max(settings.strokeWidth * 3, 15)
      } else if (currentTool.value === 'marker') {
        canvas.value.freeDrawingBrush.color = hexToRgba(settings.strokeColor, 0.6)
        canvas.value.freeDrawingBrush.width = Math.max(settings.strokeWidth * 2, 8)
      }
    }
    updateSelectedObjects()
  }

  return {
    canvas,
    currentTool,
    settings,
    isDrawing,
    isPanning,
    isEraserMode,
    isErasing,
    zoom,
    leftCollapsed,
    hasObjects,
    mousePos,
    // 方法
    initCanvas,
    resizeCanvas,
    setTool,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    updateSettings,
    updateSelectedObjects,
    deleteSelected,
    selectAll,
    clearAll,
    setZoom,
    zoomIn,
    zoomOut,
    insertImage,
    exportImage,
    getState,
    setState,
    dispose,
    updateObjectCount,
  }
}
