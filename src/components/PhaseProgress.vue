<template>
  <section class="phase-progress">
    <div v-for="(phase, index) in phases" :key="phase.key" class="phase-segment" :class="segmentClass(index)">
      <span class="phase-label">{{ phase.label }}</span>
      <span v-if="index < currentIndex" class="phase-stamp">COMPLETED</span>
      <span v-else-if="index > currentIndex" class="phase-lock">🔒</span>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  phases: { type: Array, required: true },
  currentIndex: { type: Number, required: true }
})

const segmentClass = (index) => ({
  completed: index < props.currentIndex,
  current: index === props.currentIndex,
  future: index > props.currentIndex
})
</script>