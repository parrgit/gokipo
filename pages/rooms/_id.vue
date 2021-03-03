<template>
  <div class="body">
    <div class="container">
      <p>{{ roomName }}</p>
      <p>phase: {{ phase }}</p>
      <div class="game-table">
        <button
          v-for="player in inPlayers"
          :key="player.id"
          @click="selectAcceptor(player.id)"
          class="player"
          :disabled="player.id === uid"
        >
          <p>id: {{ player.id }}</p>
          <p>name: {{ player.name }}</p>
          <p>isReady: {{ player.isReady }}</p>
          <p>isAcceptor: {{ player.isAcceptor }}</p>
          <p>isGiver: {{ player.isGiver }}</p>
          <p>canbeNominated: {{ player.canbeNominated }}</p>
          <p>isLoser: {{ player.isLoser }}</p>
          <p>handNum: {{ player.handNum }}</p>
        </button>
      </div>
      <pre>{{ me }}</pre>
      <!-- realの選択 -->
      <select v-model="realId">
        <option value="" disabled selected>select a burden</option>
        <option v-for="card in hand" :key="card.id" :value="card.id">
          <p>{{ card.type }} {{ card.species }}</p>
        </option>
      </select>
      <!-- declareの選択 -->
      <select v-model="declare">
        <option value="" disabled selected>select a declare</option>
        <option
          v-for="declareElement in declareElements"
          :key="declareElement"
          :value="declareElement"
        >
          <p>{{ declareElement }}</p>
        </option>
      </select>

      <div class="buttons">
        <button @click="join">Join</button>
        <button @click="ready">Ready</button>
        <button @click="give">Give</button>
      </div>
      <div style="display: flex;" class="info">
        <pre>{{ real }}</pre>
        <p>{{ declare }}</p>
        <p>{{ acceptorId }}</p>
      </div>
    </div>
    <pre>{{ progress }}</pre>
    <!-- ---------------------------------------------------------------- -->
    <hr />
    <h2>for debug</h2>
    <div class="debugs">
      <button @click="stack">referenceを配列にして返却</button>
      <button @click="displayCards">referenceを取得して表示</button>
      <button @click="waiting">phaseをwaitingに</button>
      <button @click="console">カード全部削除用(2021/3/2)</button>
      <button @click="initialize">ルーム初期化用(2021/3/4)</button>
    </div>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
export default {
  data() {
    return {
      realId: '',
      declare: '',
      acceptorId: '',
      declareElements: ['king', 'bat', 'crh', 'fly', 'frg', 'rat', 'spn', 'stk'],
      // reol: { //TODO消す
      //   id: 'TGQrubqxJYhjKAif5Ngo',
      //   type: 'common',
      //   species: 'bat',
      // },
    }
  },
  computed: {
    ...mapGetters('user', ['uname', 'uid']),
    ...mapGetters('basics', ['roomName', 'phase', 'players', 'hand', 'progress']),
    roomId() {
      return this.$route.params.id
    },
    inHand() {
      return [...this.hand]
    },
    inPlayers() {
      // 一回スプレッドしてからオブジェクトに入れ込まないとplayerがObserverになり、undefinedになる
      return [...this.players]
    },
    submission() {
      return {
        declare: this.declare,
        real: this.real,
        // real: this.reol, //TODO消す
        acceptorId: this.acceptorId,
        roomId: this.roomId,
      }
    },
    me() {
      const me = this.inPlayers.find(player => {
        return player.id === this.uid
      })
      return { ...me }.name //スプレッドしないと表示できない例
    },
    real() {
      return this.inHand.find(card => {
        return card.id === this.realId
      })
    },
  },
  async created() {
    const user = await this.$auth()
    this.fetchBasics({ roomId: this.roomId, uid: user.uid })
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
    // 自分のisReadyフラグをinvert -> functioins発火
    async ready() {
      const playerDoc = this.$firestore.doc(`/rooms/${this.roomId}/players/${this.uid}`)
      // isReadyをinvertしてからgameStart関数を呼ぶ
      await playerDoc.get().then(doc => {
        playerDoc.update({
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
      let stack = []
      const reference = this.$firestore.collection('/reference')
      await reference
        // .orderBy('species')
        .get()
        .then(coll => {
          coll.forEach(doc => {
            // console.log(doc.id, ' => ', doc.data().species, doc.data().type)
            stack.push({ id: doc.id, type: doc.data().type, species: doc.data().species })
          })
          console.table(stack)
        })
        .catch(error => {
          console.log('error getting documents: ', error)
        })
    },
    // phaseをwaitingに戻す
    waiting() {
      const progress = this.$firestore.doc(`/rooms/${this.roomId}/progress/progDoc`)
      progress.update({ phase: 'waiting' })
    },
    // プレイヤー選択
    selectAcceptor(playerId) {
      this.acceptorId = playerId
    },
    give() {
      const give = this.$fireFunc.httpsCallable('give')
      give(this.submission)
    },
    console() {
      const handCol = this.$firestore.collection(
        `/rooms/${this.roomId}/invPlayers/${this.uid}/hand`
      )
      handCol.get().then(col => {
        col.forEach(doc => {
          doc.ref.delete()
        })
      })
    },
    initialize() {
      const roomData = {
        minNumber: 2,
        maxNumber: 6,
        currentNumber: 0,
        createdAt: this.$firebase.firestore.FieldValue.serverTimestamp(),
      }
      const progressData = {
        phase: 'waiting',
        declare: null,
        answer: null,
        turn: 0,
      }
      const roomDoc = this.$firestore.doc(`/rooms/${this.roomId}`)
      const progressDoc = this.$firestore.doc(`rooms/${this.roomId}/progress/progDoc`)
      roomDoc.update(roomData)
      progressDoc.update(progressData)
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
  height: 320px;
  border: 1px solid #fffffe;
  margin: auto;
  display: flex;
  font-size: 14px;
  line-height: 3px;
}
.buttons {
  display: flex;
}
.debugs {
  display: flex;
}
.info > p {
  padding: 0 10px;
}
</style>
