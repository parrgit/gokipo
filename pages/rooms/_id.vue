<template>
  <div class="body">
    <div class="container">
      <p>{{ roomName }}</p>
      <p>phase: {{ phase }}</p>
      <div class="game-table">
        <button
          v-for="player in players"
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
          <p>isLoser: {{ player.isLoser }}</p>
          <p>handNum: {{ player.handNum }}</p>
          <p>burden</p>
          <p>{{ speciesOfBurden(player.burden) }}</p>
        </button>
      </div>
      <div class="table-container">
        <!-- ========================= CARD ZONE ========================== -->
        <!-- ============= OTHER ZONE ============== -->
        <div style="display:flex;">
          <div v-for="player in otherPlayers" :key="player.id" style="width:300px;">
            <div>
              <div class="others-card-zone">
                <div
                  v-for="i in player.handNum"
                  style="position:absolute;"
                  :style="{
                    left: otherLeft(i) + 'px',
                    top: top(i) + 'px',
                    transform: `rotate(${deg(i)}deg)`,
                    background: 'black',
                  }"
                  :key="i"
                >
                  kipo
                </div>
              </div>
            </div>
            <div>
              <div class="others-card-zone">
                <div
                  v-for="(card, i) in player.burden"
                  style="position:absolute;"
                  :style="{ left: left(i) + 'px' }"
                  :class="[
                    {
                      king: card.type === 'king',
                      yesno: card.type === 'yes' || card.type === 'no',
                    },
                  ]"
                  :key="card.id"
                >
                  <div>{{ card.species }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- ============= MY ZONE ============== -->
        <!-- BURDEN -->
        <div>
          <div class="my-card-zone">
            <div
              v-for="(card, i) in myBurden"
              style="position:absolute;"
              :style="{ left: left(i) + 'px' }"
              :class="[
                {
                  king: card.type === 'king',
                  yesno: card.type === 'yes' || card.type === 'no',
                },
              ]"
              :key="card.id"
            >
              <div>{{ card.species }}</div>
            </div>
          </div>
        </div>
        <!-- GIVE用 -->
        <div>
          <div v-if="phase === 'give'" class="my-card-zone">
            <button
              v-for="(card, i) in hand"
              @click="realId = card.id"
              style="position:absolute;"
              :style="{ left: left(i) + 'px' }"
              :class="[
                {
                  king: card.type === 'king',
                  yesno: card.type === 'yes' || card.type === 'no',
                },
              ]"
              :key="card.id"
            >
              {{ card.species }}
            </button>
          </div>
          <!-- YES/NO用 -->
          <div v-if="phase === 'yesno'">
            <div class="my-card-zone">
              <button
                v-for="(card, i) in hand"
                @click="queue(card.id)"
                style="position:absolute;"
                :style="{ left: left(i) + 'px' }"
                :class="[
                  {
                    king: card.type === 'king',
                    yesno: card.type === 'yes' || card.type === 'no',
                  },
                ]"
                :key="card.id"
              >
                {{ card.species }}
              </button>
            </div>
            <template v-for="(burden, i) in burdens">
              <p :key="burden.id">burden{{ i }}: {{ burden.species }}</p>
            </template>
            <button @click="burdensClear">clear</button>
          </div>
        </div>
      </div>

      <!-- ========================= SELECT ZONE ========================== -->
      <!-- <pre>{{ me }}</pre> -->
      <div class="selecters">
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
      </div>

      <!-- <pre>{{ $data }}</pre> -->

      <!-- ================================ buttons ================================ -->
      <div class="buttons">
        <button @click="join">Join</button>
        <!-- TODO退出関数作る -->
        <!-- <button @click="getOut">get out</button> -->
        <button @click="ready">Ready</button>
        <button @click="give">Give</button>
        <button @click="answer(true)">True!</button>
        <button @click="answer(false)">Lie!</button>
        <button @click="pass">Pass</button>
        <button @click="accumulate">Accumulate</button>
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
    otherPlayers() {
      return this.players.filter(player => player.id !== this.uid)
    },
    // me() {
    //   const me = this.players.find(player => {
    //     return player.id === this.uid
    //   })
    //   return { ...me }.name //スプレッドしないと表示できない例
    // },
    real() {
      return this.hand.find(card => {
        return card.id === this.realId
      })
    },
    burdens() {
      //提出用1,2枚
      const burdens = []
      this.burdenIds.forEach(burdenId => {
        //TODOforEachAsyncが使用できない、pluginの使い方が違う？
        const obj = this.hand.find(card => {
          return card.id === burdenId
        })
        burdens.push(obj)
      })
      return burdens
    },
    submission() {
      return {
        declare: this.declare,
        real: this.real,
        acceptorId: this.acceptorId,
        roomId: this.roomId,
      }
    },
    accumulation() {
      return {
        roomId: this.roomId,
        burdens: this.burdens,
        declare: this.progress.declare,
        phase: this.progress.phase,
      }
    },
    myBurden() {
      if (!this.uid || !this.players) return
      const me = this.players.find(player => {
        return player.id === this.uid
      })
      return { ...me }.burden
    },

    // inHand() {
    //   // 一回スプレッドしてからオブジェクトに入れ込まないとaryがObserverになり、undefinedになる
    //   return [...this.hand]
    // },
  },
  async created() {
    const user = await this.$auth()
    await this.fetchBasics({ roomId: this.roomId, uid: user.uid })
    // await this.fetchBurdens({ roomId: this.roomId, uid: user.uid })
  },
  methods: {
    ...mapActions('basics', ['fetchBasics']),
    left(i) {
      return i * 44
    },
    otherLeft(i) {
      return i * 10
    },
    deg(i) {
      return -40 + 4 * i
    },
    top(i) {
      return Math.pow(this.deg(i) * 0.1, 2)
    },
    queue(cardId) {
      if (this.burdenIds.includes(cardId)) return //同じカードはburdensに入れ込めない
      if (this.burdenIds.length > 1) this.burdenIds.pop() //2枚のときにunshiftする際はpopする
      this.burdenIds.unshift(cardId)
    },
    burdensClear() {
      while (this.burdenIds.length) this.burdenIds.pop() //配列の中身削除
    },
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
        burden: [],
      }
      if (this.phase !== 'waiting') {
        alert('waitingフェーズではありません')
        return
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
    accumulate() {
      const accumulate = this.$fireFunc.httpsCallable('accumulate')
      const burdens = [...this.burdens] //とりあえずスプレッド、必要ない可能性あり
      const declare = this.progress.declare
      let includeYesNo = false //提出カードにyes/noが含まれていないか
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
            accumulate(this.accumulation)
            return
          } else {
            alert('1枚のキングを溜めるか、キング以外で2枚溜めてください')
            return
          }
        } else {
          if (burdens[0].species === declare) {
            accumulate(this.accumulation)
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
            accumulate(this.accumulation)
            return
          } else {
            alert('2枚溜める場合は、宣言と違う厄介者を溜めてください')
          }
        } else {
          if (burdens[0].species !== declare && burdens[1].species !== declare) {
            accumulate(this.accumulation)
            return
          } else {
            alert('2枚溜める場合は、宣言と違う厄介者を溜めてください')
          }
        }
      }
    },
    speciesOfBurden(burden) {
      if (burden) {
        const array = burden.map(card => {
          return card.species
        })
        return array
      }
    },
  },
}
</script>

<style lang="scss" scoped>
@mixin card {
  height: 70px;
  width: 40px;
  border-radius: 0;
  border: 1px solid white;
  font-size: 15px;
  display: grid;
  place-items: center;
  padding: 0;
}
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
select {
  background: #0f0e17;
  color: white;
  border: 1px solid white;
}
.table-container {
  width: 800px;
  margin: 0 auto;
}
.my-card-zone {
  position: relative;
  height: 100px;
  div,
  button {
    @include card;
  }
}
.others-card-zone {
  position: relative;
  height: 100px;
  div {
    @include card;
  }
}
.king {
  background: #ffcc99;
  color: black;
}
.yesno {
  background: #336699;
}
</style>
