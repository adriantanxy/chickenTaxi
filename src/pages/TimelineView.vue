<template>
  <section class="page page-timeline">
    <header class="section-head">
      <div>
        <p class="section-kicker">Timeline archive</p>
        <h1>NS journey, chapter by chapter.</h1>
      </div>
      <button class="primary-button floating-plus" @click="showModal = true">＋ Add memory</button>
    </header>

    <div class="timeline-grid">
      <aside class="timeline-lane dossier-card">
        <h2>Chapters</h2>
        <p>Unlocked chapters are available. Locked chapters remain stamped CLASSIFIED until you reach them.</p>
        <div class="chapter-list">
          <article v-for="phase in store.lifecyclePhases" :key="phase.key" class="chapter-card" :class="{ current: phase.key === store.user.currentPhaseKey, locked: isLocked(phase.key) }">
            <strong>{{ phase.label }}</strong>
            <span>{{ isLocked(phase.key) ? 'CLASSIFIED' : 'OPEN' }}</span>
          </article>
        </div>
      </aside>

      <div class="timeline-track">
        <article
          v-for="(entry, index) in store.timelineEntries"
          :key="entry.id"
          class="memory-shell"
          :class="index % 2 === 0 ? 'align-left' : 'align-right'"
          ref="memoryRefs"
        >
          <MemoryCard :entry="entry" :flipped="hoveredId === entry.id" @mouseenter="hoveredId = entry.id" @mouseleave="hoveredId = null" />
        </article>
      </div>
    </div>

    <ModalShell v-if="showModal" kicker="New archive entry" title="Log a memory" @close="showModal = false">
      <form class="modal-form" @submit.prevent="submitMemory">
        <label>
          Photo upload
          <input type="file" accept="image/*" />
        </label>
        <label>
          Category
          <select v-model="memoryForm.category" required>
            <option disabled value="">Choose a category</option>
            <option>Official Ceremony</option>
            <option>Official Event</option>
            <option>Out of Camp</option>
          </select>
        </label>
        <label>
          Memory text
          <textarea v-model="memoryForm.excerpt" rows="4" placeholder="Write it like a journal entry..." />
        </label>
        <label>
          Audio upload (optional)
          <input type="file" accept="audio/*" />
        </label>
        <label>
          Mood tag
          <div class="mood-grid">
            <button v-for="mood in moods" :key="mood" type="button" class="mood-pill" :class="{ active: memoryForm.mood === mood }" @click="memoryForm.mood = mood">{{ mood }}</button>
          </div>
        </label>

        <p class="disclaimer-banner">
          Photos must be from official ceremonies, events, or out-of-camp moments only. In-camp photos are not permitted under MINDEF guidelines.
        </p>

        <button class="primary-button" type="submit">Log memory</button>
      </form>
    </ModalShell>
  </section>
</template>

<script setup>
import { nextTick, onMounted, reactive, ref } from 'vue'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { useSagaStore } from '../stores/saga'
import MemoryCard from '../components/MemoryCard.vue'
import ModalShell from '../components/ModalShell.vue'

gsap.registerPlugin(ScrollTrigger)

const store = useSagaStore()
const showModal = ref(false)
const hoveredId = ref(null)
const memoryRefs = ref([])
const moods = ['😤 Sian', '💪 Motivated', '🥲 Emotional', '😂 Funny', '🫡 Proud']
const memoryForm = reactive({
  phase: 'bmt',
  category: '',
  title: 'New field memory',
  excerpt: '',
  mood: moods[0],
  imageLabel: 'Uploaded photo'
})

const isLocked = (phaseKey) => ['pop', 'vocation', 'ord', 'rod'].includes(phaseKey)

const submitMemory = () => {
  store.addMemory({ ...memoryForm })
  showModal.value = false
  memoryForm.excerpt = ''
  memoryForm.category = ''
}

onMounted(async () => {
  await nextTick()
  memoryRefs.value.forEach((entry, index) => {
    if (!entry) return
    gsap.from(entry, {
      opacity: 0,
      x: index % 2 === 0 ? -60 : 60,
      duration: 0.7,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: entry,
        start: 'top 82%'
      }
    })
  })
})
</script>