<template>
  <div>
    <div>
      <h1>rooms</h1>
      <div v-for="room in rooms" :key="room.id" @click="moveToRoomPage(room.id)">
        <p>{{ room.name }}</p>
      </div>
      <div><button @click="openModal">+</button></div>
    </div>
    <ModalBase v-if="isActiveModal" @closeModal="closeModal">
      <CreateRoomModal @closeModal="closeModal" />
    </ModalBase>
    <hr />
    <h2>for debug</h2>
    <div class="container">
      <form @submit.prevent="addCard">
        <input type="text" placeholder="type" v-model="type" />
        <input type="text" placeholder="species" v-model="species" />
        <button type="submit">ADD card</button>
      </form>
      <button @click="deleteCards">speciesまたはtype==''のカードを削除</button>
      <button @click="displayCards">referenceを取得して表示</button>
      <button @click="ObjArg({ type: 'common', species: 'crh' })">引数にobjectいける？</button>
      <button @click="displayUser">user情報確認</button>
      <pre>{{ $data }}</pre>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
export default {
  middleware: ["checkAuth"],
  data() {
    return {
      isActiveModal: false,
      unsubscribe: null, //リスナーのデタッチ用
      //↓デバック用
      name: '',
      funcSample: null,
      type: '',
      species: '',
    }
  },
  computed: {
    ...mapGetters('rooms', ['rooms']),
    // ...mapGetters('user', ['user']),
  },
  async asyncData({ store }) {
    const unsubscribe = await store.dispatch('rooms/subscribe')
    return {
      unsubscribe,
    }
  },
  destoroyed() {
    this.$store.dispatch('rooms/clear') //ルーム除去
    if (this.unsubscribe) this.unsubscribe() //リスナーのデタッチ
  },
  methods: {
    ...mapActions('user', ['login', 'setLoginUser', 'deleteLoginUser']),
    async displayUser() {
      const user = await this.$auth()
      console.log(user)
    },
    moveToRoomPage(roomId) {
      this.$router.push(`/rooms/${roomId}`)
    },
    openModal() {
      this.isActiveModal = true
    },
    closeModal() {
      this.isActiveModal = false
    },
    //↓デバッグ用
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
    // 引数にオブジェクトいけるんやっけ→いけた
    ObjArg(obj) {
      console.log(obj.type)
      console.log(obj.species)
    },

    // firestoreにカードを入れ込む用
    addCard() {
      this.$firestore.collection('/reference').add({
        type: this.type,
        species: this.species,
      })
      this.type = ''
      this.species = ''
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
        .collection('/reference')
        .orderBy('species')
        .get()
        .then(snapshot => {
          snapshot.forEach(doc => {
            console.log(doc.id, ' => ', doc.data().species, doc.data().type)
          })
        })
        .catch(error => {
          console.log('error getting documents: ', error)
        })
    },
  },
}
</script>
