const { Waiter, createPagination } = require('../helper')
const { ObjectId } = require('mongodb')

module.exports = class {
  constructor({ bot, db }) {
    this.bot = bot
    this.db = db

    this.text = {
      manga: manga => `${manga.name}\n\n${manga.description}`,
      orderResp: text => `Мы получили ваш запрос, как только у нас появится информация по манге ${text} мы пришлем вам сообщение.`,
      start: 'Здесь вы можете читать мангу. \n\nПока что у нас не большой выбор, но мы стараемся это исправить.',
      read: 'Произведения которые вы уже читаете',
      popular: 'Самые популярные манги',
      new: 'Последние обновления и новинки',
      order: 'Пришлите нам название или ссылку на мангу которую вы хотите прочитать!\n\nМы сделаем всё что бы ваше желание сбылось! ❤️',
    }
    this.btn = {
      back: 'Вернуться назад',
      continue: 'Продолжить чтение',
      read: 'Читать с начала'
    }

    this.waiter = new Waiter()
    this.navigator = []

    this.init()
  }

  init() {
    this.pages = this.getPagesFunc()

    this.bot.on('message', msg => this.listener(msg))
    this.bot.on('callback_query', msg => this.listener(msg))

    this.bot.setMyCommands([
      { command: '/start', description: 'Главная' },
      { command: '/help', description: 'Помощь и предложения' },
    ])
  }

  getPagesFunc() {
    return {
      manga: async ({ msg, command }) => {
        const manga = await this.getManga(command)

        const inline_keyboard = [[
          (manga.history.length)
            ? {
                text: this.btn.continue,
                web_app: { url: `https://${process.env.DOCKER_PROJECT_DOMAIN}/${manga._id}/restore` }
              }
            : {
                text: this.btn.read,
                web_app: { url: `https://${process.env.DOCKER_PROJECT_DOMAIN}/${manga._id}/${manga.firstPage._id}` }
              }
        ]]
        inline_keyboard.push([{ text: this.btn.back, callback_data: this.navigator[1] }])

        this.bot.editMessageText(
          this.text.manga(manga),
          { message_id: msg.message.message_id, chat_id: msg.message.chat.id, reply_markup: { inline_keyboard } },
        )
      },
      start: ({ msg, command }) => {
        const inline_keyboard = []

        if (this.user.history) inline_keyboard.push([{ text: 'Продолжить чтение', callback_data: 'read@0' }])
        inline_keyboard.push([{ text: 'Популярные', callback_data: 'popular@0' }, { text: 'Новинки', callback_data: 'new@0' }])
        // inline_keyboard.push([{ text: 'Поиск по названию', callback_data: 'searchName' }, { text: 'Поиск по тегам', callback_data: 'searchTag' }])
        inline_keyboard.push([{ text: 'Заказать мангу', callback_data: 'order' }])

        if (command !== 'update')
          this.bot.sendMessage(this.user.id, this.text.start, { reply_markup: { inline_keyboard } })
        else
          this.bot.editMessageText(this.text.start, { message_id: msg.message.message_id, chat_id: this.user.id, reply_markup: { inline_keyboard } })
      },
      read: async ({ msg, command }) => {
        const pagination = createPagination({
          count: await this.db.collection('history').countDocuments({ user_id: this.user._id, finish: undefined }),
          limit: 5,
          page: command,
          entity: 'read'
        })

        const list = await this.getAccountHistory(pagination)

        const inline_keyboard = list.map(item => [{ text: item.manga.name, callback_data: `manga@${item.manga_id}` }])
        if (pagination.show) inline_keyboard.push(pagination.button)
        inline_keyboard.push([{ text: this.btn.back, callback_data: 'start@update' }])

        this.bot.editMessageText(this.text.read+pagination.text, { message_id: msg.message.message_id, chat_id: this.user.id, reply_markup: { inline_keyboard } })
      },
      popular: async ({ msg, command }) => {
        const pagination = createPagination({
          count: await this.db.collection('manga').countDocuments({ ready: true }),
          limit: 5,
          page: command,
          entity: 'popular'
        })

        const list = await this.db.collection('manga').find({ ready: true })
          .skip(pagination.startIndex).limit(pagination.limit).toArray()

        const inline_keyboard = list.map(item => [{ text: item.name, callback_data: `manga@${item._id}` }])
        if (pagination.show) inline_keyboard.push(pagination.button)
        inline_keyboard.push([{ text: this.btn.back, callback_data: 'start@update' }])

        this.bot.editMessageText(this.text.popular+pagination.text, { message_id: msg.message.message_id, chat_id: this.user.id, reply_markup: { inline_keyboard } })
      },
      new: async ({ msg, command }) => {
        const pagination = createPagination({
          count: await this.db.collection('manga').countDocuments({ ready: true }),
          limit: 5,
          page: command,
          entity: 'new'
        })

        const list = await this.db.collection('manga').find({ ready: true })
          .sort({ _id: -1 }).skip(pagination.startIndex).limit(pagination.limit).toArray()

        const inline_keyboard = list.map(item => [{ text: item.name, callback_data: `manga@${item._id}` }])
        if (pagination.show) inline_keyboard.push(pagination.button)
        inline_keyboard.push([{ text: this.btn.back, callback_data: 'start@update' }])

        this.bot.editMessageText(this.text.new+pagination.text, { message_id: msg.message.message_id, chat_id: this.user.id, reply_markup: { inline_keyboard } })
      },
      searchName: msg => {
        console.log('searchName', msg);
      },
      searchTag: msg => {
        console.log('searchTag', msg);
      },
      order: async ({ msg }) => {
        this.waiter.set(this.user._id, this.pages.orderResp)
        this.bot.editMessageText(this.text.order, { message_id: msg.message.message_id, chat_id: this.user.id })
      },
      orderResp: async msg => {
        const order = await this.db.collection('orders').insertOne({ text: msg.text, user_id: this.user._id })
        const inline_keyboard = [[{ text: this.btn.back, callback_data: 'start@update' }]]
        this.bot.sendMessage(this.user.id, this.text.orderResp(msg.text), { reply_markup: { inline_keyboard } })
      }
    }
  }

  async listener(msg) {
    await this.auth(msg)
    if (await this.waiter.call({ id: this.user._id, msg })) return

    this.navigator.unshift(msg.text || msg.data)
    this.navigator.length = 2

    const command = (msg.text || msg.data).replace('/', '').split('@')
    return this.pages[command[0]]({ msg, command: command[1] })
  }

  getAccountHistory(pagination) {
    return this.db.collection('history').aggregate([
      { $match: { user_id: this.user._id, finish: undefined } },
      {
        $lookup: {
          from: 'manga',
          localField: 'manga_id',
          foreignField: '_id',
          as: 'manga',
        }
      },
      { $unwind: "$manga" },
      {
        $project: {
          manga_id: 1,
          "manga.name": 1
        }
      },
      { $sort: { time: 1 } },
      { $limit: pagination.limit },
      { $skip: pagination.startIndex }
    ]).toArray()
  }

  getManga(_id) {
    return this.db.collection('manga').aggregate([
      { $match: { _id: new ObjectId(_id) } },
      {
        $lookup: {
          from: 'pages',
          localField: '_id',
          foreignField: 'manga',
          as: 'firstPage',
          pipeline: [
            { $sort: { sort: 1 } },
            { $limit: 1 }
          ]
        }
      },
      { $unwind: "$firstPage" },
      {
        $lookup: {
          from: 'history',
          localField: '_id',
          foreignField: 'manga_id',
          as: 'history',
          pipeline: [{ $match: { user_id: this.user._id } }]
        }
      },
      {
        $project: {
          name: 1,
          tags: 1,
          description: 1,
          "firstPage._id": 1,
          "history.current_id": 1
        }
      }
    ]).next()
  }

  async auth(msg) {
    let user = await this.db.collection('users').findOne({ id: msg.from.id })
    if (!user) user = await this.db.collection('users').insertOne(msg.from)
      .then(async res => await this.db.collection('users').findOne({ _id: res.insertedId }))

    user.history = await this.db.collection('history').countDocuments({ user_id: user._id })
    this.user = user
  }
}