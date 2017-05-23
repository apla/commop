var nodeVer = process.version.substr (1).split ('.');

if (nodeVer[0] < 4) {
	global.Promise = require ('bluebird');
	Object.assign  = require ('object-assign');
}
