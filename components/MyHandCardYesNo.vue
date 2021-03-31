<template>
  <button
    @click="$emit('queue', card.id)"
    :class="[
      'animate__animated animate__bounceIn',
      {
        king: card.type === 'king',
        yesno: card.type === 'yes' || card.type === 'no',
        selectedInHand:
          card.id === { ...accumulations[0] }.id || card.id === { ...accumulations[1] }.id,
      },
    ]"
  >
    <img
      v-show="card.species === 'ber'"
      src="https://firebasestorage.googleapis.com/v0/b/gokipo-d9c62.appspot.com/o/beer.png?alt=media&token=2ff85eda-c61b-4d61-a687-50999a6bd386"
      style="width:100%; height:100%;"
    />
    <img
      v-show="card.species === 'gzd'"
      src="https://firebasestorage.googleapis.com/v0/b/gokipo-d9c62.appspot.com/o/gizzard.png?alt=media&token=2b7b0190-49af-414a-8df7-7705fa8510fd"
      style="width:100%; height:100%;"
    />
    <img
      v-show="card.species === 'lvr'"
      src="https://firebasestorage.googleapis.com/v0/b/gokipo-d9c62.appspot.com/o/lever.png?alt=media&token=6cdac074-358a-42eb-ad0b-9811abbc88e5"
      style="width:100%; height:100%;"
    />
    <img
      v-show="card.species === 'mon'"
      src="https://firebasestorage.googleapis.com/v0/b/gokipo-d9c62.appspot.com/o/monkfish_liver.png?alt=media&token=10be2888-38ce-4a82-8de1-b3542bf2457e"
      style="width:100%; height:100%;"
    />
    <img
      v-show="card.species === 'nbs'"
      src="https://firebasestorage.googleapis.com/v0/b/gokipo-d9c62.appspot.com/o/niboshi.png?alt=media&token=9b095df0-19c0-4b48-a230-3dfa42ced184"
      style="width:100%; height:100%;"
    />
    <img
      v-show="card.species === 'sal'"
      src="https://firebasestorage.googleapis.com/v0/b/gokipo-d9c62.appspot.com/o/salmon_roe.png?alt=media&token=68329903-8194-4d17-b265-8f14540ed2b8"
      style="width:100%; height:100%;"
    />
    <img
      v-show="card.species === 'srp'"
      src="https://firebasestorage.googleapis.com/v0/b/gokipo-d9c62.appspot.com/o/shrimp.png?alt=media&token=88568de9-9ff0-428a-a0ae-bdeb19978d18"
      style="width:100%; height:100%;"
    />
    <p v-show="card.type === 'yes' || card.type === 'no'">
      {{ card.species }}
    </p>
  </button>
</template>

<script>
export default {
  props: ['card', 'accumulations'],
}
</script>
