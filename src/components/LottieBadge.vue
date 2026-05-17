<template>
  <div ref="badgeEl" class="lottie-badge"></div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import lottie from 'lottie-web'

const badgeEl = ref(null)
let instance = null

const animationData = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 128,
  h: 128,
  nm: 'SAGA pulse badge',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'Pulse circle',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 1, k: [{ t: 0, s: [0], e: [360], i: { x: [0.667], y: [1] }, o: { x: [0.333], y: [0] } }, { t: 60 }] },
        p: { a: 0, k: [64, 64, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [65, 65, 100], e: [95, 95, 100], i: { x: [0.42], y: [0] }, o: { x: [0.58], y: [1] } }, { t: 30, s: [95, 95, 100], e: [65, 65, 100], i: { x: [0.42], y: [0] }, o: { x: [0.58], y: [1] } }, { t: 60 }] }
      },
      shapes: [
        {
          ty: 'gr',
          it: [
            { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [72, 72] }, nm: 'Ellipse Path 1' },
            { ty: 'fl', c: { a: 0, k: [0.48, 0.78, 0.49, 1] }, o: { a: 0, k: 90 }, r: 1, nm: 'Fill 1' },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, sk: { a: 0, k: 0 }, sa: { a: 0, k: 0 } }
          ],
          nm: 'Group 1'
        }
      ],
      ip: 0,
      op: 60,
      st: 0,
      bm: 0
    }
  ]
}

onMounted(() => {
  instance = lottie.loadAnimation({
    container: badgeEl.value,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    animationData
  })
})

onBeforeUnmount(() => {
  instance?.destroy()
})
</script>