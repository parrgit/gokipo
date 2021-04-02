<template>
  <header>
    <div v-if="isRoomPage" class="left-block">
      <nuxt-link to="/">
        <p>◁</p>
      </nuxt-link>
      <p>room: {{ roomName }}</p>
    </div>
    <h1>Purine</h1>
    <div class="right-block">
      <p v-if="uname">{{ uname }}</p>
      <!-- ログインしていない時に気づかせる -->
      <button style="line-height:50px;" @click="login" v-if="!uname">login</button>
      <button style="line-height:20px;" @click="logout" v-if="uname">logout</button>
      <button v-show="isRoomPage" @click="showModal = !showModal">description</button>
    </div>
    <vue-final-modal v-model="showModal">
      <Description />
    </vue-final-modal>
  </header>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'

export default {
  data() {
    return {
      showModal: false,
    }
  },
  computed: {
    ...mapGetters('basics', ['roomName']),
    ...mapGetters('user', ['uname']),
    isRoomPage() {
      return this.$route.path.match(/\/rooms\/[A-Za-z0-9]*/)
    },
  },
  methods: {
    ...mapActions('user', ['login', 'logout', 'setLoginUser', 'deleteLoginUser']),
  },
  async created() {
    const user = await this.$auth()
    if (!user) {
      this.deleteLoginUser()
    } else {
      //registerで登録した名前を取得
      const { uid, displayName } = user
      this.setLoginUser({ uid, displayName })
    }
  },
}
</script>

<style lang="scss" scoped>
h1 {
  text-align: center;
  display: block;
  margin: auto;
}
header {
  display: flex;
  justify-content: space-between;
}
.right-block {
  display: flex;
  button {
    padding: 5px;
    margin-left: 30px;
  }
}
.left-block {
  display: flex;
  > p {
    margin: auto;
    margin-left: 30px;
  }
}
</style>
