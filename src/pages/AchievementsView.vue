<template>
  <section class="page page-achievements">
    <header class="section-head">
      <div>
        <p class="section-kicker">Achievement shelf</p>
        <h1>Your medals, pins, and bragging rights.</h1>
      </div>
      <div class="progress-meter">{{ store.achievementProgress }}</div>
    </header>

    <div class="shelf-stage">
      <div class="wood-shelf"></div>
      <div class="medal-grid">
        <AchievementMedal v-for="achievement in store.achievements" :key="achievement.id" :achievement="achievement" @click="handleSelect" />
      </div>
    </div>

    <article v-if="store.activeAchievement" class="achievement-detail dossier-card">
      <p class="section-kicker">Detail card</p>
      <h2>{{ store.activeAchievement.name }}</h2>
      <p>{{ store.activeAchievement.quote }}</p>
      <p v-if="store.activeAchievement.dateEarned">Earned {{ formattedDate }}</p>
      <div class="detail-actions">
        <button class="primary-button" @click="pinToTimeline">Pin to timeline</button>
      </div>
    </article>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import confetti from 'canvas-confetti'
import dayjs from 'dayjs'
import { useSagaStore } from '../stores/saga'
import AchievementMedal from '../components/AchievementMedal.vue'

const store = useSagaStore()

const handleSelect = (achievement) => {
  if (!achievement.unlocked) return
  store.selectAchievement(achievement.id)
  confetti({
    particleCount: 60,
    spread: 70,
    origin: { y: 0.7 },
    colors: ['#7bc67e', '#f5f0e8', '#d4a843']
  })
}

const pinToTimeline = () => {
  if (!store.activeAchievement) return
  store.pinAchievement(store.activeAchievement.id)
}

const formattedDate = computed(() => (store.activeAchievement?.dateEarned ? dayjs(store.activeAchievement.dateEarned).format('DD MMM YYYY') : ''))
</script>