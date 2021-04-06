<template>
  <div class="body">
    <div class="container">
      <!-- ============== INFORMATION ============== -->
      <div class="table-container">
        <div class="progress">
          <p>phase: {{ phase }}</p>
          <p>turn: {{ progress.turn }}</p>
          <p v-show="phase === 'yesno'">accumulator: {{ accumulatorName }}</p>
        </div>
        <hr />
        <!-- ============= OTHER ZONE ============== -->
        <!--tailwindcss, windicssの使用もあり -->
        <div style="display:flex;">
          <div
            v-for="player in otherPlayers"
            :key="player.id"
            style="width:280px;margin:0 auto;"
            class="other"
            @click="selectAcceptor(player.id)"
          >
            <div class="name-zone">
              <!-- コンポーネント？ -->
              <p
                :class="{
                  acceptor: acceptorId === { ...player }.id,
                  canbeNominated: !player.canbeNominated,
                  ready: player.isReady && phase === 'waiting',
                  loser: player.isLoser,
                }"
                style="user-select:none;"
              >
                {{ player.name }}
              </p>
              <!-- セリフ -->
              <others-quotes :player="player" :phase="phase" :progress="progress" />
            </div>

            <div>
              <!-- 他プレイヤーの手札 -->
              <div class="others-card-zone-hand">
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
            <!-- 他プレイヤーの厄介ゾーン -->
            <div>
              <div class="others-card-zone-burden">
                <div v-for="(value, key) in player.burden" :key="key" style="position:relative;">
                  <burden-card v-for="(card, i) in value" :key="card.id" :card="card" :i="i" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- =============================== PENALTY & REAL ZONE ============================== -->
        <!-- TODO<rooms-penalty-zone/> -->
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
          <penalty-top-card v-show="Object.keys(penaltyTop).length" :penaltyTop="penaltyTop" />

          <!-------------- REAL -------------->
          <!-- 通常は「？」 -->
          <invisible-real :phase="phase" :me="me" />
          <!-- 可視化状態 -->
          <secret-real :phase="phase" :me="me" :secretReal="secretReal" />
        </div>
        <!-- ================================== MY ZONE =================================== -->
        <div class="name-zone">
          <my-name :me="me" :phase="phase" />
          <!-- セリフ達 -->
          <my-quotes :me="me" :phase="phase" :progress="progress" />
        </div>
        <div>
          <!-- 自分の厄介者ゾーン -->
          <div>
            <div class="my-card-zone-burden">
              <div v-for="(value, key) in me.burden" :key="key" :style="{ position: 'relative' }">
                <burden-card v-for="(card, i) in value" :key="card.id" :card="card" :i="i" />
              </div>
            </div>
          </div>
          <!-- ------------- MY HAND ------------- -->
          <!-- GIVE,ACCEPT,(WAITING)フェーズ用 -->
          <div>
            <div v-if="phase !== 'yesno'" class="my-card-zone-hand">
              <my-hand-card
                v-for="card in hand"
                :key="card.id"
                :card="card"
                :realId="realId"
                @select-card="realId = card.id"
              />
            </div>
            <!-- YES/NOフェーズ用 -->
            <div v-if="phase === 'yesno'" class="my-card-zone-hand">
              <my-hand-card-yes-no
                v-for="card in hand"
                :key="card.id"
                :card="card"
                :accumulations="accumulations"
                @queue="queue($event)"
              />
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
          v-show="((phase === 'give' && me.isGiver) || (phase === 'pass' && me.isGiver)) && isHand"
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
        <button v-show="phase === 'give' && me.isGiver && isHand" @click="give">
          Give
        </button>
        <button v-show="phase === 'give' && !isHand && Object.keys(me).length" @click="surrender">
          Surrender
        </button>
        <button v-show="phase === 'pass' && me.isGiver" @click="giveOfPass">
          Give
        </button>
        <button v-show="phase === 'accept' && me.isAcceptor" @click="answer(true)">True!</button>
        <button v-show="phase === 'accept' && me.isAcceptor" @click="answer(false)">Lie!</button>
        <button v-show="phase === 'accept' && me.isAcceptor && canPass" @click="pass">Pass</button>
        <button v-show="phase === 'yesno' && me.isYesNoer" @click="accumulate">Accumulate</button>
        <button v-show="phase === 'yesno' && me.isYesNoer" @click="accumulationsClear">
          clear
        </button>
      </div>
    </div>
    <!-- ==================== debug tools ==================== -->
    <hr />
    <h2>for debug</h2>

    <div class="debugs">
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
  middleware: ['checkAuth'],
  data() {
    return {
      accumulationIds: [],
      realId: '',
      declare: '',
      acceptorId: '',
      declareElements: ['ber', 'gzd', 'lvr', 'mon', 'nbs', 'sal', 'srp', 'king'],
      speciesElements: ['ber', 'gzd', 'lvr', 'mon', 'nbs', 'sal', 'srp'],
      animateActive: false,
      showModal: false,
    }
  },

  async created() {
    const user = await this.$auth()
    await this.fetchBasics({ roomId: this.roomId, uid: user.uid })
  },

  computed: {
    ...mapGetters('user', ['uname', 'uid']),
    ...mapGetters('basics', ['phase', 'players', 'hand', 'progress', 'penaltyTop', 'secretReal']),
    isHand() {
      return this.hand.length !== 0 //手札あり
    },
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
    accumulations() {
      //提出用1,2枚
      //TODO filter?で書き換える
      const accumulations = []
      this.accumulationIds.forEach(accumulationId => {
        const obj = this.hand.find(card => {
          return card.id === accumulationId
        })
        accumulations.push(obj)
      })
      return accumulations || null
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
      //TODOforEachじゃなくてもかけるかな
      this.players.forEach(player => {
        canPass = canPass || player.canbeNominated
      })
      return canPass
    },
  },

  methods: {
    ...mapActions('basics', ['fetchBasics']),
    test() {},
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
      return -40 + 2.4 * i
    },
    top(i) {
      return Math.pow(this.deg(i) * 0.1, 2)
    },
    burdenBottom(i) {
      return i * 6
    },
    queue(cardId) {
      if (this.accumulationIds.includes(cardId)) return //同じカードはaccumurationsに入れ込めない
      if (this.accumulationIds.length > 1) this.accumulationIds.pop() //2枚のときにunshiftする際はpopする
      this.accumulationIds.unshift(cardId)
    },
    accumulationsClear() {
      while (this.accumulationIds.length) this.accumulationIds.pop() //配列の中身削除
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
      const gameStart = this.$fireFunc.httpsCallable('gameStart')
      const playerRef = this.$firestore.doc(`/rooms/${this.roomId}/players/${this.uid}`)
      // isReadyをinvertしてからgameStart関数を呼ぶ
      try {
        const playerSnap = await playerRef.get()
        await playerRef.update({ isReady: !playerSnap.data().isReady })
        await gameStart(this.roomId)
      } catch (e) {
        alert(e.message)
      }
    },
    async surrender() {
      const surrender = this.$fireFunc.httpsCallable('surrender')
      await surrender(this.roomId)
    },
    // プレイヤー選択
    selectAcceptor(playerId) {
      this.acceptorId = playerId
    },
    give() {
      // 【バリデーション】細かいのはFunctionsでするため、事物/宣言/相手プレイヤーの選択を確認
      const acceptor = this.players.find(player => player.id === this.acceptorId)
      const isContinuable = this.real && this.declare && this.acceptorId && acceptor.canbeNominated
      if (!isContinuable) {
        alert('提出カード・宣言・受け手プレイヤーを確認してください')
        return
      }
      const give = this.$fireFunc.httpsCallable('give')
      give(this.submission)
    },
    async giveOfPass() {
      // 【バリデーション】細かいのはFunctionsでするため、事物/宣言/相手プレイヤーの選択を確認
      const acceptor = this.players.find(player => player.id === this.acceptorId)
      const isContinuable = this.declare && this.acceptorId && acceptor.canbeNominated
      if (!isContinuable) {
        alert('宣言、受け手を選択してください')
        return
      }
      const giveOfPass = this.$fireFunc.httpsCallable('giveOfPass')
      await giveOfPass(this.submissionOfPass)
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

    async accumulate() {
      const accumulate = this.$fireFunc.httpsCallable('accumulate')
      const declare = this.progress.declare

      //accumulationIdsからaccumulations(溜めるカード1~2枚)を作成
      const accumulations = []
      this.accumulationIds.forEach(accumulationId => {
        const obj = this.hand.find(card => {
          return card.id === accumulationId
        })
        if (obj) accumulations.push(obj)
      })

      // accumulateで必要な情報セット
      const submission = {
        roomId: this.roomId,
        accumulations: accumulations,
        declare: this.progress.declare,
        phase: this.phase,
      }

      if (!accumulations.length) {
        alert('溜めるカードを選択してください')
        return
      }

      //提出カードにyes/noが含まれていないか
      let includeYesNo = false
      accumulations.forEach(accumulation => {
        includeYesNo = includeYesNo || accumulation.type === 'yes' || accumulation.type === 'no'
      })

      if (includeYesNo) {
        alert('yes/noは選択できません')
        return
      }

      //1枚提出
      if (accumulations.length < 2) {
        if (declare === 'king') {
          if (accumulations[0].type === 'king') {
            try {
              await accumulate(submission)
            } catch (e) {
              alert(e.message)
            }
            return
          } else {
            alert('1枚のキングを溜めるか、キング以外で2枚溜めてください')
            return
          }
        } else {
          if (accumulations[0].species === declare) {
            // 1枚溜めでは大体ここに誘導される
            try {
              await accumulate(submission)
            } catch (e) {
              alert(e.message)
            }
            return
          } else {
            alert('宣言された物と同じ厄介者を溜めてください')
            return
          }
        }
      } else {
        //2枚提出
        if (declare === 'king') {
          if (accumulations[0].type !== declare && accumulations[1].type !== declare) {
            try {
              await accumulate(submission)
            } catch (e) {
              alert(e.message)
            }
            return
          } else {
            alert('2枚溜める場合は、宣言と違う厄介者を溜めてください')
          }
        } else {
          if (accumulations[0].species !== declare && accumulations[1].species !== declare) {
            try {
              await accumulate(submission)
            } catch (e) {
              alert(e.message)
            }
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
  border: 1px solid lighten($basic, 75%);
  font-size: 15px;
  display: grid;
  place-items: center;
  padding: 0;
  margin: 0 5px 0 0;
}
.body {
  background-image: url('https://firebasestorage.googleapis.com/v0/b/gokipo-d9c62.appspot.com/o/room-background%2F074DFCE1-710B-4C74-8277-8F39B79A3C20-451-000000166E74D10B.JPG?alt=media&token=218772db-4a28-40cb-b052-d0d564fa1d35');
  background-size: cover;
  background-attachment: fixed;
  min-height: 100vh;
  padding-top: 90px;
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
  width: 500px;
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
  margin: auto;
  display: block;
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
.name-zone {
  display: flex;
  margin-bottom: 30px;
  p:nth-child(n + 2) {
    padding-left: 10px;
    color: red;
  }
}
.my-card-zone-hand {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  div,
  button {
    @include card;
    margin-top: 7px;
  }
}
.my-card-zone-burden {
  display: flex;
  height: 80px;
  div {
    @include card;
    border: none; //ここは各種speciesのゾーン確保箇所なのでnone
    div {
      @include card;
      border: 1px solid white;
    }
  }
}
.others-card-zone-hand {
  position: relative;
  height: 100px;
  .others-hand {
    background: black;
  }
  div {
    @include card;
  }
}
.others-card-zone-burden {
  display: flex;
  height: 80px;
  min-width: 320px;
  div {
    @include card;
    border: none;
    div {
      @include card;
    }
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
  border: 2px solid hsl(90, 100%, 60%) !important;
}
.king {
  background: hsl(60, 90%, 28%) !important;
}
.yesno {
  background: hsl(200, 90%, 24%) !important;
}
.common {
  background: lighten($basic, 28%) !important;
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
.dashed {
  border: 1px dashed white !important;
  color: white;
}
::v-deep img {
  height: 80%;
  width: 90%;
}
</style>
