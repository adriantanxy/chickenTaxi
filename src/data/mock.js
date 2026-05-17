import dayjs from 'dayjs'
import { achievementKinds, lifecyclePhases, yearbookPhases } from '../utils/phase'

const enlistmentDate = dayjs().subtract(132, 'day').startOf('day')
const ordDate = dayjs().add(842, 'day').startOf('day')

export const createMockSagaData = () => ({
  user: {
    name: 'NSF Recruit Irvin Toh',
    rank: 'Recruit',
    status: 'NSF / operationally ready',
    avatar: 'TJW',
    enlistmentDate: enlistmentDate.toISOString(),
    currentPhaseKey: 'bmt',
    currentPhaseLabel: 'BMT Week 6',
    ordDate: ordDate.toISOString(),
    vocation: 'Signals Operator (planned)',
    unit: '1 SIR / Bravo Company',
    phaseNotes: 'Current training lane: BMT Week 6. Next milestone: Route March and POP.',
    mood: 'Focused, slightly tired, still motivated.'
  },
  timelineEntries: [
    { id: 'mem-1', phase: 'bmt', date: dayjs().subtract(118, 'day').toISOString(), title: 'First admin day', excerpt: 'Issued gear, signed the forms, and learned how quickly a day can feel very long.', category: 'Official Ceremony', mood: '😤 Sian', imageLabel: 'Report day photo', pinned: true },
    { id: 'mem-2', phase: 'bmt', date: dayjs().subtract(110, 'day').toISOString(), title: 'Pride after oath-taking', excerpt: 'A serious moment on the parade square that somehow felt bigger than the whole camp.', category: 'Official Ceremony', mood: '🫡 Proud', imageLabel: 'Oath ceremony frame', pinned: false },
    { id: 'mem-3', phase: 'bmt', date: dayjs().subtract(98, 'day').toISOString(), title: 'Route march sunset', excerpt: 'Boots scuffed, shoulders heavy, but the section kept pace and the sky did the rest.', category: 'Official Event', mood: '💪 Motivated', imageLabel: 'Route march silhouette', pinned: false },
    { id: 'mem-4', phase: 'bmt', date: dayjs().subtract(83, 'day').toISOString(), title: 'First book-out grin', excerpt: 'That one-hour train ride felt like freedom. Everyone on the carriage knew it.', category: 'Out of Camp', mood: '😂 Funny', imageLabel: 'Book out selfie', pinned: false },
    { id: 'mem-5', phase: 'bmt', date: dayjs().subtract(58, 'day').toISOString(), title: 'BMT Week 6 checkpoint', excerpt: 'The first real sense that this archive will become something worth keeping for years.', category: 'Official Event', mood: '🥲 Emotional', imageLabel: 'Week 6 checkpoint', pinned: true }
  ],
  yearbook: {
    activePhase: 'BMT',
    phaseTabs: yearbookPhases,
    featuredQuote: 'The kind of cohort you only appreciate when you look back from ORD.',
    members: [
      { id: 'yb-1', name: 'Hui En', tagline: 'Keeps everyone in formation and on time.', superlative: 'Most Guai Lan', avatar: { hair: 'flat', accent: 'sticker', mood: 'smile', color: '#7bc67e' }, message: 'Thanks for carrying the whole section with equal parts sass and discipline.' },
      { id: 'yb-2', name: 'Azlan', tagline: 'Blur but reliable under pressure.', superlative: 'Forever Blur', avatar: { hair: 'curl', accent: 'glasses', mood: 'calm', color: '#d4a843' }, message: 'The best notes were the ones you pretended not to write but always remembered.' },
      { id: 'yb-3', name: 'Farah', tagline: 'Lives for outfield banter and perfect latrine inspections.', superlative: 'First to Book Out', avatar: { hair: 'ponytail', accent: 'cap', mood: 'grin', color: '#4a7c59' }, message: 'Still impressed by how you never missed the tiny details.' },
      { id: 'yb-4', name: 'Wei Ming', tagline: 'Quiet until the floor needs a clean solution.', superlative: 'Best Rifle Drill', avatar: { hair: 'buzz', accent: 'none', mood: 'serious', color: '#f5f0e8' }, message: 'Low-key the reason half the section survived administrative chaos.' },
      { id: 'yb-5', name: 'Irfan', tagline: 'The section photographer who makes every bad day look cinematic.', superlative: 'Candid King', avatar: { hair: 'wave', accent: 'camera', mood: 'laugh', color: '#a7b38f' }, message: 'When this book closes, your photos will still keep the memories alive.' },
      { id: 'yb-6', name: 'Nadia', tagline: 'First to help, last to complain.', superlative: 'Section Mum', avatar: { hair: 'bob', accent: 'heart', mood: 'soft', color: '#c8d9b6' }, message: 'You made the hardest days feel safer than they were.' }
    ]
  },
  letters: {
    inbox: [
      { id: 'ltr-1', sender: 'Recruit Tan Jun Wei', subject: 'To future me at ORD', sealed: false, unlockDate: ordDate.toISOString(), body: 'If you are reading this, remember the first book-out with the same urgency you remember the first parade.', category: 'yourself', voice: 'Caveat script' },
      { id: 'ltr-2', sender: 'LCP Haris', subject: 'Keep your boots ready', sealed: true, unlockDate: dayjs().add(847, 'day').toISOString(), body: 'Locked until ORD. The whole platoon already knows who never forgets his water bottle.', category: 'buddy', voice: 'Stencil post' }
    ],
    sent: [
      { id: 'sent-1', sender: 'You', subject: 'Advice for future NSFs', sealed: false, unlockDate: dayjs().subtract(5, 'day').toISOString(), body: 'Label your gear, sleep when you can, and keep a tiny notebook for the funny parts.', category: 'future NSF', voice: 'Handwritten note' }
    ],
    futureAdvice: [
      { id: 'advice-1', vocation: 'Signals', quote: 'Learn the systems early. The jokes come later.', author: 'ORDed Man, 2019' },
      { id: 'advice-2', vocation: 'Infantry', quote: 'A good section mate is worth more than a good packing list.', author: 'ORDed Man, 2022' },
      { id: 'advice-3', vocation: 'Logistics', quote: 'If it is not signed, stamped, or acknowledged, it does not exist.', author: 'ORDed Man, 2020' }
    ]
  },
  achievements: achievementKinds.map((name, index) => ({
    id: `ach-${index + 1}`,
    name,
    unlocked: index < 4 || name === 'IPPT Pass',
    dateEarned: index < 4 ? dayjs().subtract(45 - index * 4, 'day').toISOString() : null,
    quote: name === 'IPPT Gold' ? 'Your ancestors are proud.' : name === 'POP Badge' ? 'One more milestone on the parade square.' : name === 'ROD Medal' ? 'Return, rest, and look back with satisfaction.' : 'Stamped into the archive for future bragging rights.',
    pinned: index === 2 || index === 5
  })),
  stats: {
    totalMemories: 5,
    achievementsUnlocked: 5,
    daysToNextMilestone: dayjs().diff(dayjs().add(38, 'day'), 'day') * -1
  },
  lifecyclePhases
})