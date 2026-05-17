import { defineStore } from 'pinia'
import dayjs from 'dayjs'
import { createMockSagaData } from '../data/mock'

const baseState = createMockSagaData()
const makeId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`

export const useSagaStore = defineStore('saga', {
  state: () => ({
    ...baseState,
    selectedYearbookPhase: baseState.yearbook.activePhase,
    activeLetterTab: 'Inbox',
    activeAchievement: null,
    toasts: []
  }),
  getters: {
    currentPhaseIndex(state) {
      return state.lifecyclePhases.findIndex((phase) => phase.key === state.user.currentPhaseKey)
    },
    currentPhase() {
      return this.lifecyclePhases[this.currentPhaseIndex] ?? this.lifecyclePhases[0]
    },
    latestMemory(state) {
      return state.timelineEntries[0]
    },
    unlockedAchievements(state) {
      return state.achievements.filter((achievement) => achievement.unlocked)
    },
    achievementProgress() {
      return `${this.unlockedAchievements.length} of ${this.achievements.length} achievements unlocked`
    },
    unreadLetterCount(state) {
      return state.letters.inbox.filter((letter) => letter.sealed).length
    }
  },
  actions: {
    addToast(title, message) {
      const id = makeId('toast')
      this.toasts.unshift({ id, title, message })
      window.setTimeout(() => {
        this.toasts = this.toasts.filter((toast) => toast.id !== id)
      }, 3200)
    },
    addMemory(entry) {
      this.timelineEntries.unshift({
        id: makeId('mem'),
        phase: entry.phase,
        date: dayjs().toISOString(),
        title: entry.title,
        excerpt: entry.excerpt,
        category: entry.category,
        mood: entry.mood,
        imageLabel: entry.imageLabel,
        pinned: false,
        audioLabel: entry.audioLabel || null
      })
      this.stats.totalMemories = this.timelineEntries.length
      this.addToast('MEMORY LOGGED', 'A new capsule entry was added to the archive.')
    },
    sendLetter(letter) {
      this.letters.sent.unshift({
        id: makeId('ltr'),
        sender: 'You',
        subject: letter.subject,
        sealed: letter.unlockDate !== 'now',
        unlockDate: letter.unlockDate === 'now' ? dayjs().toISOString() : letter.unlockDate,
        body: letter.body,
        category: letter.category,
        voice: 'Lined paper'
      })
      this.addToast('LETTER SEALED', 'Your note has been pinned into the archive.')
    },
    selectAchievement(achievementId) {
      this.activeAchievement = this.achievements.find((achievement) => achievement.id === achievementId) || null
    },
    pinAchievement(achievementId) {
      this.achievements = this.achievements.map((achievement) =>
        achievement.id === achievementId ? { ...achievement, pinned: true } : achievement
      )
      this.addToast('ACHIEVEMENT UNLOCKED', 'The medal was pinned to your timeline.')
    }
  }
})