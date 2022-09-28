<template>
  <div class="error404">
    <span class="red404">404</span>
    <span class="desc404">{{ this.title }}</span>
  </div>
</template>

<script>
export default {
  head() {
    return {
      title: this.title,
    };
  },
  data() {
    return {
      title: "Что-то пошло не так...",
    };
  },
};
</script>

<style>
.error404 {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  color: #ffffff;
  justify-content: center;
  align-items: center;
  font-size: 1rem;
}
.red404 {
  color: #f44336;
  font-size: 3rem;
}
</style>