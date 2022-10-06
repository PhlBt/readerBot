require('dotenv').config({ path: '../.env' });
const Parser = require('./module')

const { MongoClient } = require('mongodb');
const db = new MongoClient(process.env.MONGO_URL).db('default');

const express = require('express')
const app = express()
app.listen(6666, () => {
  console.log(`Express started!`)
})

app.get('/add', async (req, res) => {
  const parser = new Parser(req.query.path, db)
  const result = await parser.initManga()
  res.send(result)
});

(async () => {
  const circle = async () => {
    const parser = new Parser('https://readmanga.live/vanpanchmen', db)
    const result = await parser.initManga()
    // const manga = await db.collection('manga').findOne()
    // console.log(manga);
    // if (manga) {
    //   const parser = new Parser(manga.src, db)
    //   const result = await parser.initManga()
    //   await parser.parseImages()
    // } else {
    //   await new Promise(r => setTimeout(r, 1000*60*5))
    //   await circle()
    // }
  }
  await circle()
})();