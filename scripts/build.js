process.env.BABEL_ENV = 'production'
process.env.NODE_ENV = 'production'

const webpack = require('webpack')
const configFactory = require('../config/webpack.config')

let configured = false
module.exports = config => {
  config = configured ? config : [config, configFactory('production')]
  configured = true
  return webpack(config)
}
for (const k in webpack) module.exports[k] = webpack[k]

require.cache[require.resolve('webpack')] = require.cache[__filename]

if (require.main === module) require('react-scripts/scripts/build')
