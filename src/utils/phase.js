export const lifecyclePhases = [
  { key: 'enlistment', label: 'Enlistment', kind: 'milestone' },
  { key: 'bmt', label: 'BMT', kind: 'training' },
  { key: 'pop', label: 'POP', kind: 'milestone' },
  { key: 'vocation', label: 'Vocation', kind: 'milestone' },
  { key: 'ord', label: 'ORD', kind: 'milestone' },
  ...Array.from({ length: 10 }, (_, index) => ({ key: `ict-${index + 1}`, label: `ICT Cycle ${index + 1}`, kind: 'reserve' })),
  { key: 'rod', label: 'ROD', kind: 'milestone' }
]

export const yearbookPhases = ['BMT', 'Vocation', 'Unit', 'ICT']

export const achievementKinds = [
  'IPPT Gold',
  'IPPT Silver',
  'IPPT Pass',
  'POP Badge',
  'Vocation Badge',
  'First Outfield',
  'Unit Commendation',
  ...Array.from({ length: 10 }, (_, index) => `ICT Cycle ${index + 1}`),
  'ROD Medal'
]