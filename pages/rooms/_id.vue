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
          :class="['player', { me: player.id === uid }]"
          :disabled="player.id === uid"
        >
          <!-- <p>id: {{ player.id }}</p> -->
          <p>name: {{ player.name }}</p>
          <p :class="{ isActive: player.isReady }">isReady: {{ player.isReady }}</p>
          <p :class="{ isActive: player.isAcceptor }">isAcceptor: {{ player.isAcceptor }}</p>
          <p :class="{ isActive: player.isYesNoer }">isYesNoer: {{ player.isYesNoer }}</p>
          <p :class="{ isActive: player.isGiver }">isGiver: {{ player.isGiver }}</p>
          <p :class="{ isActive: !player.canbeNominated }">
            canbeNominated: {{ player.canbeNominated }}
          </p>
          <!-- <p>isLoser: {{ player.isLoser }}</p> -->
          <p>handNum: {{ player.handNum }}</p>
          <p>burden</p>
          <p>{{ speciesOfBurden(player.burden) }}</p>
        </button>
      </div>
      <!-- <pre>{{ me }}</pre> -->
      <div class="selecters">
        <!-- realの選択 -->
        <select v-model="realId">
          <option value="" disabled selected>select a real</option>
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
        <!-- burdensの選択 -->
        <select v-model="burdenIds" multiple size="10">
          <option value="" disabled selected>select a burden(s)</option>
          <option v-for="card in hand" :key="card.id" :value="card.id">
            <p>{{ card.type }} {{ card.species }}</p>
          </option>
        </select>
        <!-- <v-select
          :options="hand"
          v-model="burdenIds"
          label="type"
          multiple
          :reduce="options => options.id"
        /> -->
      </div>

      <!-- <pre>{{ $data }}</pre> -->

      <!-- ==================== buttons ==================== -->
      <div class="buttons">
        <button @click="join">Join</button>
        <!-- TODO退出関数作る -->
        <!-- <button @click="getOut">get out</button> -->
        <button @click="ready">Ready</button>
        <button @click="give">Give</button>
        <button @click="answer(true)">True!</button>
        <button @click="answer(false)">Lie!</button>
        <button @click="pass">Pass</button>
        <button @click="accumlate">Accumlate</button>
      </div>
      <div style="display: flex;" class="info">
        <!-- <p>{{ declare }}</p>
        <p>{{ acceptorId }}</p> -->
      </div>
    </div>
    <div class="subInfo">
      <pre>progress: {{ progress }}</pre>
      <pre>penaTop: {{ penaltyTop }}</pre>
      <pre>{{ burdens }}</pre>
    </div>
    <!-- ==================== debug tools ==================== -->
    <hr />
    <h2>for debug</h2>
    <div class="debugs">
      <button @click="stack">referenceを配列にして返却</button>
      <button @click="displayCards">referenceを取得して表示</button>
      <button @click="waiting">phaseをwaitingに</button>
      <button @click="console">マイカード全部削除用(2021/3/2)</button>
      <button @click="initializeRoom">ルーム初期化用(2021/3/4)</button>
    </div>
    <div style="position:relative;">
      <div style="width:100px;height:300px;z-index:1;background:#333;position:absolute;">1</div>
      <div
        style="width:100px;height:300px;z-index:1;background:#333;position:absolute;left:10px;border:white;"
      >
        2
      </div>
      <div style="width:100px;height:300px;z-index:1;background:#333;position:absolute;left:20px;">
        3
      </div>
      <div style="width:100px;height:300px;z-index:1;background:#333;position:absolute;left:30px;">
        4
      </div>
    </div>
    <div></div>
    <div></div>
    <div></div>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
