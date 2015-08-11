var path   = require ('path');
var fs     = require ('fs');
var assert = require ('assert');

var parserModule = process.env.PARCLI ? "../parser/" + process.env.PARCLI : "../";

var OptionParser = require (parserModule);

var baseName = path.basename (__filename, path.extname (__filename));
// var testFile = path.join (__dirname, baseName + '.json');
var testFile = path.join (__dirname, 'cuwire.json');

var testConfig = require (testFile);

var globalVerbose = process.env.VERBOSE || false;

var optParser = new OptionParser (testConfig);

require.main = require.main || {};

require.main.showPorts = function (cmdConf, data, next) {
	setTimeout (function () {
		data.aaa = "bbb";
		next ();
	}, 10);
}

require.main.console = function (cmdConf, data, next) {
	setTimeout (function () {
		data.bbb = "ccc";
		next ();
	}, 10);
}


describe (baseName+" execute command handler", function () {

	it ("single handler", function (done) {
		var cmd = optParser.launch (["ports"], require.main, function (data) {
			assert ("aaa" in data, "task stored 'aaa' key in data");
			done();
		});
	});

	it ("multihandler", function (done) {
		var cmd = optParser.launch (["console"], require.main, function (data) {
			assert ("aaa" in data, "task stored 'aaa' key in data");
			assert ("aaa" in data, "task stored 'bbb' key in data");
			done();
		});
	});
});

// TODO: test script and flow keys
