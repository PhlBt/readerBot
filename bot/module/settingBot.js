const { Waiter } = require('../helper')
const { ObjectId } = require('mongodb')
const axios = require('axios')

module.exports = class {
  constructor({ bot, db }) {
    this.bot = bot
    this.db = db

    this.text = {
      start: 'Бот для настроек',
      add: 'Отправьте ссылку',
      addSuccess: 'Ссылка добавлена',
      addError: 'Ошибка при добавлении ссылки'
    }
    this.btn = {
      add: 'Добавить',
      back: 'Вернуться'
    }
    this.waiter = new Waiter()
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
        const inline_keyboard = []
        inline_keyboard.push([{ text: this.btn.add, callback_data: 'add' }])

        if (command !== 'update')
          this.bot.sendMessage(this.user.id, this.text.start, { reply_markup: { inline_keyboard } })
        else
          this.bot.editMessageText(this.text.start, { message_id: msg.message.message_id, chat_id: this.user.id, reply_markup: { inline_keyboard } })
      },
      add: ({ msg, command }) => {
        this.waiter.set(this.user._id, this.pages.addResp)
        this.bot.editMessageText(this.text.add, { message_id: msg.message.message_id, chat_id: this.user.id })
      },
      addResp: async (msg) => {
        let url = false
        try { url = new URL(msg.text) } catch (err) { console.log('Not url', err) }

        if (url) {
          const resp = await axios.get('http://browser:6666/add', { params: { path: url.href } }).then(res => res.data)
          this.bot.sendMessage(this.user.id, resp.msg, { reply_markup: { inline_keyboard: [[{ text: this.btn.back, callback_data: 'start@update' }]] } })
        } else {
          this.bot.sendMessage(this.user.id, this.text.addError, { reply_markup: { inline_keyboard: [[{ text: this.btn.back, callback_data: 'start@update' }]] } })
        }
      }
    }
  }

  async listener(msg) {
    await this.auth(msg)
    if (!this.user) return
    if (await this.waiter.call({ id: this.user._id, msg })) return

    this.navigator.unshift(msg.text || msg.data)
    this.navigator.length = 2

    const command = (msg.text || msg.data).replace('/', '').split('@')
    return this.pages[command[0]]({ msg, command: command[1] })
  }

  async auth(msg) {
    this.user = await this.db.collection('users').findOne({ id: msg.from.id, admin: true })
  }
}