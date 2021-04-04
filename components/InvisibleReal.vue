<template>
    <div
      v-show="(phase === 'accept' || phase === 'pass') && !(phase === 'pass' && me.isGiver)"
      style="position:absolute; left:-80px;bottom:20px;"
      :class="['animate__animated animate__fadeInLeft']"
    >
      <p>?</p>
    </div>
</template>

<script>
export default {
  props: ['phase', 'me'],
}
</script>
