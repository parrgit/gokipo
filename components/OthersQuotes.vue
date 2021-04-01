<template>
  <p>
    <span v-show="(phase === 'accept' && player.isGiver) || (phase === 'yesno' && player.isGiver)">
      {{ progress.declare }}!
    </span>
    <span v-show="phase === 'accept' && player.isAcceptor">Hmm..</span>
    <span v-show="(phase === 'give' || phase === 'pass') && player.isGiver">Hmm..</span>
    <span v-show="phase === 'yesno' && player.isYesNoer">Ugh..</span>
    <span v-show="phase === 'waiting' && player.isLoser">I have gout..</span>
  </p>
</template>

<script>
export default {
  props: ['player', 'phase', 'progress'],
}
</script>
