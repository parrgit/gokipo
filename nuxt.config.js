const webpack = require('webpack')

export default {
  // Disable server-side rendering (https://go.nuxtjs.dev/ssr-mode)
  ssr: false,

  // Target (https://go.nuxtjs.dev/config-target)
  target: 'static',

  // Global page headers (https://go.nuxtjs.dev/config-head)
  head: {
    title: 'Purine',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '' },
    ],
    link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
  },

  // Global CSS (https://go.nuxtjs.dev/config-css)
  css: ['@/assets/css/style.scss', 'animate.css/animate.min.css'],

  // Plugins to run before rendering page (https://go.nuxtjs.dev/config-plugins)
  plugins: [
    '@/plugins/firebase',
    '@/plugins/realtime',
    '@/plugins/auth',
    '@/plugins/async',
    '@/plugins/user',
    '@/plugins/vee-validate',
    { src: '@/plugins/modal', mode: 'client' },
  ],

  // Auto import components (https://go.nuxtjs.dev/config-components)
  components: true,

  // Modules for dev and build (recommended) (https://go.nuxtjs.dev/config-modules)
  buildModules: [],

  // Modules (https://go.nuxtjs.dev/config-modules)
  modules: ['@nuxtjs/markdownit', 'nuxt-fontawesome'],

  markdownit: {
    preset: 'default', //markdownを使用
    injected: true, //$mdでhtmlにパース
    breaks: true, //改行を<br>に変換
  },

  fontawesome: {
    imports: [
      {
        set: '@fortawesome/free-brands-svg-icons',
        icons: ['faTwitter'],
      },
      {
        set: '@fortawesome/free-solid-svg-icons',
        icons: ['fas'],
      },
    ],
  },

  // Build Configuration (https://go.nuxtjs.dev/config-build)
  build: {
    transpile: ['vue-final-modal', 'vee-validate/dist/rules'],
    plugins: [
      new webpack.ProvidePlugin({
        jQuery: 'jquery',
        $: 'jquery',
      }),
    ],
  },

  loading: {
    color: 'red',
    height: '5px',
  },

  loadingIndicator: {
    name: 'cube-grid',
    color: 'red',
    background: 'black',
  },
}
