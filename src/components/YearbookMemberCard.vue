<template>
  <article class="yearbook-card" @mouseenter="flipped = true" @mouseleave="flipped = false">
    <div class="yearbook-flip" :class="{ flipped }">
      <div class="yearbook-face yearbook-front">
        <div class="yearbook-avatar" :style="avatarStyle">
          <span class="avatar-hair" :class="member.avatar.hair"></span>
          <span class="avatar-eyes"></span>
          <span class="avatar-mouth" :class="member.avatar.mood"></span>
        </div>
        <strong>{{ member.name }}</strong>
        <span class="yearbook-tagline">{{ member.tagline }}</span>
        <span class="yearbook-badge">{{ member.superlative }}</span>
      </div>
      <div class="yearbook-face yearbook-back">
        <p>{{ member.message }}</p>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  member: { type: Object, required: true }
})

const flipped = ref(false)
const avatarStyle = computed(() => ({ '--avatar-color': props.member.avatar.color }))
</script>