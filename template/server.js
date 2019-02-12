'use strict'

const {resolve} = require('path')
const fs = require('fs')
const {createServer} = require('http')
const express = require('express')

const outputPath = resolve(__dirname, 'build')
const app = require(resolve(outputPath, 'server/js/main.js')).default
const statsJson = {outputPath}
const webpackStats = {toJson: () => statsJson}
const locals = {fs, webpackStats}

module.exports = express().use(
  express.static(outputPath, {index: false}),
  (req, res, next) => {
    res.locals = locals
    app(req, res, next)
  }
)

if (require.main === module) createServer(module.exports).listen(3000)
