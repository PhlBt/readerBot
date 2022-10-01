require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const FormData = require('form-data');
const { getNoun } = require('../helper')

const { MongoClient } = require('mongodb');
const db = new MongoClient(process.env.MONGO_URL).db('default');

const puppeteer = require('puppeteer');

module.exports = class {
  constructor(src) {
    this.src = src
    this.manga = null
    this.pages = []

    this.record = class {
      constructor(item) {
        this.n = 0
        this.srcArr = []
        this.item = item
      }

      setSrc(src) {
        this.srcArr.push({ sort: this.n++, src })
      }
    }

    this.thumb = new Thumb()
  }

  async initManga() {
    let current = await this.getManga({ src: this.src })
    if (!current) {
      const currentManga = await this.parseMangaInfo(async (page) => {
        await page.goto(this.src)
        return await page.evaluate(() => {
          const html = document.createElement('div')
          html.innerHTML = $('.picture-fotorama').data('fotorama').options.urtext
          return {
            manga: {
              name: document.querySelector('.name').innerText,
              tags: [...document.querySelectorAll('.elem_tag')].map(item => item.innerText.replace(', ', '')),
              description: document.querySelector('#tab-description .manga-description').innerText,
              image: html.querySelector('img').dataset.full
            },
            pages: [...document.querySelectorAll('#chapters-list .item-title')].map(el => {
              return {
                title: el.innerText.replace(el.querySelector('sup')?.innerText, '').trim(),
                src: el.querySelector('a').href,
                sort: parseInt(el.getAttribute('data-vol') + el.getAttribute('data-num'))
              }
            }).sort((a, b) => a.sort - b.sort)
          }
        })
      })

      currentManga.manga.image = await this.uploadImg(currentManga.manga.image)
      const manga_id = (await db.collection('manga').insertOne({ src: this.src, ready: false, ...currentManga.manga })).insertedId
      await db.collection('pages').insertMany(currentManga.pages.map(el => { return { manga: manga_id, ...el } }))

      this.manga = await this.getManga({ src: this.src })
      return { msg: `Манга ${this.manga.name} добавлена! \nВсего ${currentManga.pages.length} ${getNoun(currentManga.pages.length, 'глава', 'главы', 'глав')}` }
    }
    this.manga = current
    return { msg: `Манга ${current.name} уже существует` }
  }

  async parseImages() {
    const images = await this.getImages().catch(err => console.error('getImages', err))
    console.log("getImages", images)
    return await this.checkPages().catch(err => console.error('checkPages', err))
  }

  async saveImg(obj) {
    let count = 0
    console.time('save image timing')
    const result = {
      page_id: obj._id,
      src: await obj.page.reduce(async (n, item) => {
        n = await n

        if (!!obj.exist?.src[item.sort]?.src) {
          n.push(obj.exist?.src[item.sort])
          count++
          return n
        }

        const imgSrc = await this.uploadImg(item.src)
        if (imgSrc) n.push({ src: imgSrc, sort: item.sort })

        return n
      }, [])
    };

    if (count == obj.page.length) {
      console.log('Empty new image')
      return result
    }

    (obj.exist)
      ? await db.collection('images').updateOne({ _id: obj.exist._id }, { $set: result })
      : await db.collection('images').insertOne(result)

    console.log(`Save image:`, result.src.length - count)
    console.timeEnd('save image timing')

    return result
  }

  async getImages() {
    if (!this.pages.length) this.pages = await this.getPages({ manga: this.manga._id })
    const result = await this.pages.reduce(async (n, charapter) => {
      n = await n

      if (charapter.images)
        if (charapter.images.src.length && !!charapter.images.src.find(el => el.src !== null))
          return n

      console.time(charapter.title)
      const result = await this.parseMangaInfo(async page => {
        await page.goto(charapter.src)
        const ctrl = new this.record()

        const script = async () => {
          await page.waitForSelector('#mangaPicture').catch(console.error)
          const src = await page.evaluate(() => document.querySelector('#mangaPicture')?.src)
          if (src) {
            const charapterName = await page.evaluate(() => document.querySelector('#chapterSelectorSelect').innerText)
            if (charapter.title !== charapterName) {
              console.log(`finish: ${ctrl.srcArr.length}`)
              return { _id: charapter._id, page: ctrl.srcArr, exist: charapter.images }
            }

            ctrl.setSrc(src)

            await page.evaluate(() => document.querySelector('#mangaPicture').click())

            return await script()
          }

          console.log(`finish default: ${ctrl.srcArr.length}`)
          return { _id: charapter._id, page: ctrl.srcArr, exist: charapter.images }
        }
        return await script()
      })
      console.timeEnd(charapter.title)
      await this.saveImg(result)
      return ++n
    }, 0)
    return `Глав ${result} из ${this.pages.length}`
  }

  // async initPages() {
  //   const current = await this.getPages({ manga: this.manga._id })
  //   if (!current.length) {
  //     const currentPages = await this.getNewPages()

  //     return this.pages = currentPages.map(async (el, i) => {
  //       const res = await db.collection('pages').insertOne({ manga: this.manga._id, ...el })
  //       return { _id: res.insertedId, ...el }
  //     })
  //   }

  //   return this.pages = [...current]
  // }

  async checkPages() {
    const page = await this.getNewPages()
    if (!this.pages.length) this.pages = await this.getPages({ manga: this.manga._id })

    const updatePages = await page.reduce(async (n, item) => {
      n = await n
      const current = this.pages.find(el => el.src == item.src)

      if (!current) {
        await db.collection('pages').insertOne({ manga: this.manga._id, ...item })
        return ++n
      }

      if (current && (current?.title !== item.title || current?.src !== item.src)) {
        await db.collection('pages').updateOne({ _id: current._id }, { $set: { ...item } })
          .then(await db.collection('images').updateOne({ page_id: item._id }, { $set: { src: [] } }))
        return ++n
      }
      return n
    }, 0)

    console.log(`Check page: ${updatePages}`)
    if (updatePages > 0) await this.parseImages().catch(err => console.error('parseImages', err))
    else await db.collection('manga').updateOne({ _id: this.manga._id }, { $set: { ready: true } })

    return
  }

  async getNewPages() {
    return await this.parseMangaInfo(async (page) => {
      await page.goto(this.manga.src)
      return await page.evaluate(() => {
        return [...document.querySelectorAll('#chapters-list .item-title')].map(el => {
          return {
            title: el.innerText.replace(el.querySelector('sup')?.innerText, '').trim(),
            src: el.querySelector('a').href,
            sort: parseInt(el.getAttribute('data-vol') + el.getAttribute('data-num'))
          }
        }).sort((a, b) => a.sort - b.sort)
      })
    })
  }

  async parseMangaInfo(callback) {
    return await new Promise(r => {
      (async () => {
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
        const page = await browser.newPage()

        page.setRequestInterception(true)
        page.setDefaultNavigationTimeout(0)
        page.on('request', (req) => {
          if (req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image')
            req.abort()
          else req.continue()
        })

        const result = await callback(page)

        await browser.close()
        console.log('Browser finish!')
        r(result)
      })()
    })
  }

  async uploadImg(item) {
    const key = await this.thumb.getId()
    if (!key) return false

    return 'test'

    const img = await axios(item, { responseType: "stream" })
      .then(response => response.data)
      .then(response => {
        const formData = new FormData()
        formData.append("key", key)
        formData.append("media", response)
        return formData
      }).catch((err) => {
        console.log('get img error: ', err)
        return false
      })

    return (img)
      ? await axios({
        url: 'https://thumbsnap.com/api/upload',
        method: 'POST',
        data: img,
        withCredentials: true,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        headers: { "content-type": "multipart/form-data" }
      }).then(res => (res.data.success) ? res.data.data.media : false)
        .catch(console.error)
      : false
  }

  getManga(query) {
    return db.collection('manga').findOne(query).then(r => r)
  }

  getPages(query) {
    return db.collection('pages').aggregate([
      { $match: query },
      { $sort: { sort: 1 } },
      {
        $lookup: {
          from: 'images',
          localField: '_id',
          foreignField: 'page_id',
          as: 'images'
        }
      },
      {
        $unwind: {
          path: '$images',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          page: 0,
          manga: 0,
          'images.page_id': 0
        }
      }
    ]).toArray()
  }
}

const Thumb = class {
  constructor() {
    this.current = ''
    this.list = [
      { id: '00002091621ff7fc04d36769d7edf8d6', count: 0, time: 0 },
      { id: '00002092e91720925ad5a749d46d0868', count: 0, time: 0 },
      { id: '00002093ef253d35ca683f078318aea3', count: 0, time: 0 },
      { id: '0000209488e16fd3e71f710382412e53', count: 0, time: 0 },
      { id: '000020673c1cb63af6c207e028cfb1ca', count: 0, time: 0 },
      { id: '0000208b0ff4f51beac37dc375f2174f', count: 0, time: 0 },
      { id: '0000208c45170aacabdacdefff788e1e', count: 0, time: 0 },
      { id: '0000208d20454c506c9186e33d624645', count: 0, time: 0 },
      { id: '0000208e69ea9b78a120b7be39a43bba', count: 0, time: 0 },
      { id: '00002090b375658f6f96be685741a0fd', count: 0, time: 0 },
    ]
  }

  async getId() {
    let change = 0
    if (this.list.find(el => this.current == el.id)?.count == 99) this.current = ''
    this.list = this.list.map(el => {
      if (!this.current && el.count < 99) {
        this.current = el.id
        change = 1
      }
      if (el.time < (Date.now() - 1000 * 60 * 60)) el = { id: el.id, count: 0, time: Date.now() }
      if (el.id == this.current) el = { id: el.id, count: ++el.count, time: Date.now() }
      if (change) {
        console.log('set thump', this.list)
        change = 0
      }
      return el
    })
    if (!this.current) {
      await new Promise(r => setTimeout(r, 1000 * 60 * 5))
      return await this.getId()
    }
    return this.current
  }
}