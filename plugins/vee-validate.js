import Vue from 'vue'
import { ValidationProvider, ValidationObserver, localize, extend } from 'vee-validate'
// import ja from 'vee-validate/dist/locale/ja.json' // エラーメッセージを日本語化します
import { required, min } from 'vee-validate/dist/rules' // 使用するバリデーションルールを指定します。

// VeeValidateが用意している各ルールを使用するよう指定
extend('required', required) // 必須項目のバリデーション
extend('min', min) //min:3のように使用、現在未使用

// 下記は固定で書く
Vue.component('ValidationProvider', ValidationProvider)
Vue.component('ValidationObserver', ValidationObserver)
// localize('ja', ja)
