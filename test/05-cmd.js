var path   = require ('path');
var fs     = require ('fs');
var assert = require ('assert');

var parserModule = process.env.PARCLI ? "../parser/" + process.env.PARCLI : "../";

var OptionParser = require (parserModule);

var baseName = path.basename (__filename, path.extname (__filename));
// var testFile = path.join (__dirname, baseName + '.json');
var testFile = path.join (__dirname, 'cuwire-cli.json');

var testConfig = require (testFile);

var globalVerbose = process.env.VERBOSE || false;

var optParser = new OptionParser (testConfig);

describe (baseName+" parsing plain command", function () {

	it ("have config", function () {
		var cmd = optParser.findCommand (optParser.parse (["boards"]));
		assert ("config" in cmd, "have config in command");
	});

});

describe (baseName+" parsing command subtree", function () {

	it ("have config", function () {
		var cmd = optParser.findCommand (optParser.parse (["library", "refresh"]));
		assert ("config" in cmd, "have config in command");
		assert (cmd.config.flow === "refreshPackages", "proper flow selected");
	});

});

describe (baseName+" parsing command subtree with unexpected positional parameter", function () {

	it ("have config", function () {
		var cmd = optParser.findCommand (optParser.parse (["library", "xxx", "refresh"]));
		assert ("usage" in cmd, "show usage if don't have command to run");
	});

});

describe (baseName+" parsing command subtree with expected positional parameter", function () {
	it ("have config", function () {

		var testConfig2 = JSON.parse (JSON.stringify (testConfig));
		testConfig2.ignoreUnknownCommands = true;
		var optParser2 = new OptionParser (testConfig2);

		var cmd = optParser2.findCommand (optParser2.parse (["library", "xxx", "refresh"]));
		assert ("config" in cmd, "have config in command");
		assert (cmd.config.flow === "refreshPackages", "proper flow selected");
	});
});

describe (baseName+" parsing command subtree when parent contains run key", function () {
	it ("have config", function () {

		var cmd = optParser.findCommand (optParser.parse (["boards", "add"]));
		assert ("config" in cmd, "have config in command");
		assert (cmd.branch[0] === "boards", "parent branch is fine");
		assert (cmd.branch[1] === "add", "child branch is fine");
	});

});
