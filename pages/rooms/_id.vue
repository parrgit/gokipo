<template>
  <div class="body">
    <div class="container">
      <p>{{ roomName }}</p>
      <p>phase: {{ phase }}</p>
      <div class="game-table">
        <div v-for="player in inPlayers" :key="player.id" class="player">
          <p>id: {{ player.id }}</p>
          <p>name: {{ player.name }}</p>
          <p>isReady: {{ player.isReady }}</p>
          <p>isAcceptor: {{ player.isAcceptor }}</p>
          <p>isGiver: {{ player.isGiver }}</p>
          <p>canbeNominated: {{ player.canbeNominated }}</p>
          <p>isLoser: {{ player.isLoser }}</p>
          <p>handNum: {{ player.handNum }}</p>
        </div>
      </div>
      <pre>{{ me }}</pre>
      <button @click="join">Join</button>
      <button @click="ready">Ready</button>
    </div>
    <hr />
    <h2>for debug</h2>
    <div class="container">
      <button @click="stack">referenceを配列にして返却</button>
      <button @click="displayCards">referenceを取得して表示</button>
      <pre>{{ $data }}</pre>
    </div>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
export default {
  data() {
    return {
      roomId: this.$route.params.id,
    }
  },
  computed: {
    ...mapGetters('user', ['uname', 'uid']),
    ...mapGetters('basics', ['roomName', 'phase', 'players']),
    me: function() {
      const me = this.players.find(player => {
        const spreadPlayer = { ...player } //一回スプレッドしてからオブジェクトに入れ込まないとplayerがObserverになり、undefinedになる
        return spreadPlayer.id === this.uid
      })
      return { ...me }.name
    },
    inPlayers: function() {
      return { ...this.players }
    },
  },
  async created() {
    await this.fetchBasics(this.roomId)
  },
  methods: {
    ...mapActions('basics', ['fetchBasics']),
    // ゲーム参加
    join() {
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
    // 自分のisReadyフラグをinvert
    async ready() {
      const docRef = this.$firestore.doc(`/rooms/${this.roomId}/players/${this.uid}`)
      // isReadyをinvertしてからgameStart関数を呼ぶ
      await docRef.get().then(doc => {
        docRef.update({
          isReady: !doc.data().isReady,
        })
      })
      const gameStart = this.$fireFunc.httpsCallable('gameStart')
      gameStart(this.roomId)
    },
    // サーバーでfirestoreからget→stack[]に入れ込む→クライアントに返却
    stack() {
      const initStack = this.$fireFunc.httpsCallable('initStack')
      initStack().then(result => {
        console.log(result.data)
      })
    },
    // コンソールでreferenceをみる用
    async displayCards() {
      let speciesTotal = {
        bat: 0,
        crh: 0,
        fly: 0,
        frg: 0,
        rat: 0,
        spn: 0,
        stk: 0,
      }
      let stack = []
      await this.$firestore
        .collection('/reference')
        // .orderBy('species')
        .get()
        .then(coll => {
          coll.forEach(doc => {
            // console.log(doc.id, ' => ', doc.data().species, doc.data().type)
            stack.push({ id: doc.id, type: doc.data().type, species: doc.data().species })
          })
        })
        .catch(error => {
          console.log('error getting documents: ', error)
        })
      console.log(`------------stack------------`)
      for (let i = 0; i < stack.length; i++) {
        switch (stack[i].species) {
          case 'bat':
            speciesTotal.bat++
            break
          case 'crh':
            speciesTotal.crh++
            break
          case 'fly':
            speciesTotal.fly++
            break
          case 'frg':
            speciesTotal.frg++
            break
          case 'rat':
            speciesTotal.rat++
            break
          case 'spn':
            speciesTotal.spn++
            break
          case 'stk':
            speciesTotal.stk++
            break
        }
      }
      console.log(speciesTotal)
    },
  },
}
</script>

<style lang="scss" scoped>
.body {
  box-sizing: border-box;
  height: 200vh;
}
.player {
  width: 330px;
  margin: 20px;
}
.game-table {
  width: 800px;
  height: 500px;
  border: 1px solid #fffffe;
  margin: auto;
  display: flex;
}
</style>
