<template>
  <header>
    <template v-if="isRoomPage">
      <nuxt-link to="/">
        <p>＜</p>
      </nuxt-link>
    </template>
    <h1>SEVEN</h1>
    <div class="right-block">
      <p v-if="uname">{{ uname }}</p>
      <!-- ログインしていない時に気づかせる -->
      <button style="line-height:50px;" @click="login" v-if="!uname">login</button>
      <button style="line-height:20px;" @click="logout" v-if="uname">logout</button>
    </div>
  </header>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'

export default {
  data() {
    return {}
  },
  computed: {
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
</style>
