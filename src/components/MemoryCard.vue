<template>
  <article class="memory-card" :class="{ flipped: flipped }">
    <div class="memory-card-inner">
      <div class="memory-card-front">
        <div class="memory-photo">{{ entry.imageLabel }}</div>
        <div class="memory-meta">
          <span>{{ formattedDate }}</span>
          <span>{{ entry.category }}</span>
        </div>
        <h3>{{ entry.title }}</h3>
        <p>{{ entry.excerpt }}</p>
        <span class="memory-tag">{{ entry.mood }}</span>
      </div>
      <div class="memory-card-back">
        <strong>Archive note</strong>
        <p>{{ entry.excerpt }}</p>
      </div>
    </div>
  </article>
</template>

<script setup>
import dayjs from 'dayjs'
import { computed } from 'vue'

const props = defineProps({
  entry: { type: Object, required: true },
  flipped: { type: Boolean, default: false }
})

const formattedDate = computed(() => dayjs(props.entry.date).format('DD MMM YYYY'))
</script>