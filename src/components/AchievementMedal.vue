<template>
  <button class="achievement-medal" :class="{ unlocked: achievement.unlocked, pinned: achievement.pinned }" @click="$emit('click', achievement)">
    <span class="medal-core">{{ achievement.unlocked ? '★' : '🔒' }}</span>
    <span class="medal-label">{{ achievement.name }}</span>
  </button>
</template>

<script setup>
defineProps({
  achievement: { type: Object, required: true }
})

defineEmits(['click'])
</script>