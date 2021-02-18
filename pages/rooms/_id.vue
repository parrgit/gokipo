<template>
  <div>
    <div class="container">
      <p>{{ roomName }}</p>
      <p>phase: {{ phase }}</p>
      <div class="game-table"></div>
      <pre>{{ ME }}</pre>
      <button @click="join">join</button>
      <button @click="test">test</button>
    </div>
  </div>
</template>

<script>
import { mapActions, mapGetters, mapState } from 'vuex'
export default {
  data() {
    return {
      uid: '',
    }
  },
  computed: {
    ...mapGetters('basics', ['roomName', 'phase', 'players']),
    ME: function() {
      const me = this.players.find(player => {
        const spread = { ...player } //一回スプレッドしてからオブジェクトに入れ込まないとplayerがObserverになり、undefinedになる
        return spread.id === this.uid
      })
      console.log({ ...me }.name)
      return { ...me }.name
    },
  },
  async created() {
    await this.fetchBasics(this.$route.params.id)
    const user = await this.$auth()
    this.uid = user.uid
  },
  methods: {
    ...mapActions('basics', ['fetchBasics']),
    test: function() {
      let a = 2
      console.log(a)
    },
    async join() {
      const playerData = {
        name: this.uname,
        isGiver: false,
        isAcceptor: false,
        canbeNominated: true,
        isReady: false,
        isLoser: false,
        handNum: 0,
      }
      this.$firestore.doc(`rooms/${this.roomId}/players/${this.uid}`).set(playerData)
    },
  },
}
</script>

<style lang="scss" scoped>
.game-table {
  width: 800px;
  height: 500px;
  border: 1px solid #fffffe;
  margin: auto;
}
</style>
