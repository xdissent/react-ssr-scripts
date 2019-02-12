import {resolve} from 'path'

export default (req, res, next) => {
  if (req.method !== 'GET') return next()
  res.writeHead(200, {'Content-Type': 'text/html'})
  res.end(
    res.locals.fs.readFileSync(
      resolve(res.locals.webpackStats.toJson().outputPath, 'index.html'),
      'utf8'
    )
  )
}
