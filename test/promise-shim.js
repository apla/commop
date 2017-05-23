if (typeof Promise === 'undefined') {
	process.global.Promise = require ('bluebird');
}