export default {
  data() {
    return {
      burdenIds: [],
      realId: '',
      declare: '',
      acceptorId: '',
      declareElements: ['king', 'bat', 'crh', 'fly', 'frg', 'rat', 'spn', 'stk'],
    }
  },
  computed: {
    ...mapGetters('user', ['uname', 'uid']),
    ...mapGetters('basics', ['roomName', 'phase', 'players', 'hand', 'progress', 'penaltyTop']),
    roomId() {
      return this.$route.params.id
    },
    inHand() {
      // 一回スプレッドしてからオブジェクトに入れ込まないとaryがObserverになり、undefinedになる
      return [...this.hand]
    },
    inPlayers() {
      return [...this.players]
    },
    submission() {
      return {
        declare: this.declare,
        real: this.real,
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
    burdens() {
      const burdens = []
      this.burdenIds.forEach(burdenId => {
        const obj = this.inHand.find(card => {
          return card.id === burdenId
        })
        burdens.push(obj)
      })
      return burdens
    },
  },
  async created() {
    const user = await this.$auth()
    await this.fetchBasics({ roomId: this.roomId, uid: user.uid })
    // await this.fetchBurdens({ roomId: this.roomId, uid: user.uid })
  },
  methods: {
    ...mapActions('basics', ['fetchBasics']),
    // ゲーム参加
    join() {
      const playerData = {
        name: this.uname,
        isGiver: false,
        isAcceptor: false,
        isYesNoer: false,
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
    displayCards() {
      let stack = []
      const reference = this.$firestore.collection('/reference')
      reference
        .orderBy('species')
        .get()
        .then(col => {
          col.forEach(doc => {
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
    initializeRoom() {
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
      this.inPlayers.forEach(player => {
        const burdenCol = this.$firestore.collection(
          `rooms/${this.roomId}/players/${player.id}/burden`
        )
        burdenCol.get().then(col => {
          col.forEach(doc => {
            doc.ref.delete()
          })
        })
      })
    },
    answer(ans) {
      const answer = this.$fireFunc.httpsCallable('answer')
      const dataSet = {
        roomId: this.roomId,
        ans: ans,
      }
      answer(dataSet)
    },
    pass() {
      const pass = this.$fireFunc.httpsCallable('pass')
      pass(this.roomId)
    },

    accumlate() {
      const accumulate = this.$fireFunc.httpsCallable('accumulate')
      let includeYesNo = false //提出カードにyes/noが含まれていないか
      const burdens = [...this.burdens] //とりあえずスプレッド、必要ない可能性あり
      const declare = this.progress.declare
      if (this.progress.phase !== 'yesno') {
        // alert('yesnoフェーズではありません')
        // return //TODOつける
      }
      if (burdens.length < 1 || burdens.length > 2) {
        alert('宣言と同じカードであれば1枚、同じでなければ2枚出してください')
        return
      }
      burdens.forEach(burden => {
        const flag = burden.type === 'yes' || burden.type === 'no'
        includeYesNo = includeYesNo || flag
      })
      if (includeYesNo) {
        alert('yes/noは選択できません')
        return
      }
      //1枚提出
      if (burdens.length < 2) {
        if (declare === 'king') {
          if (burdens[0].type === 'king') {
            accumulate({ roomId: this.roomId, burden: burdens })
            return
          } else {
            alert('1枚のキングを溜めるか、キング以外で2枚溜めてください')
            return
          }
        } else {
          if (burdens[0].species === declare) {
            accumulate({ roomId: this.roomId, burden: burdens })
            return
          } else {
            alert('宣言された物と同じ厄介者を溜めてください')
            return
          }
        }
      } else {
        //2枚提出
        if (declare === 'king') {
          if (burdens[0].type !== declare && burdens[1].type !== declare) {
            accumulate({ roomId: this.roomId, burden: burdens })
            return
          } else {
            alert('2枚溜める場合は、宣言と違う厄介者を溜めてください')
          }
        } else {
          if (burden[0].species !== declare && burden[1].species !== declare) {
            accumulate({ roomId: this.roomId, burden: burdens })
            return
          } else {
            alert('2枚溜める場合は、宣言と違う厄介者を溜めてください')
          }
        }
      }
    },

    speciesOfBurden(burden) {
      const ary = burden.map(card => {
        return card.species
      })
      return ary
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
  p {
    line-height: 10px;
  }
}
.buttons {
  display: flex;
}
.debugs {
  display: flex;
}
.subInfo {
  display: flex;
}
.info > p {
  padding: 0 10px;
}
.me {
  background: #333;
}
.isActive {
  color: red;
}
.v-select {
  color: #fffffe;
  width: 200px;
  height: 40px;
  font-size: 14px;
  border: 1px solid #fffffe;
}
.selecters {
  display: flex;
}
select {
  background: #0f0e17;
  color: white;
  border: 1px solid white;
}
</style>
