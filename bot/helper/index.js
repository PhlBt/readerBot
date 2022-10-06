const Waiter = class {
  constructor() {
    this.default = {
      await: false,
      target: () => {}
    }
    this.collection = {}
  }

  async call({ id, msg }) {
    if (this.collection[id] && this.collection[id].await) {
      await this.collection[id].target(msg)
      this.clear(id)
      return true
    }
    return false
  }
  set(id, callback) {
    this.collection[id] = {
      await: true,
      target: callback,
      timer: setTimeout(() => this.clear(id), 1000*60*10)
    }
  }
  clear(id) {
    clearTimeout(this.collection[id].timer)
    delete this.collection[id]
  }
}

const createPagination = ({ count, limit, page, entity }) => {
  page = parseInt(page)
  const show = count > limit
  const text = show ? `\n\nСтраница ${page + 1} из ${Math.ceil(count / limit)}` : ''
  const startIndex = page * limit
  const endIndex = (page + 1) * limit

  const button = []
  if (startIndex > 0) button.push({ text: '⬅️ Предыдущая', callback_data: `${entity}@${page - 1}` })
  if (endIndex < count) button.push({ text: 'Следующая ➡️', callback_data: `${entity}@${page + 1}` })

  return { show, limit, startIndex, endIndex, button, text }
}

module.exports = {
  Waiter, createPagination
}