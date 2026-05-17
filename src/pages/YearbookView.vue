<template>
  <section class="page page-yearbook">
    <header class="section-head">
      <div>
        <p class="section-kicker">Cohort yearbook</p>
        <h1>Everybody you travelled with, printed into one spread.</h1>
      </div>
    </header>

    <div class="folder-tabs">
      <button v-for="tab in store.yearbook.phaseTabs" :key="tab" class="folder-tab" :class="{ active: store.selectedYearbookPhase === tab }" @click="store.selectedYearbookPhase = tab">
        {{ tab }}
      </button>
    </div>

    <article class="group-page dossier-card">
      <div class="group-photo">{{ store.selectedYearbookPhase }} group photo placeholder</div>
      <div class="group-copy">
        <span class="stamp">{{ store.selectedYearbookPhase }}</span>
        <h2>{{ phaseHeadline }}</h2>
      </div>
    </article>

    <div class="featured-strip">
      <Carousel :items-to-show="1.1" :wrap-around="true">
        <Slide v-for="member in store.yearbook.members.slice(0, 4)" :key="member.id">
          <div class="quote-card">
            <p>{{ member.message }}</p>
            <strong>{{ member.name }} · {{ member.superlative }}</strong>
          </div>
        </Slide>
      </Carousel>
    </div>

    <div class="yearbook-grid">
      <YearbookMemberCard v-for="member in store.yearbook.members" :key="member.id" :member="member" />
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { Carousel, Slide } from 'vue3-carousel'
import 'vue3-carousel/dist/carousel.css'
import { useSagaStore } from '../stores/saga'
import YearbookMemberCard from '../components/YearbookMemberCard.vue'

const store = useSagaStore()
const phaseHeadline = computed(() => {
  switch (store.selectedYearbookPhase) {
    case 'Vocation':
      return 'The chapter where training turns into identity.'
    case 'Unit':
      return 'The page where the section becomes the unit.'
    case 'ICT':
      return 'Reserve life, reunion rounds, and the stories that never really end.'
    default:
      return store.yearbook.featuredQuote
  }
})
</script>