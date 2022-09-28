require('dotenv').config({ path: '../.env' })
const Telegram = require('node-telegram-bot-api')
const { MongoClient } = require('mongodb')
const MangoBot = require('./module/bot')
const SettingBot = require('./module/settingBot')

const db = new MongoClient(process.env.MONGO_URL).db('default')

const mango = new Telegram(process.env.TELEGRAM_API_TOKEN, { polling: true })
const setting = new Telegram(process.env.TELEGRAM_API_TOKEN_SETTING, { polling: true })

new MangoBot({ bot: mango, db })
new SettingBot({ bot: setting, db })
