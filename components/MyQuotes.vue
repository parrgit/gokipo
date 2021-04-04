<template>
  <p>
    <span v-show="(phase === 'accept' && me.isGiver) || (phase === 'yesno' && me.isGiver)">
      {{ progress.declare }}!
    </span>
    <span v-show="(phase === 'give' || phase === 'pass') && me.isGiver">Hmm..</span>
    <span v-show="phase === 'accept' && me.isAcceptor">Hmm..</span>
    <span v-show="phase === 'yesno' && me.isYesNoer">Ugh..</span>
    <span v-show="phase === 'waiting' && me.isLoser">I have gout..</span>
  </p>
</template>

<script>
export default {
  props: ['me', 'phase', 'progress'],
}
</script>
