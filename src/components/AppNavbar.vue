<template>
  <header class="navbar">
    <RouterLink class="brand" to="/">
      <span class="brand-mark">SAGA</span>
      <span class="dog-tag-icon" aria-hidden="true"></span>
    </RouterLink>

    <nav class="nav-links">
      <RouterLink v-for="link in links" :key="link.to" :to="link.to" class="nav-link">
        <span class="nav-icon">{{ link.icon }}</span>
        <span>{{ link.label }}</span>
      </RouterLink>
    </nav>
    <!-- hey -->
    <div class="phase-pill">
      <span class="phase-dot"></span>
      <span>{{ store.user.currentPhaseLabel }}</span>
      <!-- hey -->
    </div>
  </header>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { useSagaStore } from '../stores/saga'

const store = useSagaStore()

const links = [
  { to: '/', label: 'Dashboard', icon: '▣' },
  { to: '/timeline', label: 'Timeline', icon: '▤' },
  { to: '/yearbook', label: 'Yearbook', icon: '◫' },
  { to: '/letters', label: 'Letters', icon: '✉' },
  { to: '/achievements', label: 'Awards', icon: '🏅' },
  { to: '/ord-reel', label: 'ORD Reel', icon: '▶' }
]
</script>