<template>
  <div class="container">
    <div class="md-styles" v-html="mdFile"></div>
  </div>
</template>

<script>
import mdFile from '@/assets/description.md'
export default {
  computed: {
    mdFile() {
      return mdFile
    },
  },
}
</script>

<style lang="scss" scoped>
@import '@/assets/css/markdown.scss';
.container {
  margin: auto;
  width: 800px;
  background: darkblue;
}
</style>
