import { createApp } from 'vue'
import { pinia } from './stores'
import router from './router'
import App from './App.vue'

// 导入样式
import './styles/variables.css'
import './styles/base.css'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.mount('#app')

// 根据路由设置背景
router.afterEach((to) => {
  if (to.path === '/settings') {
    document.body.classList.remove('main-window')
  } else {
    document.body.classList.add('main-window')
    document.body.style.background = 'transparent'
  }
})

// 初始化时设置
document.body.classList.add('main-window')
