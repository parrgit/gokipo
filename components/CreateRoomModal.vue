<template>
  <div>
    <form @submit.prevent="onSubmit">
      <div>
        <input v-model="name.val" @blur="validateName" placeholder="room name" />
        <span v-show="name.errorMessage">
          {{ name.errorMessage }}
        </span>
      </div>
      <div>
        <button>
          crete room
        </button>
      </div>
    </form>
    <!-- <button @click="deleteRooms">delete rooms</button> -->
  </div>
</template>

<script>
export default {
  data() {
    return {
      name: {
        label: 'name',
        val: null,
        errorMessage: null,
      },
    }
  },

  computed: {
    isValidateError() {
      return this.name.errorMessage
    },
    maxLength() {
      return 35
    },
  },

  methods: {
    validateName() {
      const name = this.name
      if (!name.val) {
        name.errorMessage = `room name is required`
        return
      }
      if (name.val.length > this.maxLength) {
        name.errorMessage = `characters < ${this.maxLength}`
        return
      }
      name.errorMessage = null
    },
    async onSubmit() {
      // 認証チェック
      const user = await this.$auth()
      if (!user) this.$router.push('/login')
      // 入力値チェック
      this.validateName()
      if (this.isValidateError) return
      // 登録データを準備
      const roomData = {
        name: this.name.val,
        minNumber: 2,
        maxNumber: 6,
        currentNumber: 0,
        createdAt: this.$firebase.firestore.FieldValue.serverTimestamp(),
      }
      const progressData = {
        phase: 'waiting',
        declare: '',
        turn: 0,
      }
      try {
        await this.$firestore
          .collection('rooms')
          .add(roomData)
          .then(doc => {
            //progressセット
            this.$firestore.doc(`/rooms/${doc.id}/progress/progDoc`).set(progressData)
          })
        this.$emit('closeModal')
      } catch (e) {
        alert('登録に失敗しました')
      }
    },
    // deleteRooms() {
    //   this.$firestore
    //     .collection('/rooms')
    //     .get()
    //     .then(snapshot => {
    //       snapshot.forEach(doc => {
    //         doc.ref.delete()
    //       })
    //     })
    // },
  },
}
</script>

<style lang="scss" scoped>
$basic: #0f0e17;
$light: #fffffe;
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
</style>
