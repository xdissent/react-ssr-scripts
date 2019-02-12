const {resolve} = require('path')
const {execSync} = require('child_process')
const os = require('os')
const fs = require('fs')
const init = require('react-scripts/scripts/init')

const COMMIT_MSG = 'Initial commit from Create React App'

module.exports = (appPath, appName, verbose, originalDirectory, template) => {
  init(appPath, appName, verbose, originalDirectory, template)
  const templatePath = resolve(__dirname, '../template')
  fs.copyFileSync(
    resolve(templatePath, 'server.js'),
    resolve(appPath, 'server.js')
  )
  fs.copyFileSync(
    resolve(templatePath, 'src/server.js'),
    resolve(appPath, 'src/server.js')
  )
  const appPackagePath = resolve(appPath, 'package.json')
  const appPackage = require(appPackagePath)
  appPackage.scripts = {
    start: 'react-ssr-scripts start',
    build: 'react-ssr-scripts build',
    test: 'react-ssr-scripts test',
    eject: 'react-ssr-scripts eject'
  }
  fs.writeFileSync(appPackagePath, JSON.stringify(appPackage, null, 2) + os.EOL)
  let didGit = false
  try {
    didGit =
      execSync('git log -1 --pretty=format:%s', {
        stdio: ['ignore', 'pipe', 'ignore'],
        encoding: 'utf8'
      }).trim() === COMMIT_MSG
  } catch (err) {}
  if (!didGit) return
  try {
    execSync('git add -A', {stdio: 'ignore'})
    execSync(`git commit --amend -m "${COMMIT_MSG}"`, {
      stdio: 'ignore'
    })
  } catch (err) {}
}
