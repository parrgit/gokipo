<template>
  <transition appear>
    <div>
      <!-- ここにModalの中身が入る -->
      <slot />

      <!-- Modalを閉じるボタン -->
      <button @click="$emit('closeModal')">
        X
      </button>
    </div>
  </transition>
</template>

<style scoped>
.v-leave-active,
.v-enter-active {
  transition: opacity 0.4s ease-out;
}

.v-enter,
.v-leave-to {
  opacity: 0;
}

.v-enter-to,
.vleave {
  opacity: 1;
}

div{
  border: 1px solid white
}
</style>
