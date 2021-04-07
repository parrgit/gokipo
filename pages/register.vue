<template>
  <div class="bg">
    <h1>Register</h1>
    <div class="signin-box">
      <h2 class="title">Handle name</h2>

      <ValidationObserver ref="observer" v-slot="{ invalid }" tag="form" @submit.prevent="onSubmit">
        <!-- バリデーション付きform -->
        <validation-provider v-slot="{ errors }" rules="required" name="handle name">
          <input type="text" placeholder="handle name" class="input" v-model="uname" />
          <p v-show="errors.length" class="help is-danger">
            {{ errors[0] }}
          </p>
        </validation-provider>
        <button type="submit" :disabled="invalid">Submit</button>
      </ValidationObserver>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      uname: '',
    }
  },
  middleware: ['checkRegister'],
  layout: 'login',
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
        this.$router.push('/'), location.reload() //Header更新用(Logout状態→Login状態にする)
      } catch (e) {
        alert('登録に失敗しました')
      }
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

.signin-box {
  h2 {
    text-align: center;
  }
  height: 300px;
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
}

input {
  display: block;
  margin: 5px auto;
}
p {
  text-align: center;
}
</style>
