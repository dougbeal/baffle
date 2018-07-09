/* NewsBlur endpoint.
 *
 * https://newsblur.com/api
 */
'use strict'

const fetch = require('node-fetch')

async function fetchItems(res, channel, token) {
  const feeds = await fetchNewsBlur(res, '/reader/feeds', token)
  // TODO: switch to exceptions
  if (!feeds)
    return

  let feedIds = null
  for (folder in feeds['folders']) {
    if (folder instanceof Object &&
        (!channel || channel == Object.keys(folder)[0])) {
      feedIds = Object.values(folder)[0]
      break
    }
  }

  let params = new URLSearchParams()
  for (id in feedIds)
    params.append('feeds', id)
  const stories = await fetchNewsBlur(
    res, '/reader/river_stories?' + params.toString(), token)
  if (!stories)
    return

  res.json({'items': stories['stories'].map(
    function(s) { return {
      type: 'entry',
      published: s.story_date,
      url: s.story_permalink,
      author: {
        type: 'card',
        name: s.story_authors,
      },
      category: s.story_tags,
      // photo: s.image_urls,
      name: s.story_title,
      content: {html: s.story_content},
      _id: s.story_id,
      _is_read: s.read_status != 0,
    }})
  })
}

async function fetchChannels(res, token) {
  let feeds = await fetchNewsBlur(res, '/reader/feeds', token)
  if (!feeds)
    return feeds

  feeds.folders.push({'notifications': null})
  const channels = {
    'channels': feeds.folders.filter(f => typeof f == 'object')
      .map(function(f) {
        const name = Object.keys(f)[0]
        return {
          'uid': name,
          'name': name,
          'unread': 0
        }
      })
  }
  res.json(channels)
}

/**
 * Makes a NewsBlur API call.
 *
 * If it succeeds, returns a JSON object. If it fails, writes details into res
 * and returns null.
 *
 * @param {String} path, NewsBlur API path
 * @param {String} token, access token
 * @param {express.Response} res
 */
async function fetchNewsBlur(res, path, token) {
  const nbRes = await fetch('https://newsblur.com' + path, {
      method: 'GET',
      headers: {
        'Cookie': 'newsblur_sessionid=' + token,
        'User-Agent': 'Baffle (https://baffle.tech)',
      }
    })
  if (nbRes.status != 200) {
    const msg = 'NewsBlur error: ' + nbRes.statusText
    console.log(msg)
    res.status(nbRes.status).send(msg)
    return null
  }

  const nbJson = await nbRes.json()
  if (!nbJson['authenticated']) {
    const msg = "Couldn't log into NewsBlur" + JSON.stringify(nbJson)
    console.log(msg)
    res.status(401).send(msg)
    return null
  }

  return nbJson
}

/**
 * Fetch and log a given request object
 * @param {Request} req
 */
async function handle(req, res) {
  // console.log('Got request', req.url, req.body)
  const auth = req.header('Authorization')
  if (!auth)
    return res.status(400).send('Missing Authorization header')

  const parts = auth.split(' ')
  if (!parts || parts.length != 2)
    return res.status(400).send('Bad Authorization header')

  const token = parts[1]
  if (!token)
    return res.status(400).send('Bad Authorization header')

  if (req.query.action == 'channels')
    await fetchChannels(res, token)
  else if (req.query.action == 'timeline')
    await fetchItems(params.get('channel'), res, token)
  else
    res.status(501).send(req.query.action + ' action not supported yet')

  // console.log('Inside, sending response', res.statusCode)
}

module.exports.handle = handle