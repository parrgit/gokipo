<template>
  <div
    :style="{
      position: 'absolute',
      margin: '0',
      bottom: burdenBottom(i) + 'px',
    }"
    :class="[
      'animate__animated animate__bounceIn',
      {
        common: card.type === 'common',
        king: card.type === 'king',
        yesno: card.type === 'yes' || card.type === 'no',
      },
    ]"
  >
    <img
      v-show="card.species === 'ber'"
      src="https://firebasestorage.googleapis.com/v0/b/gokipo-d9c62.appspot.com/o/beer.png?alt=media&token=b637cb71-749c-4a77-a280-040f02cb736c"
    />
    <img
      v-show="card.species === 'gzd'"
      src="https://firebasestorage.googleapis.com/v0/b/gokipo-d9c62.appspot.com/o/gizzard.png?alt=media&token=ca3e81c1-cafd-46ed-8ffe-7533309e3ac8"
    />
    <img
      v-show="card.species === 'lvr'"
      src="https://firebasestorage.googleapis.com/v0/b/gokipo-d9c62.appspot.com/o/lever.png?alt=media&token=b90fe550-e922-4a42-a643-d8bcccec4003"
    />
    <img
      v-show="card.species === 'mon'"
      src="https://firebasestorage.googleapis.com/v0/b/gokipo-d9c62.appspot.com/o/monkfish_liver.png?alt=media&token=3777f460-9cb0-4886-a7f7-999f72975887"
    />
    <img
      v-show="card.species === 'nbs'"
      src="https://firebasestorage.googleapis.com/v0/b/gokipo-d9c62.appspot.com/o/niboshi.png?alt=media&token=b1c1082e-f3a6-46bf-ad99-98780fb8ff94"
    />
    <img
      v-show="card.species === 'sal'"
      src="https://firebasestorage.googleapis.com/v0/b/gokipo-d9c62.appspot.com/o/salmon_roe.png?alt=media&token=8e5abc27-711e-4603-9bd7-f7744777f098"
    />
    <img
      v-show="card.species === 'srp'"
      src="https://firebasestorage.googleapis.com/v0/b/gokipo-d9c62.appspot.com/o/shrimp.png?alt=media&token=b790f8f1-c079-461f-bb00-6215a6a43f56"
    />
    <img
      v-show="card.type === 'yes'"
      src="https://firebasestorage.googleapis.com/v0/b/gokipo-d9c62.appspot.com/o/yes.png?alt=media&token=fc4655c6-f791-4f5f-b68b-880bc13704ab"
    />
    <img
      v-show="card.type === 'no'"
      src="https://firebasestorage.googleapis.com/v0/b/gokipo-d9c62.appspot.com/o/no.png?alt=media&token=35fbd5b3-0bf5-44a5-a664-7af170c1380a"
    />
    <p style="position:absolute; bottom:-15px;">
      <span v-show="card.species === 'ber'">ber</span>
      <span v-show="card.species === 'gzd'">gzd</span>
      <span v-show="card.species === 'lvr'">lvr</span>
      <span v-show="card.species === 'mon'">mon</span>
      <span v-show="card.species === 'nbs'">nbs</span>
      <span v-show="card.species === 'sal'">sal</span>
      <span v-show="card.species === 'srp'">srp</span>
    </p>
  </div>
</template>

<script>
export default {
  props: ['card', 'i'],
  methods: {
    burdenBottom(i) {
      return i * 6
    },
  },
}
</script>

<style lang="scss" scoped>
p {
  text-shadow: 1px 0 0 black, 0 1px 0 black, -1px 0 0 black, 0 -1px 0 black;
}
</style>