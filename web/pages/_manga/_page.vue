<template>
  <div>
    <v-card v-if="error" class="pa-4 ma-2 d-flex flex-column">
      <p class="text-center">При загрузке произошла ошибка</p>
      <v-btn @click="$router.go()">Обновить страницу</v-btn>
    </v-card>
    <div v-else>
      <v-card v-if="menu.length" class="px-2 d-flex justify-center">
        <v-select
          :value="this.current._id"
          :items="menu"
          item-value="_id"
          item-text="title"
          outlined
          @input="$router.push($event)"
        />
      </v-card>
      <div v-if="img.length" class="pa-2">
        <template v-for="item in img">
          <img
            v-if="isImg(item.src)"
            class="w-100"
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
      images: [],
      error: false,
      current: false,
      next: false,
      user: false,
      params: {},
    };
  },
  computed: {
    menu() {
      return this.$store.getters.menu;
    },
    img() {
      return this.images.sort((a, b) => a.sort - b.sort);
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
    if (!this.menu.length)
      this.$store.dispatch("requestMenu", this.params.manga);

    const initData = new URLSearchParams(Telegram.WebApp.initData);
    this.user = initData.has("user")
      ? JSON.parse(initData.get("user")) || false
      : { id: 214457275 }; // : false;

    if (!this.user) this.$router.push("/404");
  },
  methods: {
    isImg(link) {
      const linkArr = link.split(".");
      const format = linkArr[linkArr.length - 1];
      return format !== "mp4";
    },
  },
};
</script> 

<style>
body {
  background-color: #1e1e1e;
}
.w-100 {
  width: 100%;
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