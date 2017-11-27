var path = require('path');
var webpack = require('webpack');
var DirectoryNamedWebpackPlugin = require('directory-named-webpack-plugin');
var UglifyJSPlugin = require('uglifyjs-webpack-plugin')
var NODE_ENV = process.env.NODE_ENV;
var isProduction = NODE_ENV === 'production';
var isDevelopment = NODE_ENV === 'development';
var srcPath = path.resolve(__dirname, './src');
var webpackPlugins = [];

webpackPlugins.push(
  new webpack.NoEmitOnErrorsPlugin(),
  new webpack.DefinePlugin({
		NODE_ENV: JSON.stringify(NODE_ENV)
	}),
  new webpack.optimize.CommonsChunkPlugin({
    name: 'vendor',
    minChunks: 2
  })
);

if (isProduction) {
  webpackPlugins.push(new UglifyJSPlugin({sourceMap: true}));
}

module.exports = {
	context: srcPath,
	entry: {
    'hotelsMapWidget': './HotelsMapWidget',
    'hotelsSearchWidget': './HotelsSearchWidget',
    'vendor': ['babel-polyfill', 'react', 'react-dom', './client']
	},
	output: {
		path: path.resolve(__dirname, 'bundle'),
		filename: isProduction ? '[name]-[chunkhash].js' : '[name].js',
    library: '[name]'
	},
	module: {
		rules: [
			{
				test: /\.jsx?$/,
        exclude: /node_modules/,
				use: [{loader: 'babel'}]
      }
		],
	},
	watch: isDevelopment,
	devtool: isProduction ? 'cheap-module-source-map' : 'eval',
	plugins: webpackPlugins,
	resolve: {
		extensions: ['*', '.jsx', '.js'],
		plugins: [new DirectoryNamedWebpackPlugin(true)],
    modules: [path.resolve(__dirname, 'src/components'), 'node_modules']
	},
	resolveLoader: {
		moduleExtensions: ['-loader']
	}
};