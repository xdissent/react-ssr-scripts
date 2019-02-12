process.env.BABEL_ENV = 'development'
process.env.NODE_ENV = 'development'

const webpack = require('webpack')
const WebpackSsrDevServer = require('./utils/WebpackSsrDevServer')
const configFactory = require('../config/webpack.config')

module.exports = class CraSsrServer extends WebpackSsrDevServer {
  constructor(webCompiler, options) {
    super(webpack(configFactory('development')), webCompiler, options)
  }
}

require.cache[require.resolve('webpack-dev-server')] = require.cache[__filename]

if (require.main === module) require('react-scripts/scripts/start')
