import { createApp, h } from 'vue'
import Toast from '@/components/common/Toast.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

export function useToast() {
  function show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 3000) {
    const container = document.createElement('div')
    document.body.appendChild(container)
    
    const app = createApp({
      render() {
        return h(Toast, {
          message,
          type,
          duration,
          onClose: () => {
            app.unmount()
            document.body.removeChild(container)
          }
        })
      }
    })
    
    app.mount(container)
  }
  
  function success(message: string, duration?: number) {
    show(message, 'success', duration)
  }
  
  function error(message: string, duration?: number) {
    show(message, 'error', duration)
  }
  
  function warning(message: string, duration?: number) {
    show(message, 'warning', duration)
  }
  
  function info(message: string, duration?: number) {
    show(message, 'info', duration)
  }
  
  function confirm(options: {
    title?: string
    message: string
    confirmText?: string
    cancelText?: string
    type?: 'danger' | 'primary'
  }): Promise<boolean> {
    return new Promise((resolve) => {
      const container = document.createElement('div')
      document.body.appendChild(container)
      
      const app = createApp({
        render() {
          return h(ConfirmDialog, {
            ...options,
            onConfirm: () => {
              app.unmount()
              document.body.removeChild(container)
              resolve(true)
            },
            onCancel: () => {
              app.unmount()
              document.body.removeChild(container)
              resolve(false)
            }
          })
        }
      })
      
      app.mount(container)
    })
  }
  
  return {
    show,
    success,
    error,
    warning,
    info,
    confirm
  }
}
