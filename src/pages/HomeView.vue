<template>
  <section class="page page-home">
    <div class="hero-shell dossier-shell">
      <div class="hero-copy">
        <p class="section-kicker">Classified personal archive</p>
        <h1 class="hero-title">Opening your dossier.</h1>
        <p class="hero-typed-line">Memories, milestones, and medals in one archive.</p>
        <p class="hero-summary">
          A military scrapbook for Singapore NSmen, built like a living time capsule and styled like a pinned-up dossier.
        </p>

        <div class="hero-callouts">
          <div class="callout-card">
            <span class="callout-label">Current phase</span>
            <strong>{{ store.user.currentPhaseLabel }}</strong>
            <p>{{ store.user.phaseNotes }}</p>
          </div>
          <div class="callout-card callout-alt">
            <span class="callout-label">Days since enlistment</span>
            <strong>{{ daysSinceEnlistment }}</strong>
            <p>Stamped using Day.js and updated live.</p>
          </div>
        </div>
      </div>

      <div class="dog-tag-wrap">
        <div ref="dogTagEl" class="dog-tag-card">
          <LottieBadge />
          <div class="dog-tag-chain"></div>
          <div class="dog-tag-avatar">{{ store.user.avatar }}</div>
          <div class="dog-tag-copy">
            <span class="dog-tag-name">{{ store.user.name }}</span>
            <span>{{ store.user.rank }}</span>
            <span>{{ store.user.status }}</span>
            <span>{{ store.user.unit }}</span>
            <span>{{ store.user.vocation }}</span>
          </div>
        </div>

        <PhaseProgress :phases="store.lifecyclePhases" :current-index="store.currentPhaseIndex" />
      </div>
    </div>

    <section class="section-block">
      <header class="section-head">
        <div>
          <p class="section-kicker">Archive metrics</p>
          <h2>Paper trail, but live.</h2>
        </div>
      </header>
      <div class="stats-grid">
        <StatCard kicker="Total Memories Logged" :value="store.stats.totalMemories" description="Every upload becomes part of the archive." />
        <StatCard kicker="Achievements Unlocked" :value="store.achievementProgress" description="Medals, badges, and milestones collected along the way." />
        <StatCard kicker="Days to Next Milestone" :value="store.stats.daysToNextMilestone" description="POP is still ahead, but the archive remembers the road there." />
      </div>
    </section>

    <section class="section-block latest-strip">
      <div class="latest-memory-card scrapbook-tilt">
        <p class="section-kicker">Latest memory</p>
        <MemoryCard :entry="store.latestMemory" />
      </div>
    </section>
  </section>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import dayjs from 'dayjs'
import { useNow } from '@vueuse/core'
import { useSagaStore } from '../stores/saga'
import PhaseProgress from '../components/PhaseProgress.vue'
import StatCard from '../components/StatCard.vue'
import MemoryCard from '../components/MemoryCard.vue'
import LottieBadge from '../components/LottieBadge.vue'
import gsap from 'gsap'

const store = useSagaStore()
const dogTagEl = ref(null)
const now = useNow({ interval: 60000 })

const daysSinceEnlistment = computed(() => dayjs(now.value).diff(dayjs(store.user.enlistmentDate), 'day'))

onMounted(() => {
  gsap.from(dogTagEl.value, {
    y: 36,
    opacity: 0,
    rotate: -4,
    duration: 0.8,
    ease: 'power3.out',
    delay: 0.15
  })
})
</script>