<template>
  <div class="app-shell">
    <AmbientParticles />
    <AppNavbar />

    <main class="app-main">
      <RouterView v-slot="{ Component, route }">
        <Transition mode="out-in" @enter="onEnter" @leave="onLeave" appear>
          <component :is="Component" :key="route.fullPath" />
        </Transition>
      </RouterView>
    </main>

    <ToastStack />
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import gsap from 'gsap'
import AppNavbar from './components/AppNavbar.vue'
import AmbientParticles from './components/AmbientParticles.vue'
import ToastStack from './components/ToastStack.vue'

const onEnter = (el, done) => {
  gsap.fromTo(el, { opacity: 0, x: 28, rotateY: -5 }, { opacity: 1, x: 0, rotateY: 0, duration: 0.55, ease: 'power3.out', onComplete: done })
}

const onLeave = (el, done) => {
  gsap.to(el, { opacity: 0, x: -18, duration: 0.25, ease: 'power2.in', onComplete: done })
}
</script>
