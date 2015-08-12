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
		console.log (cmd.branch);
	});

});

describe (baseName+" parsing command subtree", function () {

	it ("have config", function () {
		var cmd = optParser.findCommand (optParser.parse (["library"]));
		assert ("config" in cmd, "have config in command");
		// assert (cmd.config.flow === "refreshPackages", "proper flow selected");
		console.log (cmd);
	});

});
