var path   = require ('path');
var fs     = require ('fs');
var assert = require ('assert');

var parserModule = process.env.COMMOP_PARSER ? "../parser/" + process.env.COMMOP_PARSER : "../";

var OptionParser = require (parserModule);

var baseName = path.basename (__filename, path.extname (__filename));
// var testFile = path.join (__dirname, baseName + '.json');
var testFile = path.join (__dirname, 'cuwire-cli.json');

var testConfig = require (testFile);

var globalVerbose = process.env.VERBOSE || false;

var optParser = new OptionParser (testConfig);

require.main = require.main || {};

require.main.arduino = function (cmdConf, data, next) {
	setTimeout (function () {
		data.arduino = true;
		next ();
	}, 10);
}

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


describe (baseName+" execute command with", function () {

	it ("no handler", function (done) {
		optParser.showUsage = false;
		var cmd = optParser.start ([], require.main, function (cmd, data) {
			assert ("usage" in cmd, "no handler for no command, can display usage");
			optParser.showUsage = true;
			done();
		});
	});

	it ("single handler", function (done) {
		var cmd = optParser.start (["ports"], require.main, function (cmd, data) {
			assert ("aaa" in data, "task stored 'aaa' key in data");
			done();
		});
	});

	it ("multihandler", function (done) {
		var cmd = optParser.start (["console"], require.main, function (cmd, data) {
			assert ("aaa" in data, "task stored 'aaa' key in data");
			assert ("aaa" in data, "task stored 'bbb' key in data");
			done();
		});
	});
});



// TODO: test script and flow keys
