import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../pages/HomeView.vue'
import TimelineView from '../pages/TimelineView.vue'
import YearbookView from '../pages/YearbookView.vue'
import LettersView from '../pages/LettersView.vue'
import AchievementsView from '../pages/AchievementsView.vue'
import OrdReelView from '../pages/OrdReelView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { title: 'SAGA | Dashboard' } },
  { path: '/timeline', name: 'timeline', component: TimelineView, meta: { title: 'SAGA | Timeline' } },
  { path: '/yearbook', name: 'yearbook', component: YearbookView, meta: { title: 'SAGA | Yearbook' } },
  { path: '/letters', name: 'letters', component: LettersView, meta: { title: 'SAGA | Letters' } },
  { path: '/achievements', name: 'achievements', component: AchievementsView, meta: { title: 'SAGA | Achievements' } },
  { path: '/ord-reel', name: 'ord-reel', component: OrdReelView, meta: { title: 'SAGA | ORD Reel' } }
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.afterEach((to) => {
  document.title = to.meta.title || 'SAGA'
})