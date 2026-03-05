import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler'
      }
    }
  },
  clearScreen: false,
  server: {
    port: 5174,
    strictPort: true
  },
  envPrefix: ['VITE_', 'TAURI_'],
  // 设置正确的 base 路径，Tauri 应用需要相对路径
  base: './',
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'terser' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    // 确保资源路径是相对的
    assetsDir: 'assets',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      },
      mangle: {
        toplevel: true
        // 移除 properties 配置，避免混淆 CSS 变量和 Vue 内部属性
      }
    }
  }
})
