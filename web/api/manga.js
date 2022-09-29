import { MongoClient, ObjectId } from 'mongodb'
import * as dotenv from 'dotenv'

const env = dotenv.config({ path: '../.env' }).parsed
const db = new MongoClient(env.MONGO_URL).db('default')

const getMenu = async ({ id }) => await db.collection('pages').find({ manga: new ObjectId(id) }).project({ _id: 1, title: 1, sort: 1 }).sort({ sort: -1 }).toArray()

const getPage = async ({ id, user_id, manga_id }) => {
  let _id = id
  const user = await db.collection('users').findOne({ id: user_id })
  const history = await db.collection('history').findOne({ user_id: user._id, manga_id: new ObjectId(manga_id) })
  if (id == 'restore') _id = history.current_id

  const result = await db.collection('pages').aggregate([
    { $match: { _id: new ObjectId(_id) } },
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
        'images.page_id': 0
      }
    }
  ]).next().then(async res => {
    return {
      current: res,
      next: (await db.collection('pages').findOne(
        { manga: res.manga, sort: { $gt: res.sort } },
        { projection: { _id: 1 }, sort: { sort: 1 } }
      ))._id
    }
  })

  setHistory({user, manga_id, current: result.current})
  return result
}

const setHistory = async ({ user, manga_id, current }) => {
  const data = {
    manga_id: new ObjectId(manga_id),
    current_id: new ObjectId(current._id),
    user_id: user._id,
    sort: current.sort,
    time: Date.now()
  }

  const history = await db.collection('history').findOne({ user_id: data.user_id, manga_id: data.manga_id })
  if (!history || history.sort < data.sort) await db.collection('history').updateOne(
    { user_id: data.user_id, manga_id: data.manga_id },
    { $set: data },
    { upsert: true }
  )
}

export { getMenu, getPage, setHistory } 