<template>
  <div class="body">
    <div class="container">
      <p style="margin:0;">{{ roomName }}</p>
      <!-- ========================= TABLE ========================== -->
      <!-- ========================= TABLE ========================== -->
      <div class="table-container">
        <div class="progress">
          <p>phase: {{ phase }}</p>
          <p>turn: {{ progress.turn }}</p>
          <p v-show="phase === 'yesno'">accumulator: {{ accumulatorName }}</p>
        </div>
        <hr />
        <!-- ========================= CARD ZONE ========================== -->
        <!-- ============= OTHER ZONE ============== -->
        <!-- TODOクラスにする tailwindow, windyの使用もあり -->
        <div style="display:flex;">
          <div
            v-for="player in otherPlayers"
            :key="player.id"
            style="width:280px;margin:0 auto;"
            class="other"
            @click="selectAcceptor(player.id)"
          >
            <div class="name-zone">
              <p
                :class="{
                  acceptor: acceptorId === { ...player }.id,
                  canbeNominated: !player.canbeNominated,
                  ready: player.isReady && phase === 'waiting',
                }"
                style="user-select:none;"
              >
                {{ player.name }}
              </p>
              <!-- セリフ-->
              <p
                v-show="
                  (phase === 'accept' && player.isGiver) || (phase === 'yesno' && player.isGiver)
                "
              >
                {{ progress.declare }}!
              </p>
              <p v-show="phase === 'accept' && player.isAcceptor">Hmm..</p>
              <p v-show="(phase === 'give' || phase === 'pass') && player.isGiver">Hmm..</p>
              <p v-show="phase === 'yesno' && player.isYesNoer">Ugh..</p>
            </div>

            <div>
              <!-- 手札 -->
              <div class="others-card-zone">
                <!-- TODOkeyをidにする -->
                <div
                  v-for="i in player.handNum"
                  :key="i"
                  :style="{
                    position: 'absolute',
                    left: otherLeft(i) + 'px',
                    top: top(i) + 'px',
                    transform: `rotate(${deg(i)}deg)`,
                  }"
                  class="others-hand"
                ></div>
              </div>
            </div>
            <!-- 厄介ゾーン -->
            <div>
              <div class="others-card-zone">
                <div
                  v-for="(card, i) in player.burden"
                  style="position:absolute;"
                  :style="{ left: left(i) + 'px' }"
                  :class="{
                    common: card.type === 'common',
                    king: card.type === 'king',
                    yesno: card.type === 'yes' || card.type === 'no',
                  }"
                  :key="card.id"
                >
                  <div>{{ card.species }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- ============= PENALTY & REAL ZONE ============== -->
        <div class="penalty-zone">
          <!-- penalty -->
          <div
            v-for="i in penaltyTop.bodyNum"
            style="position:absolute;"
            :style="{
              top: penaTop(i) + 'px',
            }"
            :key="i"
          ></div>
          <div style="position:absolute;" :style="{ top: -(penaltyTop.bodyNum + 1) * 3 + 'px' }">
            {{ penaltyTop.species }}
          </div>
          <!-------------- REAL -------------->
          <div
            style="position:absolute; left:-80px;bottom:40px;border:3px solid;"
            class="animate__animated animate__backInLeft"
            v-if="phase === 'accept' || phase === 'pass'"
          >
            ?
          </div>
        </div>
        <!-- ============= MY ZONE ============== -->
        <div class="name-zone">
          <p
            :class="{
              active: (me.isGiver || me.isAcceptor || me.isYesNoer) && phase !== 'waiting',
              canbeNominated: !me.canbeNominated,
              ready: me.isReady && phase === 'waiting',
            }"
            style="user-select:none;"
          >
            {{ me.name }}
          </p>
          <!-- セリフ -->
          <p v-show="(phase === 'accept' && me.isGiver) || (phase === 'yesno' && me.isGiver)">
            {{ progress.declare }}!
          </p>
          <p v-show="phase === 'accept' && me.isAcceptor">Hmm..</p>
          <p v-show="(phase === 'give' || phase === 'pass') && me.isGiver">Hmm..</p>
          <p v-show="phase === 'yesno' && me.isYesNoer">Ugh..</p>
        </div>
        <div>
          <!-- 厄介者ゾーン -->
          <div>
            <div class="my-card-zone">
              <div
                v-for="(card, i) in myBurden"
                style="position:absolute;"
                :style="{ left: left(i) + 'px' }"
                :class="[
                  'animate__animated animate__bounceIn',
                  {
                    common: card.type === 'common',
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
          <!-- ========== HAND =========== -->
          <!-- GIVE,ACCEPT,(WAITING)用 -->
          <div>
            <div v-if="phase !== 'yesno'" class="my-card-zone">
              <button
                v-for="(card, i) in hand"
                :key="card.id"
                @click="realId = card.id"
                style="position:absolute;"
                :style="{ left: left(i) + 'px' }"
                :class="[
                  'animate__animated animate__bounceIn',
                  {
                    selectedInHand: card.id === realId,
                    king: card.type === 'king',
                    yesno: card.type === 'yes' || card.type === 'no',
                  },
                ]"
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
                  :class="{
                    king: card.type === 'king',
                    yesno: card.type === 'yes' || card.type === 'no',
                    selectedInHand:
                      card.id === { ...burdens[0] }.id || card.id === { ...burdens[1] }.id,
                  }"
                  :key="card.id"
                >
                  {{ card.species }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================================ BUTTONS ================================ -->
      <div class="buttons">
        <!-- TODO退出関数作る -->
        <!-- <button @click="getOut">get out</button> -->
        <button v-show="phase === 'waiting'" @click="join">Join</button>
        <button v-show="phase === 'waiting'" @click="ready">Ready</button>
        <select
          v-show="(phase === 'give' && me.isGiver) || (phase === 'pass' && me.isGiver)"
          v-model="declare"
        >
          <option value="" disabled selected>select a declare</option>
          <option
            v-for="declareElement in declareElements"
            :key="declareElement"
            :value="declareElement"
          >
            <p>{{ declareElement }}</p>
          </option>
        </select>
        <button v-show="phase === 'give' && me.isGiver" @click="give">
          Give
        </button>
        <button v-show="phase === 'pass' && me.isGiver" @click="giveOfPass">
          Give
        </button>
        <button v-show="phase === 'accept' && me.isAcceptor" @click="answer(true)">True!</button>
        <button v-show="phase === 'accept' && me.isAcceptor" @click="answer(false)">Lie!</button>
        <button v-show="phase === 'accept' && me.isAcceptor && canPass" @click="pass">Pass</button>
        <button v-show="phase === 'yesno' && me.isYesNoer" @click="accumulate">Accumulate</button>
        <button v-show="phase === 'yesno' && me.isYesNoer" @click="burdensClear">clear</button>
      </div>
    </div>
    <!-- ==================== debug tools ==================== -->
    <hr />
    <h2>for debug</h2>

    <!-- <pre>{{ $data }}</pre> -->

    <div class="debugs">
      <button @click="stack">referenceを配列にして返却</button>
      <button @click="displayCards">referenceを取得して表示</button>
      <button @click="waiting">phaseをwaitingに</button>
      <button @click="console">マイカード全部削除用(2021/3/2)</button>
      <button @click="initializeRoom">ルーム初期化用(2021/3/4)</button>
      <button @click="test">test</button>
    </div>
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
      </button>
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
      animateActive: false,
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
    me() {
      const me = this.players.find(player => {
        return player.id === this.uid
      })
      return { ...me } //スプレッドしないと表示できない例
    },
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
      return burdens || null
    },
    submission() {
      return {
        declare: this.declare,
        real: this.real,
        acceptorId: this.acceptorId,
        roomId: this.roomId,
      }
    },
    submissionOfPass() {
      return {
        declare: this.declare,
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
    giverName() {
      const giver = this.players.find(player => player.isGiver)
      return { ...giver }.name
    },
    acceptorName() {
      const acceptor = this.players.find(player => player.isAcceptor)
      return { ...acceptor }.name
    },
    accumulatorName() {
      const accumulator = this.players.find(player => player.isYesNoer)
      return { ...accumulator }.name
    },
    canPass() {
      let canPass = false
      //TODOforEachじゃなくてもかけるはず
      this.players.forEach(player => {
        canPass = canPass || player.canbeNominated
      })
      return canPass
    },
    loserName() {},

    // inHand() {
    //   // 一回スプレッドしてからオブジェクトに入れ込まないとaryがObserverになり、undefinedになる
    //   return [...this.hand]
    // },
  },
  async created() {
    const user = await this.$auth()
    await this.fetchBasics({ roomId: this.roomId, uid: user.uid })
  },
  methods: {
    test() {
      this.animateActive = !this.animateActive
    },
    ...mapActions('basics', ['fetchBasics']),
    left(i) {
      return i * 44
    },
    penaTop(i) {
      return -i * 3
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
      if (this.phase !== 'accept' || !this.me.isAcceptor) {
        alert('acceptフェーズではない、又はあなたはacceptorではありません')
      }
      const pass = this.$fireFunc.httpsCallable('pass')
      pass(this.roomId)
    },
    giveOfPass() {
      const giveOfPass = this.$fireFunc.httpsCallable('giveOfPass')
      if (!this.declare || !this.acceptorId) {
        alert('宣言、受け手を選択してください')
        return
      }
      giveOfPass(this.submissionOfPass)
    },
    accumulate() {
      const accumulate = this.$fireFunc.httpsCallable('accumulate')
      const burdens = [...this.burdens] //とりあえずスプレッド、必要ない可能性あり
      const declare = this.progress.declare
      let includeYesNo = false //提出カードにyes/noが含まれていないか
      if (this.progress.phase !== 'yesno') {
        alert('yesnoフェーズではありません')
        return
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
  },
}
</script>

<style lang="scss" scoped>
$basic: #0f0e17;
@mixin card {
  height: 70px;
  width: 40px;
  border-radius: 3px;
  border: 1px solid white;
  font-size: 15px;
  display: grid;
  place-items: center;
  padding: 0;
  user-select: none;
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
  p {
    line-height: 10px;
    font-size: 15px;
  }
}
.buttons {
  margin: 0 auto;
  width: 300px;
  display: flex;
}
.debugs {
  display: flex;
}
.me {
  background: #333;
}
.isActive {
  color: red;
}
select {
  display: block;
  margin: auto 0 auto auto;
  background: $basic;
  color: white;
  border: 1px solid white;
  padding: 10px 10px;
  border-radius: 3px;
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
  .others-hand {
    background: black;
  }
  div {
    @include card;
  }
}
.penalty-zone {
  position: relative;
  height: 50px;
  width: 40px;
  margin: 0 auto;
  div {
    @include card;
    background: black;
  }
}
.selectedInHand {
  border: 2px solid lighten($basic, 30%) !important;
}
.king {
  color: black;
  background: #cc9900;
}
.yesno {
  background: #336699;
}
.common {
  background: $basic;
}
.progress {
  width: 600px;
  height: 30px;
  margin: 0;
  padding: 0;
  display: flex;
  justify-content: space-between;
}
.other {
  &:hover {
    background: lighten($basic, 15%);
  }
}
.acceptor {
  background: lighten($basic, 30%);
}
.canbeNominated {
  text-decoration: line-through;
}
.loser {
  background: red;
}
.active {
  background: lighten($basic, 20%);
}
.ready {
  background: lightcoral;
}
.name-zone {
  display: flex;
  p:nth-child(n + 2) {
    padding-left: 10px;
    color: red;
  }
}
</style>
