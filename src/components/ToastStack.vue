<template>
  <div class="toast-stack">
    <TransitionGroup name="toast-list">
      <article v-for="toast in store.toasts" :key="toast.id" class="toast-card">
        <div class="toast-label">{{ toast.title }}</div>
        <p>{{ toast.message }}</p>
      </article>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useSagaStore } from '../stores/saga'

const store = useSagaStore()
</script>