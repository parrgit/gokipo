<template>
  <div class="bg">
    <div class="container">
      <div>
        <div class="rooms-box">
          <h2>rooms</h2>
          <div class="rooms-display">
            <p v-for="room in rooms" :key="room.id" @click="moveToRoomPage(room.id)">
              {{ room.name }}
            </p>
          </div>
          <div><button @click="openModal">+</button></div>
          <ModalBase v-if="isActiveModal" @closeModal="closeModal">
            <CreateRoomModal @closeModal="closeModal" />
          </ModalBase>
        </div>
      </div>
    </div>
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

<style lang="scss" scoped>
$basic: #0f0e17;
$light: #fffffe;

.bg {
  background-image: url('https://firebasestorage.googleapis.com/v0/b/gokipo-d9c62.appspot.com/o/purine.png?alt=media&token=6451267c-4abd-4fa5-830a-39c3ad66eb9a');
  background-size: cover;
  background-attachment: fixed;
  min-height: 100vh;
}
h1 {
  text-align: center;
  margin: 0;
  padding: 0 0 0 10px;
  text-shadow: 2px 0 0 black, 0 2px 0 black, -2px 0 0 black, 0 -2px 0 black;
}
.container {
  max-width: 1000px;
  margin: auto;
  padding-top: 100px;
}
.rooms-box {
  h2 {
    text-align: center;
  }
  height: 550px;
  width: 400px;
  background: rgba($basic, 0.8);
  border-radius: 10px;
  margin: 20px auto;
  padding: 20px;
  button {
    margin-top: 30px;
    border: 1px solid hsl(20, 50%, 50%);
  }
  .title {
    color: hsl(20, 70%, 60%);
  }
  hr {
    margin-top: 30px;
    border: 1px solid $light;
  }
  input {
    display: block;
    margin: auto;
    width: 240px;
    margin-top: 30px;
    padding: 10px;
    border: none;
    border-radius: 5px;
    font-size: 14px;
    color: $basic;
    outline: none;
  }
  .rooms-display {
    height: 200px;
    overflow: scroll;
  }
}
</style>
