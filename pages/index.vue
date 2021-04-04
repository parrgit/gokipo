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
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
export default {
  middleware: ['checkAuth'],
  data() {
    return {
      isActiveModal: false,
      unsubscribe: null, //リスナーのデタッチ用
    }
  },
  computed: {
    ...mapGetters('rooms', ['rooms']),
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
    moveToRoomPage(roomId) {
      this.$router.push(`/rooms/${roomId}`)
    },
    openModal() {
      this.isActiveModal = true
    },
    closeModal() {
      this.isActiveModal = false
    },
  },
}
</script>
