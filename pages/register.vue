<template>
  <div>
    <h1>Register</h1>
    <div>
      <form @submit.prevent="onSubmit">
        <input type="text" placeholder="input your name" v-model="uname" />
        <button type="submit">send</button>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  middleware: ['checkRegister'],
  data() {
    return {
      uname: '',
    }
  },
  methods: {
    async onSubmit() {
      const user = await this.$auth()

      // 未ログインの場合
      // /loginはまだつくってない
      if (!user) this.$router.push('/')

      try {
        await this.$firestore
          .collection('users')
          .doc(user.uid)
          .set({
            name: this.uname,
          })
        this.$router.push('/')
      } catch (e) {
        alert('登録に失敗しました')
      }
    },
  },
}
</script>

<style lang="scss" scoped>
input {
  display: block;
  margin: 5px auto;
}
</style>
