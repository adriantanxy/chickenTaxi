<template>
  <section class="page page-letters">
    <header class="section-head">
      <div>
        <p class="section-kicker">Sealed letters</p>
        <h1>Inbox, sent, and future advice.</h1>
      </div>
      <button class="primary-button" @click="showCompose = true">Write a letter</button>
    </header>

    <div class="tab-row">
      <button class="folder-tab" :class="{ active: store.activeLetterTab === 'Inbox' }" @click="store.activeLetterTab = 'Inbox'">Inbox</button>
      <button class="folder-tab" :class="{ active: store.activeLetterTab === 'Sent' }" @click="store.activeLetterTab = 'Sent'">Sent</button>
    </div>

    <div class="envelope-grid">
      <div v-for="letter in currentLetters" :key="letter.id" class="envelope-wrap" @click="openLetter(letter)">
        <LetterEnvelope :letter="letter" />
      </div>
    </div>

    <section class="section-block">
      <div class="pinboard-head">
        <div>
          <p class="section-kicker">Letters to future NSFs</p>
          <h2>Advice from men who already made it out.</h2>
        </div>
      </div>
      <div class="pinboard-grid">
        <article v-for="advice in store.letters.futureAdvice" :key="advice.id" class="pinboard-card">
          <span class="pushpin">📌</span>
          <small>{{ advice.vocation }}</small>
          <p>{{ advice.quote }}</p>
          <strong>{{ advice.author }}</strong>
        </article>
      </div>
    </section>

    <ModalShell v-if="showCompose" kicker="Letter compose" title="Write a letter" @close="showCompose = false">
      <form class="modal-form letter-form" @submit.prevent="submitLetter">
        <label>
          Recipient
          <select v-model="composeForm.category" required>
            <option value="yourself">Yourself</option>
            <option value="buddy">A buddy</option>
            <option value="future NSF">A future NSF</option>
          </select>
        </label>
        <label>
          Unlock trigger
          <select v-model="composeForm.unlockDate">
            <option value="now">Immediately</option>
            <option :value="store.user.ordDate">On your ORD</option>
            <option :value="store.user.ordDate">On their ORD</option>
            <option :value="store.user.enlistmentDate">On a specific date</option>
          </select>
        </label>
        <label>
          Subject
          <input v-model="composeForm.subject" required />
        </label>
        <label>
          Letter body
          <textarea v-model="composeForm.body" rows="6" class="lined-paper"></textarea>
        </label>
        <button class="primary-button" type="submit">Seal letter</button>
      </form>
    </ModalShell>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { useSagaStore } from '../stores/saga'
import LetterEnvelope from '../components/LetterEnvelope.vue'
import ModalShell from '../components/ModalShell.vue'

const store = useSagaStore()
const showCompose = ref(false)
const composeForm = reactive({
  category: 'yourself',
  unlockDate: 'now',
  subject: 'Untitled letter',
  body: 'Write something worth opening later.'
})

const currentLetters = computed(() => (store.activeLetterTab === 'Inbox' ? store.letters.inbox : store.letters.sent))

const openLetter = (letter) => {
  if (letter.sealed) {
    const daysAway = dayjs(letter.unlockDate).diff(dayjs(), 'day')
    store.addToast('CLASSIFIED', `Opens in ${daysAway} days.`)
    return
  }

  store.selectAchievement('ach-1')
  store.addToast('LETTER OPENED', letter.subject)
}

const submitLetter = () => {
  store.sendLetter(composeForm)
  showCompose.value = false
}
</script>