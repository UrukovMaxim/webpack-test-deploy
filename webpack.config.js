var path = require('path');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var DirectoryNamedWebpackPlugin = require('directory-named-webpack-plugin');
var UglifyJSPlugin = require('uglifyjs-webpack-plugin')

/* Environment and Options params */
var NODE_ENV = process.env.NODE_ENV;
var isProduction = NODE_ENV === 'production';
var isDevelopment = NODE_ENV === 'development';

/* Path */
var srcPath = path.resolve(__dirname, './src');
var reactPath = path.resolve(__dirname, path.join('node_modules', 'react'));
var reactDOMPath = path.resolve(__dirname, path.join('node_modules', 'react-dom'));
var componentsFolderPath = path.resolve(__dirname, path.join('src', 'components'));
var pagesFolderPath = path.resolve(__dirname, path.join('src', 'pages'));
var stylesFolderPath = path.resolve(__dirname, path.join('src', 'styles'));
var utilityFolderPath = path.resolve(__dirname, path.join('src', 'utility'));

var webpackPlugins = [];
webpackPlugins.push(
  new webpack.NoEmitOnErrorsPlugin(),
  new webpack.DefinePlugin({
		NODE_ENV: JSON.stringify(NODE_ENV),
	  'process.env': {NODE_ENV: JSON.stringify(NODE_ENV)},
	}),
  new webpack.optimize.CommonsChunkPlugin({
    name: 'vendor',
    minChunks: 2
  })
);

var extractSass = new ExtractTextPlugin({
	filename: 'index.[contenthash].css',
	disable: isDevelopment,
	allChunks: true
});

if (isProduction) {
  webpackPlugins.push(
  	new UglifyJSPlugin({sourceMap: true}),
	  extractSass
  );
}

module.exports = {
	context: srcPath,
	entry: {
    'hotelsMapWidget': './HotelsMapWidget',
    'vendor': ['babel-polyfill', 'react', 'react-dom', './client']
	},
	output: {
		path: path.resolve(__dirname, 'bundle'),
		filename: isProduction ? '[name]-[chunkhash].js' : '[name].js',
    library: '[name]'
	},
	module: {
		rules: [{
			test: /\.jsx?$/,
      exclude: /node_modules/,
			use: [{loader: 'babel'}, {loader: 'cssModulesLoader'}]
    }, {
			test: /\.scss$/,
			use: isProduction ?
				extractSass.extract({
					use: ['css', 'resolve-url', 'sass', 'postcss']
				}) :
				['style', 'css', 'sass', 'postcss']
    }],
	},
	watch: isDevelopment,
	devtool: isProduction ? 'source-map' : 'eval',
	plugins: webpackPlugins,
	resolve: {
		alias: {
			react: reactPath,
			React: reactPath,
			'react-dom': reactDOMPath,
			'utility': utilityFolderPath
		},
		extensions: ['*', '.jsx', '.js', '.scss'],
		plugins: [new DirectoryNamedWebpackPlugin({exclude: /node_modules/})],
    modules: [componentsFolderPath, pagesFolderPath, stylesFolderPath, 'node_modules']
	},
	resolveLoader: {
		moduleExtensions: ['-loader'],
		modules: ['node_modules', path.resolve(__dirname, './webpack/loaders') ]
	},
	devServer: {
		contentBase: path.resolve(__dirname, 'bundle'),
		compress: true,
		port: 9000
	}
};