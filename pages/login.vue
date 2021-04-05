<template>
  <div class="bg">
    <h1>Login or Signup</h1>
    <!-- ================================= login ================================= -->
    <div class="login-box">
      <h2 class="title">Login</h2>
      <!-- email&passwordログイン -->
      <ValidationObserver
        ref="observer"
        v-slot="{ invalid }"
        tag="form"
        @submit.prevent="emailLogin({ email: emailForLogin, password: passwordForLogin })"
      >
        <!-- email -->
        <validation-provider v-slot="{ errors }" rules="required|email" name="email">
          <input v-model="emailForLogin" type="text" placeholder="email" class="input" />
          <p v-show="errors.length" class="help is-danger">
            {{ errors[0] }}
          </p>
        </validation-provider>

        <!-- password -->
        <validation-provider v-slot="{ errors }" rules="required|alpha_num" name="password">
          <input
            v-model="passwordForLogin"
            type="password"
            placeholder="password"
            class="input"
            autocomplete="off"
          />
          <p v-show="errors.length" class="help is-danger">
            {{ errors[0] }}
          </p>
        </validation-provider>
        <button type="submit" :disabled="invalid">Login with email</button>
      </ValidationObserver>
      <hr />
      <!-- googleログイン -->
      <button type="submit" @click="googleLogin">Login with google</button>
    </div>

    <!-- ================================= signup ================================= -->
    <div class="signup-box">
      <h2 class="title">Signup</h2>
      <ValidationObserver
        ref="observer"
        v-slot="{ invalid }"
        tag="form"
        @submit.prevent="signup({ email: emailForSignup, password: passwordForSignup })"
      >
        <!-- email -->
        <validation-provider v-slot="{ errors }" rules="required|email" name="email">
          <input v-model="emailForSignup" type="text" placeholder="email" class="input" />
          <p v-show="errors.length" class="help is-danger">
            {{ errors[0] }}
          </p>
        </validation-provider>

        <!-- password -->
        <validation-provider v-slot="{ errors }" rules="required|alpha_num" name="password">
          <input
            v-model="passwordForSignup"
            type="password"
            placeholder="password"
            class="input"
            autocomplete="off"
          />
          <p v-show="errors.length" class="help is-danger">
            {{ errors[0] }}
          </p>
        </validation-provider>
        <button type="submit" :disabled="invalid">Singup with email</button>
      </ValidationObserver>
    </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  data() {
    return {
      emailForLogin: '',
      passwordForLogin: '',
      emailForSignup: '',
      passwordForSignup: '',
    }
  },
  middleware: ['checkLogin'],
  layout: 'login',
  methods: {
    ...mapActions('user', ['emailLogin', 'googleLogin', 'signup', 'logout']),
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

.login-box {
  h2 {
    text-align: center;
  }
  height: 440px;
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

.signup-box {
  h2 {
    text-align: center;
  }
  height: 340px;
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
</style>
