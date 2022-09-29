<template>
  <v-app dark>
    <v-navigation-drawer width="90%" v-model="show" absolute right>
      <v-list :height="height" class="mango-list">
        <v-list-item
          v-for="item in menu"
          :class="[{ 'mango-current': item._id == current }]"
          :key="item._id"
          :disabled="item._id == current"
          @click="$router.push(item._id)"
        >
          <v-list-item-icon class="mr-4">
            <v-icon>{{
              current == item._id
                ? "mdi-check-circle-outline"
                : "mdi-checkbox-blank-circle-outline"
            }}</v-icon>
          </v-list-item-icon>
          <v-list-item-content>{{ item.title }}</v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    <v-card class="px-2 d-flex">
      <v-btn @click="showDrawer()" icon class="my-2">
        <v-icon>mdi-format-list-bulleted</v-icon>
      </v-btn>
      <h4 class="mango-title">{{ title }}</h4>
    </v-card>
    <v-main>
      <Nuxt />
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: "DefaultLayout",
  data() {
    return {
      show: false,
    };
  },
  methods: {
    showDrawer() {
      if (!this.show) document.querySelector('.mango-current')?.scrollIntoView(false)
      this.show = !this.show
    }
  },
  computed: {
    current() {
      return this.$store.getters.current;
    },
    menu() {
      return this.$store.getters.menu;
    },
    title() {
      return this.$store.getters.title;
    },
    height() {
      return window.innerHeight;
    },
  },
};
</script>

<style>
.mango-list {
  overflow-y: auto;
}
.mango-title {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 36px;
}
.mango-current {
  border-bottom: 1px solid;
  border-top: 1px solid;
}
.mango-current .v-list-item__icon .v-icon {
  color: green;
}
.mango-current .v-list-item__content {
  color: #fff;
}
</style>