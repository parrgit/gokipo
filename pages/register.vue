<template>
  <div>
    <h1>Register</h1>
    <div>
      <!-- バリデーション付きform -->
      <validation-observer
        ref="observer"
        v-slot="{ invalid }"
        tag="form"
        @submit.prevent="onSubmit"
      >
        <validation-provider v-slot="{ errors }" rules="required" name="name">
          <input type="text" placeholder="input your name" class="input" v-model="uname" />
          <p v-show="errors.length" class="help is-danger">
            {{ errors[0] }}
          </p>
        </validation-provider>
        <button type="submit" :disabled="invalid">send</button>
      </validation-observer>
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
      const isValid = await this.$refs.observer.validate()
      if (!isValid) {
        requestAnimationFrame(() => {
          this.$refs.observer.reset()
        })
        return
      }
      const user = await this.$auth()
      // 未ログインの場合
      if (!user) {
        this.$router.push('/login')
        return
      }
      try {
        await this.$firestore.doc(`users/${user.uid}`).set({
          name: this.uname,
        })
        this.$router.push('/'), location.reload()
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
p {
  text-align: center;
}
</style>
