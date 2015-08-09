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

describe (baseName+" parse global flags regardless of context", function () {

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

describe (baseName+" parse global flags regardless of context", function () {

	it ("have global boolean options", function () {
		var cmd = optParser.findCommand (optParser.parse (["boards"]));
		assert ("verbose" in cmd.options, "have verbose global option");

		cmd = optParser.findCommand (optParser.parse (["compile", "--board", "uno", "--verbose"]));
		assert ("verbose" in cmd.options, "have verbose global option");
	});

	it ("have global option if that option is provided", function () {
		var cmd = optParser.findCommand (optParser.parse (["boards"]));
		assert (!("arduino" in cmd.options), "don't have arduino global option");

		cmd = optParser.findCommand (optParser.parse (["compile", "--board", "uno", "-A", "/Applications/Arduino.app"]));
		assert ("arduino" in cmd.options, "have arduino global option");
	});

});
