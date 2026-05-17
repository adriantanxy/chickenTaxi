import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
import Particles from '@tsparticles/vue3'
import App from './App.vue'
import './styles/global.css'

createApp(App).use(createPinia()).use(router).use(Particles).mount('#app')
