<template>
  <article class="stat-card" ref="cardEl">
    <div class="stat-kicker">{{ kicker }}</div>
    <div class="stat-value">{{ value }}</div>
    <p>{{ description }}</p>
  </article>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

defineProps({
  kicker: { type: String, required: true },
  value: { type: [String, Number], required: true },
  description: { type: String, required: true }
})

const cardEl = ref(null)

onMounted(() => {
  gsap.from(cardEl.value, {
    opacity: 0,
    y: 28,
    duration: 0.7,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: cardEl.value,
      start: 'top 85%'
    }
  })
})
</script>