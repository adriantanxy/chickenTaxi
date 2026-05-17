<template>
  <div class="ambient-particles" aria-hidden="true">
    <VueParticles id="saga-particles" :options="options" />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const options = computed(() => ({
  fullScreen: { enable: false },
  background: { color: { value: 'transparent' } },
  fpsLimit: 30,
  interactivity: { events: { onHover: { enable: false }, onClick: { enable: false }, resize: true } },
  particles: {
    color: { value: ['#f5f0e8', '#7bc67e', '#a7b38f'] },
    links: { enable: true, distance: 120, opacity: 0.06, color: '#7bc67e' },
    move: { enable: true, speed: 0.25, direction: 'none', outModes: { default: 'out' } },
    number: { value: 36 },
    opacity: { value: 0.12 },
    size: { value: { min: 0.8, max: 2.2 } },
    shape: { type: 'circle' }
  },
  detectRetina: true
}))
</script>