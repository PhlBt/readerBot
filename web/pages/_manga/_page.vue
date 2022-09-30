<template>
  <div>
    <div v-if="!current" class="loader">
      <v-progress-circular :size="70" :width="7" color="grey" indeterminate />
    </div>
    <v-card v-else-if="error" class="pa-4 ma-2 d-flex flex-column">
      <p class="text-center">При загрузке произошла ошибка</p>
      <v-btn @click="$router.go()">Обновить страницу</v-btn>
    </v-card>
    <div v-else>
      <v-navigation-drawer
        width="calc(100% - 52px)"
        v-model="show"
        touchless
        absolute
        right
      >
        <v-list :height="height" class="mango-list">
          <v-list-item
            v-for="item in menu"
            :class="[{ 'mango-current': item._id == current._id }]"
            :key="item._id"
            :disabled="item._id == current._id"
            @click="$router.push(item._id)"
          >
            <v-list-item-icon class="mr-4">
              <v-icon>{{
                current.sort >= item.sort
                  ? "mdi-check-circle-outline"
                  : "mdi-checkbox-blank-circle-outline"
              }}</v-icon>
            </v-list-item-icon>
            <v-list-item-content>{{ item.title }}</v-list-item-content>
          </v-list-item>
        </v-list>
      </v-navigation-drawer>
      <v-card class="pa-2 d-flex">
        <v-btn @click="showDrawer()" icon class="my-2">
          <v-icon>mdi-format-list-bulleted</v-icon>
        </v-btn>
        <h4 class="mango-title">{{ current.title }}</h4>
      </v-card>
      <div v-if="img.length" class="pa-2">
        <template v-for="item in img">
          <img
            v-if="isImg(item.src)"
            class="w-100 min-height"
            :key="'img_' + item.sort"
            :src="item.src"
            :alt="current.title"
          />
          <video
            v-else
            class="w-100"
            :key="'video_' + item.sort"
            :src="item.src"
            autoplay
            loop
            muted
          ></video>
        </template>
      </div>
      <v-card class="px-2 py-4">
        <v-btn v-if="next" class="w-100" large @click="$router.push(next)">
          Дальше
        </v-btn>
        <v-btn v-else class="w-100" large disabled> Конец </v-btn>
      </v-card>
    </div>
  </div>
</template>

<script>
export default {
  head() {
    return {
      title: this.current.title,
    };
  },
  data() {
    return {
      show: false,
      images: [],
      error: false,
      current: false,
      next: false,
      user: false,
      params: {},
    };
  },
  computed: {
    img() {
      return this.images.sort((a, b) => a.sort - b.sort);
    },
    menu() {
      return this.$store.getters.menu;
    },
    height() {
      return window.innerHeight - 20;
    },
  },
  async asyncData({ params, redirect }) {
    if (!params.manga || !params.page) redirect("/404");
    return { params };
  },
  async fetch() {
    const { current, next } = await this.$axios
      .post(`manga/getPage`, {
        id: this.params.page,
        user_id: this.user.id,
        manga_id: this.params.manga,
      })
      .then((res) => res.data);

    this.error = !!current.id;
    this.current = current;
    this.images = current.images.src;
    delete this.current.images;
    this.next = next;
  },
  beforeMount() {
    this.$store.dispatch("requestMenu", this.params.manga);

    const initData = new URLSearchParams(Telegram.WebApp.initData);
    this.user = initData.has("user")
      ? JSON.parse(initData.get("user")) || false
      : false; // : { id: 214457275 };

    if (!this.user) this.$router.push("/404");
  },
  methods: {
    isImg(link) {
      const linkArr = link.split(".");
      const format = linkArr[linkArr.length - 1];
      return format !== "mp4";
    },
    showDrawer() {
      if (!this.show)
        document.querySelector(".mango-current")?.scrollIntoView();
      this.show = !this.show;
    },
  },
};
</script> 

<style>
.w-100 {
  width: 100%;
}
.min-height {
  min-height: 144px;
}
.loader {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}
.mango-list {
  overflow-y: auto;
  margin: 10px 0;
}
.mango-title {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  white-space: break-spaces;
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
.v-sheet.v-card {
  border-radius: 0;
}
.v-btn.v-btn--disabled {
  color: #ffffff !important;
}
.v-btn.v-btn--disabled.v-btn--has-bg {
  background-color: #272727 !important;
}
.v-text-field__details {
  display: none;
}
.v-input__slot {
  margin-top: 8px;
}
.v-select__selections input[type="text"] {
  display: none;
}
.v-select__selections .v-select__selection {
  width: 100%;
  text-align: center;
}
</style>