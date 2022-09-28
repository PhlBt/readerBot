export const state = () => ({
  menu: []
})

export const actions = {
  requestMenu({ commit }, id) {
    this.$axios
      .post(`manga/getMenu`, { id })
      .then((res) => res.data)
      .then(res => commit('menu', res))
  }
}

export const mutations = {
  menu: (state, v) => state.menu = v
}

export const getters = {
  menu: state => state.menu
}