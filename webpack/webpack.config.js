var path = require('path');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var DirectoryNamedWebpackPlugin = require('directory-named-webpack-plugin');
var UglifyJSPlugin = require('uglifyjs-webpack-plugin')
var HtmlWebpackPlugin = require('html-webpack-plugin');

/* Environment and Options params */
var NODE_ENV = process.env.NODE_ENV;
var isProduction = NODE_ENV === 'production';
var isDevelopment = NODE_ENV === 'development';

/* Path */
var rootPath = path.join(__dirname, '..');
var srcPath = path.resolve(rootPath, './src');
var reactPath = path.resolve(rootPath, path.join('node_modules', 'react'));
var reactDOMPath = path.resolve(rootPath, path.join('node_modules', 'react-dom'));
var componentsFolderPath = path.resolve(rootPath, path.join('src', 'components'));
var pagesFolderPath = path.resolve(rootPath, path.join('src', 'pages'));
var stylesFolderPath = path.resolve(rootPath, path.join('src', 'styles'));
var utilityFolderPath = path.resolve(rootPath, path.join('src', 'utility'));

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
  }),
	new HtmlWebpackPlugin({
		template: path.resolve(rootPath, './src/index.html'),
		filename: 'ru.html'
	})
);

var extractSass = new ExtractTextPlugin({
	filename: 'index.[contenthash].css',
	disable: isDevelopment,
	allChunks: true
});

var uglifyPlugin = new UglifyJSPlugin({
	sourceMap: true
});

var scssLoaders = [
	{
		loader: 'css',
		options: {
			sourceMap: true,
			modules: true,
			localIdentName: isProduction ? '[hash:base64:5]' : '[name]_[hash:base64:5]'
		}
	}, {
		loader: 'resolve-url'
	}, {
		loader: 'sass',
		options: {
			sourceMap: true,
			includePaths: [stylesFolderPath]
		}
	}, {
		loader: 'postcss'
	}
];

if (isDevelopment) {
	scssLoaders.unshift({
		loader: 'style'
	});
}

if (isProduction) {
  webpackPlugins.push(
	  uglifyPlugin,
	  extractSass
  );
}

module.exports = {
	context: srcPath,
	entry: {
    'hotelsMapWidget': './HotelsMapWidget',
    'vendor': ['babel-polyfill', 'react', 'react-dom', './client.js']
	},
	output: {
		path: path.resolve(rootPath, 'bundle'),
		publicPath: '/',
		filename: isProduction ? '[name]-[chunkhash].js' : '[name].js',
    library: '[name]'
	},
	module: {
		rules: [{
			test: /\.jsx?$/,
			exclude: [/node_modules(\\|\/)((?!@ott)|(@ott.*(?=lib)))/],
			use: [{loader: 'babel'}, {loader: 'cssModulesLoader'}]
    }, {
			test: /\.scss$/,
			use: isProduction ? extractSass.extract({use: scssLoaders}) : scssLoaders
    }, {
			test: /\.css?$/,
			exclude: /node_modules/,
			use: ['style', 'css']
		}]
	},
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
    modules: [componentsFolderPath, pagesFolderPath, 'node_modules']
	},
	resolveLoader: {
		moduleExtensions: ['-loader'],
		modules: ['node_modules', path.resolve(rootPath, './webpack/loaders') ]
	}
};