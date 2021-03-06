'use strict'

const express = require('express')
const newsblur = require('./routes/newsblur.js')

const app = express()
app.enable('trust proxy')
app.set('view engine', 'pug')

/*
 * Catch exceptions in async functions that would otherwise hang supertest.
 *
 * (I'm sure there's a better way to do this, and I'm just using supertest or
 * express or ava wrong somehow, but I couldn't figure out how. :P)
 */
function catcher(fn) {
  return async function(req, res) {
    try {
      await fn(req, res)
    } catch (err) {
      console.error(err)
      res.status(500)
      res.end()
    }
  }
}

app.get('/', function (req, res) {
  res.render('index', {})
})

app.post('/newsblur/start', (req, res) => {
  newsblur.oauthStart(req, res)
})

app.get('/newsblur/callback', catcher(async (req, res) => {
  await newsblur.oauthCallback(req, res)
}))

app.get('/newsblur/:username', catcher(async (req, res) => {
  await newsblur.handle(req, res)
}))

// These duplicate handlers in app.yaml. If you change them here, change them
// there too! Background:
// https://groups.google.com/d/topic/google-appengine/ywNrcyO1CFk/discussion
app.use('/public', express.static('public'));

module.exports = app
