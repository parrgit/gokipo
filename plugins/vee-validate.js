import Vue from 'vue'
import { ValidationProvider, ValidationObserver, extend } from 'vee-validate'
// import ja from 'vee-validate/dist/locale/ja.json' // エラーメッセージを日本語化します
import { required, email, alpha_num } from 'vee-validate/dist/rules' // 使用するバリデーションルールを指定します。

// ルール
extend('required', required) // 必須項目のバリデーション
extend('email', email)
extend('alpha_num', alpha_num)

// 下記は固定で書く
Vue.component('ValidationProvider', ValidationProvider)
Vue.component('ValidationObserver', ValidationObserver)
// localize('ja', ja)
