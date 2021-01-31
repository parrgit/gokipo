<template>
  <div>
    <div class="header">
      <h1>room</h1>
      <p>sample: {{ funcSample }}</p>
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
        <button type="submit" disabled>ADD disabled</button>
      </form>
      <button @click="stack">referenceを配列にして返却</button>
      <button @click="deleteCards">speciesまたはtype==''のカードを削除</button>
      <button @click="displayCards">referenceを取得して表示</button>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions, mapGetters } from 'vuex'

export default {
  data() {
    return {
      name: '',
      funcSample: null,
      type: '',
      species: '',
      num: 0,
    }
  },
  computed: {
    ...mapGetters('user', ['uname']),
  },
  methods: {
    ...mapActions('user', ['login', 'setLoginUser', 'deleteLoginUser']),

    // クライアントからfunctions上の関数を呼び出す(スタートガイド)
    // async addMessage() {
    //   const addMessage = this.$fireFunc.httpsCallable('addMessage')
    //   await addMessage('baiyoeeen').then(result => {
    //     this.funcSample = result.data.text
    //   })
    // },

    // functions上でDBの内容をgetする
    // async test() {
    //   const getFirestore = this.$fireFunc.httpsCallable('getFirestore')
    //   await getFirestore()
    // },

    // サーバーでfirestoreからget→stack[]に入れ込む→クライアントに返却
    async stack() {
      const initStack = this.$fireFunc.httpsCallable('initStack')
      await initStack().then(result => {
        console.log(result.data)
      })
    },

    // firestoreにカードを入れ込む用
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

    // 不要なカード削除用
    deleteCards() {
      this.$firestore
        .collection('/room/jQgG7tfijgG4JZ3mLmlQ/field/euI0wuMll7mliznQimQB/reference')
        .where('species', '==', '')
        .get()
        .then(snapshot => {
          snapshot.forEach(doc => {
            doc.ref.delete()
          })
        })
    },

    // consoleでrefferenceをみる用
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
