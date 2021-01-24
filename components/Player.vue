<template>
  <div class="player">
    <!-- uid -->
    <p style="text-align:center;">{{ name }}</p>
    <div>
      <h2>hand</h2>
      <h3>common</h3>
      <div v-for="(value, name) in value.cards.hand.common" :key="name" class="cards">
        <p>{{ name }}:</p>
        <p>{{ value }}</p>
      </div>
      <h3>king</h3>
      <div v-for="(value, name) in value.cards.hand.king" :key="name" class="cards">
        <p>{{ name }}:</p>
        <p>{{ value }}</p>
      </div>
    </div>
    <h2>burden</h2>
    <div v-for="(value, name) in value.cards.burden" :key="name" class="cards">
      <p>{{ name }}:</p>
      <p>{{ value }}</p>
    </div>
    <button v-if="!value.isActive">指名</button>
  </div>
</template>

<script>
import { mapState } from 'vuex'
export default {
  props: ['value', 'name'],
  computed: {
    ...mapState(['player']),
  },
}
</script>
