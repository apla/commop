var path   = require ('path');
var fs     = require ('fs');
var assert = require ('assert');

var MiniParser = require ('../parser/minimist');

var baseName = path.basename (__filename, path.extname (__filename));
// var testFile = path.join (__dirname, baseName + '.json');
var testFile = path.join (__dirname, 'cuwire.json');

var testConfig = require (testFile);

var globalVerbose = process.env.VERBOSE || false;

var optParser = new MiniParser (testConfig);

describe (baseName+" parse global options regardless of context", function () {

	it ("have global boolean options", function () {
		var cmd = optParser.findCommand (optParser.parse (["boards"]));
		assert ("verbose" in cmd.options, "have verbose global option");

		cmd = optParser.findCommand (optParser.parse (["compile", "--board", "uno", "--verbose"]));
		assert ("verbose" in cmd.options, "have verbose global option");
	});

	it ("have global option if that option is provided", function () {
		var cmd = optParser.findCommand (optParser.parse (["boards"]));
		assert (!("arduino" in cmd.options), "don't have arduino global option");

		cmd = optParser.findCommand (optParser.parse (["boards", "-A", "/Applications/Arduino.app"]));
		assert ("arduino" in cmd.options, "have arduino global option");

		cmd = optParser.findCommand (optParser.parse (["compile", "--board", "uno", "-A", "/Applications/Arduino.app"]));
		assert ("arduino" in cmd.options, "have arduino global option");
	});

});

describe (baseName+" parse global options (simplified interface)", function () {

	it ("have global boolean options", function () {
		var cmd = optParser.findCommand (["boards"]);
		assert ("verbose" in cmd.options, "have verbose global option");

		cmd = optParser.findCommand (["compile", "--board", "uno", "--verbose"]);
		assert ("verbose" in cmd.options, "have verbose global option");
	});

	it ("have global option if that option is provided", function () {
		var cmd = optParser.findCommand (["boards"]);
		assert (!("arduino" in cmd.options), "don't have arduino global option");

		cmd = optParser.findCommand (["compile", "--board", "uno", "-A", "/Applications/Arduino.app"]);
		assert ("arduino" in cmd.options, "have arduino global option");
	});

});

describe (baseName+" parse command options", function () {
	it ("have only defined options", function () {
		var cmd = optParser.findCommand (["upload", "--port", "/dev/cuXXX"]);
		assert ("port" in cmd.options, "have a port option");

		cmd = optParser.findCommand (["compile", "--port", "/dev/cuXXX"]);
		assert (!("port" in cmd.options), "don't have a port option");
	});
});

describe (baseName+" parse command options with conflicts", function () {
	it ("have only defined options", function () {
		var cmd = optParser.findCommand (["console", "--port", "/dev/cuXXX", "--board", "uno"]);
		console.log (cmd);
		assert ("port" in cmd.failedOptions, "port conficts with board");
		assert ("board" in cmd.failedOptions, "board conficts with port");

	});
});

describe (baseName+" parse aliased options", function () {
	it ("have only defined options", function () {
		var cmd = optParser.findCommand (["console", "-b", "uno", "-A", "/Applications/Arduino.app"]);
		assert ("board" in cmd.options, "board option defined");
		assert ("arduino" in cmd.options, "arduino option defined");
	});
});
