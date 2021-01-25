<template>
  <div>
    <div class="header">
      <h1>room</h1>
      <p>sample: {{ funcSample }}</p>
      <button @click="deal">カード配布</button>
      <div>
        <p>{{ uname }}</p>
        <p style="line-height:40px;" @click="login" v-if="!uname">login</p>
      </div>
    </div>
    <div class="container">
      <Player v-for="(value, name) in player" :key="name" :value="value" :name="name" />
      <Penalty :cards="penaltyCards" />
    </div>
  </div>
</template>

<script>
import { mapState, mapActions, mapGetters } from 'vuex'

export default {
  data() {
    return {
      name: '',
      funcSample: '',
    }
  },
  computed: {
    ...mapState(['player', 'penaltyCards']),
    ...mapGetters('user', ['uname']),
  },
  methods: {
    ...mapActions('user', ['login', 'setLoginUser', 'deleteLoginUser']),
    async deal() {
      const addMessage = this.$fireFunc.httpsCallable('addMessage')
      await addMessage('baiyoeeen').then((result) => {
        this.funcSample = result.data.text
      })
    },
  },
  async created() {
    const user = await this.$auth()
    if (!user) {
      //未ログイン
      this.deleteLoginUser()
    } else {
      //ログイン状態
      //registerで登録した名前を取得
      const { uid, displayName } = user
      this.setLoginUser({ uid, displayName })
    }
  },
}
</script>
