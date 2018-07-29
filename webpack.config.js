const path = require('path');
const nodeExternals = require('webpack-node-externals');

var config = {
  externals: [nodeExternals()],
  entry: ['babel-polyfill', './src/index.js'],
  output: {
    path: path.join(__dirname, '/dist'),
    filename: 'index.js'
  },
  target: 'node',
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['shebang-loader', 'babel-loader']
      },
      {
        test: /\.json$/,
        use: 'json-loader'
      }
    ]
  }
};

module.exports = config;
