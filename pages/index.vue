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
      <form @submit.prevent="addCard">
        <input type="text" placeholder="type" v-model="type" />
        <input type="text" placeholder="species" v-model="species" />
        <input type="number" placeholder="number" v-model.number="num" />
        <button type="submit">ADD</button>
      </form>
      <button @click="displayCards">display cards</button>
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
      type: '',
      species: '',
      num: 0,
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
      await addMessage('baiyoeeen').then(result => {
        this.funcSample = result.data.text
      })
    },
    addCard() {
      this.$firestore
        .collection('/room/jQgG7tfijgG4JZ3mLmlQ/field/euI0wuMll7mliznQimQB/reference')
        .add({
          type: this.type,
          species: this.species,
          num: this.num,
        })
        .then(this.num++)
    },
    displayCards() {
      this.$firestore
        .collection('/room/jQgG7tfijgG4JZ3mLmlQ/field/euI0wuMll7mliznQimQB/reference')
        .orderBy('species')
        .orderBy('num')
        .get()
        .then(snapshot => {
          snapshot.forEach(doc => {
            console.log(doc.id, ' => ', doc.data().species, doc.data().num, doc.data().type)
          })
        })
        .catch(error => {
          console.log('error getting documents: ', error)
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
