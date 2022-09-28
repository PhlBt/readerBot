const { ObjectId } = require('mongodb')

module.exports = class {
  constructor({ bot, db }) {
    this.bot = bot
    this.db = db

    this.text = {
      start: 'Бот для настроек',
    }
    this.pages = this.getPagesFunc()
    this.navigator = []

    this.init()
  }

  init() {
    this.bot.on('message', msg => this.listener(msg))
    this.bot.on('callback_query', msg => this.listener(msg))
  }

  getPagesFunc() {
    return {
      start: ({ msg, command }) => {
        if (command !== 'update')
          this.bot.sendMessage(this.user.id, this.text.start)
        else
          this.bot.editMessageText(this.text.start, { message_id: msg.message.message_id, chat_id: this.user.id })
      }
    }
  }

  async listener(msg) {
    await this.auth(msg)
    if (!this.user) return

    this.navigator.unshift(msg.text || msg.data)
    this.navigator.length = 2

    const command = (msg.text || msg.data).replace('/', '').split('@')
    return this.pages[command[0]]({ msg, command: command[1] })
  }

  async auth(msg) {
    this.user = await this.db.collection('users').findOne({ id: msg.from.id, admin: true })
  }
}