<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <section class="modal-shell">
      <header class="modal-head">
        <div>
          <p class="modal-kicker">{{ kicker }}</p>
          <h3>{{ title }}</h3>
        </div>
        <button class="icon-button" @click="$emit('close')">✕</button>
      </header>
      <slot />
    </section>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  kicker: { type: String, required: true }
})

defineEmits(['close'])
</script>