<template>
  <v-row class="centered">
    <v-col cols="12" sm="8" md="6">
      <v-card>
        <h1 class="text-center py-5" v-if="error.statusCode === 404">
          {{ error.statusCode === 404 ? pageNotFound : otherError }}
        </h1>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
export default {
  props: {
    error: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      pageNotFound: `404 Cтраница не найдена`,
      otherError: "An error occurred",
    };
  },
  head() {
    const title =
      this.error.statusCode === 404 ? this.pageNotFound : this.otherError;
    return {
      title,
    };
  },
};
</script>

<style scoped>
h1 {
  font-size: 20px;
}
.centered {
  margin-top: 50%;
  transform: translateY(-100%);
}
</style>