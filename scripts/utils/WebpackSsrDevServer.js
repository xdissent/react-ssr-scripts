const Module = require('module')
const {resolve} = require('path')
const MemoryFileSystem = require('memory-fs')
const WebpackDevServer = require('webpack-dev-server')

module.exports = class WebpackSsrDevServer {
  constructor(ssrCompiler, webCompiler, options) {
    if (!ssrCompiler || !webCompiler) throw new Error('no compiler')
    if (
      (options == null || (options != null && !options.ssrEmitFiles)) &&
      !(ssrCompiler.outputFileSystem instanceof MemoryFileSystem)
    )
      ssrCompiler.outputFileSystem = new MemoryFileSystem()
    this.compiling = {}
    this.resolve = {}
    this.stats = {}
    this.compilers = {
      web: this.addHooks(webCompiler, 'web'),
      ssr: this.addHooks(ssrCompiler, 'ssr')
    }
    this.server = new WebpackDevServer(
      this.compilers.web,
      this.devServerOptions(options)
    )
  }

  devServerOptions({before, after, ...options}) {
    return {
      ...options,
      historyApiFallback: false,
      before: (app, server) => {
        this.before(app)
        if (typeof before === 'function') before(app, server)
      },
      after: (app, server) => {
        this.after(app)
        if (typeof after === 'function') after(app, server)
      }
    }
  }

  compilingHook(type) {
    return () => {
      if (this.compiling[type] == null)
        this.compiling[type] = new Promise(
          resolve => (this.resolve[type] = resolve)
        )
    }
  }

  compiledHook(type) {
    return stats => {
      this.stats[type] = stats
      this.compiling[type] = null
      this.resolve[type]()
    }
  }

  addHooks(compiler, type) {
    const {compile, invalid, done} = compiler.hooks
    compile.tap('webpack-ssr-server', this.compilingHook(type))
    invalid.tap('webpack-ssr-server', this.compilingHook(type))
    done.tap('webpack-ssr-server', this.compiledHook(type))
    return compiler
  }

  listen(...args) {
    return this.server.listen(...args)
  }

  close(...args) {
    if (this.watching == null) return this.server.close(...args)
    this.watching.then(
      watching => watching.close(() => this.server.close(...args)),
      () => this.server.close(...args)
    )
  }

  async watch() {
    if (this.watching != null) return this.watching
    return (this.watching = new Promise((resolve, reject) => {
      let resolved = false
      const watching = this.compilers.ssr.watch({}, err => {
        if (resolved) return
        resolved = true
        if (err) {
          this.watching = null
          return reject(err)
        }
        resolve(watching)
      })
    }))
  }

  async compile() {
    await this.watch()
    await this.compiling.web
    await this.compiling.ssr
  }

  before(app) {
    app.use(
      (req, res, next) => this.rewriteIndex(req, res, next),
      (req, res, next) => this.serveIndex(req, res, next)
    )
  }

  after(app) {
    app.use((req, res, next) => this.middleware(req, res, next))
  }

  rewriteIndex(req, res, next) {
    if (req.path.toLowerCase() === '/index.html')
      req.url = req.url.replace(/^\/index.html/i, '/')
    next()
  }

  serveIndex(req, res, next) {
    return req.path === '/' ? this.middleware(req, res, next) : next()
  }

  entrypointPath(stats) {
    return resolve(
      stats.compilation.mainTemplate.outputOptions.path,
      stats.compilation.entrypoints
        .get('main')
        .runtimeChunk.files.find(file => file.endsWith('.js'))
    )
  }

  loadSsrEntrypoint() {
    const path = this.entrypointPath(this.stats.ssr)
    const src = this.compilers.ssr.outputFileSystem.readFileSync(path, 'utf8')
    const mod = new Module()
    mod._compile(src, path)
    return mod.exports.default != null ? mod.exports.default : mod.exports
  }

  injectWebAssets(req, res, app) {
    res.locals = res.locals || {}
    res.locals.fs = this.compilers.web.outputFileSystem
    res.locals.webpackStats = this.stats.web
  }

  checkBundles() {
    if (this.stats.ssr == null) throw new Error('Ssr bundle not compiled')
    if (this.stats.web == null) throw new Error('Web bundle not compiled')
    if (this.stats.ssr.hasErrors()) throw new Error('Ssr bundle has errors')
    if (this.stats.web.hasErrors()) throw new Error('Web bundle has errors')
  }

  async middleware(req, res, next) {
    try {
      await this.compile()
      this.checkBundles()
      const app = this.loadSsrEntrypoint()
      this.injectWebAssets(req, res, app)
      app(req, res, next)
    } catch (err) {
      next(err)
    }
  }
}
