import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import 'highlight.js/styles/github-dark.css'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
