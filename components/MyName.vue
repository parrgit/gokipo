<template>
  <p
    :class="{
      active: (me.isGiver || me.isAcceptor || me.isYesNoer) && phase !== 'waiting' && !me.isLoser,
      canbeNominated: !me.canbeNominated,
      ready: me.isReady && phase === 'waiting',
      loser: me.isLoser,
    }"
    style="user-select:none;"
  >
    {{ me.name }}
  </p>
</template>

<script>
export default {
  props: ['me', 'phase'],
}
</script>
