var fs = require('fs');
var EXT_PAT = /\.scss/g;
var STYLE_EXT = 'scss';
var path = require('path');
var chalk = require('chalk');
var loaders = process.env.NODE_ENV === 'production' ? '' : '!style!css?modules&importLoaders=2&localIdentName=[name]__[local]___[hash:base64:5]!sass!';

module.exports = function(source) {
	this.cacheable && this.cacheable();
	var componentFileName = this.resourcePath.match(/[^\/]+$/)[0];
	if (process.env.START_WIN) {
		componentFileName = this.resourcePath.match(/[^\\]+$/)[0];
	}
	var componentExt = componentFileName.match(/\.(.+)$/)[1];
	var styleFileName = componentFileName.replace(componentExt, STYLE_EXT);
	var stylePath = this.resourcePath.replace(new RegExp(componentExt+'$'), STYLE_EXT);
	try {
		var stats = fs.statSync(stylePath);

		if (stats.isFile()) {
			if (source.match(/CSSModules/g)) {
				return source;
			}

			var requirePartString = "var CSSModules = require('utility/reactCssModules');\n var __styles = require('" + loaders + "./";

			source = requirePartString + styleFileName + "'); \n" + source;

			var CSS_MODULES_PAT = new RegExp('(class '+ styleFileName.replace(EXT_PAT, '') +'(?: extends (.+)|) {)[^A-Za-z0-9_]', 'g')

			source = source.replace(CSS_MODULES_PAT, '@CSSModules(__styles, {allowMultiple: true, errorWhenNotFound: false})\n$1');

			return source
		}
	} catch(e) {
		// console.log(chalk.red('ERROR in cssModulesDecorator --> ' + e));
	}

	return source;
};