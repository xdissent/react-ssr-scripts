const {resolve} = require('path')
const nodeExternals = require('webpack-node-externals')
const paths = require('react-scripts/config/paths')
const configFactory = require('react-scripts/config/webpack.config')
const babelPresetReactApp = require('babel-preset-react-app')
const babelPresetReactAppDeps = require('babel-preset-react-app/dependencies')

const babelPreset = isDeps => api => {
  const config = isDeps
    ? babelPresetReactAppDeps(api, {helpers: false})
    : babelPresetReactApp(api, {helpers: false})
  const {
    plugins,
    presets: [env, ...presets]
  } = config
  return {
    ...config,
    presets: [
      [
        env[0],
        {
          targets: {node: 'current'},
          modules: 'cjs'
        }
      ],
      ...presets
    ],
    plugins: [
      ...plugins,
      isDeps
        ? require('babel-plugin-transform-dynamic-import').default
        : require('babel-plugin-dynamic-import-node')
    ]
  }
}

const babelLoaderRule = rule => ({
  ...rule,
  options: {
    ...rule.options,
    cacheIdentifier: rule.options.cacheIdentifier + '-ssr',
    presets: [[babelPreset(!!rule.exclude)]]
  }
})

const moduleRules = rules =>
  rules.map(rule =>
    'oneOf' in rule
      ? {
          oneOf: rule.oneOf.map(rule =>
            rule.loader && rule.loader.includes('babel-loader')
              ? babelLoaderRule(rule)
              : rule
          )
        }
      : rule
  )

module.exports = webpackEnv => {
  const config = configFactory(webpackEnv)
  return {
    ...config,
    target: 'node',
    name: 'server',
    entry: [require.resolve(resolve(paths.appSrc, 'server'))],
    output: {
      ...config.output,
      filename: 'server/js/[name].js',
      chunkFilename: 'server/js/[name].chunk.js',
      libraryTarget: 'umd'
    },
    optimization: {},
    externals: (ctx, req, done) =>
      ctx.startsWith(paths.appNodeModules)
        ? done(
            null,
            `commonjs ${resolve(ctx, req).replace(
              `${paths.appNodeModules}/`,
              ''
            )}`
          )
        : nodeExternals({whitelist: [/\.css$/]})(ctx, req, done),
    module: {
      ...config.module,
      rules: moduleRules(config.module.rules)
    },
    plugins: [],
    node: undefined
  }
}
