<template>
  <div class="penalty">
    <h2>penalty cards</h2>
    <h3>common</h3>
    <div v-for="(value, name) in cards.common" :key="name" class="cards">
      <p>{{ name }}:</p>
      <p>{{ value }}</p>
    </div>
    <h3>king</h3>
    <div v-for="(value, name) in cards.king" :key="name" class="cards">
      <p>{{ name }}:</p>
      <p>{{ value }}</p>
    </div>
  </div>
</template>

<script>
export default {
  props: ['cards'],
}
</script>
