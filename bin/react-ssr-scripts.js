#!/usr/bin/env node
const {dirname} = require('path')
const scripts = dirname(require.resolve('react-scripts/scripts/build'))
const ssrScripts = dirname(require.resolve('../scripts/build'))
const spawn = require('react-dev-utils/crossSpawn')
const sync = spawn.sync
spawn.sync = (cmd, args, opts) =>
  sync(cmd, args.map(arg => arg.replace(scripts, ssrScripts)), opts)
require('react-scripts/bin/react-scripts')
