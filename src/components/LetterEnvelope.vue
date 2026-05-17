<template>
  <article class="envelope-card" :class="{ sealed: letter.sealed }">
    <div class="envelope-art">
      <div class="envelope-flap"></div>
      <div class="envelope-body">
        <span class="seal">{{ letter.sealed ? 'SEALED' : 'OPEN' }}</span>
      </div>
    </div>
    <div class="envelope-copy">
      <strong>{{ letter.subject }}</strong>
      <p>{{ letter.sender }}</p>
      <small v-if="letter.sealed">Opens at {{ unlockLabel }}</small>
      <small v-else>Unlocked and ready to read</small>
    </div>
  </article>
</template>

<script setup>
import dayjs from 'dayjs'
import { computed } from 'vue'

const props = defineProps({
  letter: { type: Object, required: true }
})

const unlockLabel = computed(() => dayjs(props.letter.unlockDate).format('DD MMM YYYY'))
</script>