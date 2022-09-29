export const state = () => ({
  menu: [],
  title: '',
  current: '',
})

export const actions = {
  requestMenu({ commit, state }, id) {
    if (!state.menu.length)
      this.$axios
        .post(`manga/getMenu`, { id })
        .then((res) => res.data)
        .then(res => commit('menu', res))
  }
}

export const mutations = {
  menu: (state, v) => state.menu = v,
  current: (state, v) => state.current = v,
  title: (state, v) => state.title = v
}

export const getters = {
  menu: state => state.menu,
  current: state => state.current,
  title: state => state.title
}