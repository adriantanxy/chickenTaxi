<template>
  <section class="page page-reel">
    <div class="classified-panel dossier-card" v-if="!ordUnlocked">
      <p class="section-kicker">ORD reel</p>
      <h1>CLASSIFIED</h1>
      <p>The full highlight reel unlocks at ORD. A teaser filmstrip is still visible behind the blur.</p>
      <div class="countdown-chip">{{ countdownText }}</div>
    </div>

    <div class="reel-shell" :class="{ blurred: !ordUnlocked }">
      <Swiper :modules="swiperModules" :slides-per-view="1.15" :space-between="16" class="reel-swiper">
        <SwiperSlide v-for="slide in slides" :key="slide.title">
          <article class="reel-slide">
            <strong>{{ slide.title }}</strong>
            <p>{{ slide.copy }}</p>
          </article>
        </SwiperSlide>
      </Swiper>

      <div class="reel-panels">
        <article class="reel-stat dossier-card">
          <p class="section-kicker">Key stats</p>
          <strong>{{ store.stats.totalMemories }} memories</strong>
          <strong>{{ store.achievementProgress }}</strong>
          <strong>{{ store.stats.daysToNextMilestone }} days to the next milestone</strong>
        </article>
        <article class="reel-stat dossier-card">
          <p class="section-kicker">Enlistment vs ORD</p>
          <div class="split-card">
            <div>
              <small>Day 1</small>
              <p>Confused but determined.</p>
            </div>
            <div>
              <small>ORD</small>
              <p>Fully built archive and maybe a little wiser.</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import dayjs from 'dayjs'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Autoplay, EffectFade } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-fade'
import { useSagaStore } from '../stores/saga'

const store = useSagaStore()
const swiperModules = [Autoplay, EffectFade]
const ordUnlocked = false
const countdownText = computed(() => `${dayjs(store.user.ordDate).diff(dayjs(), 'day')} days to go`)

const slides = [
  { title: 'Graduation still frame', copy: 'Boots, parade square, and a moment frozen like a film still.' },
  { title: 'First book-out night', copy: 'The train ride home felt like a scene the camera would never quite catch.' },
  { title: 'Achievement montage', copy: 'Badges and milestones compressed into a cinematic strip.' }
]
</script>