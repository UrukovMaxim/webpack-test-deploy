var autoprefixer = require('autoprefixer');

module.exports = {
	plugins: [
		autoprefixer({
			browsers: [
				'last 2 version',
				'ie >= 9',
				'Android >= 2.3',
				'> 0.5%'
			],
		})
	]
};