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

describe (baseName+" parse command's options", function () {
	it ("have only defined options", function () {
		var cmd = optParser.findCommand (["upload", "--port", "/dev/cuXXX"]);
		assert ("port" in cmd.options, "have a port option");

		cmd = optParser.findCommand (["compile", "--port", "/dev/cuXXX"]);
		assert (!("port" in cmd.options), "don't have a port option");
	});
});

describe (baseName+" parse command's options with conflicts", function () {
	it ("have only defined options", function () {
		var cmd = optParser.findCommand (["console", "--port", "/dev/cuXXX", "--board", "uno"]);

		assert (!("port" in cmd.options), "port unexpectedly defined");
		assert (!("board" in cmd.options), "board unexpectedly defined");

		assert ("port" in cmd.failedOptions, "port conficts with board");
		assert (cmd.failedOptions.port === "conflict", "port conflict");
		assert ("board" in cmd.failedOptions, "board conficts with port");
		assert (cmd.failedOptions.board === "conflict", "board conflict");
	});
});

describe (baseName+" parse command with required option", function () {
	it ("have error when all required options not present", function () {
		var cmd = optParser.findCommand (["console"]);

		assert (!("port" in cmd.options), "port missing");
		assert (!("board" in cmd.options), "board missing");

		assert ("port" in cmd.failedOptions, "port missing");
		assert (cmd.failedOptions.port === "required", "port missing");
		assert ("board" in cmd.failedOptions, "board missing");
		assert (cmd.failedOptions.board === "required", "board missing");
	});

	it ("have error when required option not present", function () {
		var cmd = optParser.findCommand (["compile"]);

		assert (!("board" in cmd.options), "board missing");

		assert ("board" in cmd.failedOptions, "board missing");
		assert (cmd.failedOptions.board === "required", "board missing");
	});

	it ("have options when option present", function () {
		var cmd = optParser.findCommand (["compile", "--board", "uno"]);

		assert (!("board" in cmd.failedOptions), "board not failed");

		assert ("board" in cmd.options, "board present");
	});
});


describe (baseName+" parse mutually exclusive required options", function () {
	it ("have only defined options", function () {
		var cmd = optParser.findCommand (["console", "--board", "uno"]);
		// console.log (cmd, cmd.config.options);
		assert ("board" in cmd.options, "board option defined");
		assert (!("port" in cmd.failedOptions), "port option not failed");
	});
	it ("have only defined options", function () {
		var cmd = optParser.findCommand (["console", "--port", "/dev/cuXXX"]);
		assert ("port" in cmd.options, "port option defined");
		assert (!("board" in cmd.failedOptions), "board option not failed");
	});
});

describe (baseName+" parse aliased options", function () {
	it ("have only defined options", function () {
		var cmd = optParser.findCommand (["console", "-b", "uno", "-A", "/Applications/Arduino.app"]);
		assert ("board" in cmd.options, "board option defined");
		assert ("arduino" in cmd.options, "arduino option defined");
	});
});

describe (baseName+" parse nothing", function () {
	it ("have usage", function () {
		var cmd = optParser.findCommand ([]);

		assert (!("options" in cmd), "options not exists in cmd");
		assert ("usage" in cmd, "usage defined in cmd");
	});
});

describe (baseName+" parse command with env", function () {
	it ("have options from argv", function () {
		var envMode = optParser.config.envMode;
		optParser.config.envMode = "fallback";
		process.env.ARDUINO_APP = "xxx";
		var cmd = optParser.findCommand (["boards", "-A", "yyy"]);

		assert ("options" in cmd, "options exists in cmd");
		assert (cmd.options.arduino === "yyy", "using option value in fallback mode");

		delete process.env.ARDUINO_APP;
		optParser.config.envMode = envMode;
	});

	it ("have options from env", function () {
		var envMode = optParser.config.envMode;
		optParser.config.envMode = "fallback";
		process.env.ARDUINO_APP = "xxx";
		var cmd = optParser.findCommand (["boards"]);

		assert ("options" in cmd, "options exists in cmd");
		assert (cmd.options.arduino === "xxx", "using option value in fallback mode");

		delete process.env.ARDUINO_APP;
		optParser.config.envMode = envMode;
	});

	it ("have options overriden", function () {
		var envMode = optParser.config.envMode;
		optParser.config.envMode = "override";
		process.env.ARDUINO_APP = "xxx";
		var cmd = optParser.findCommand (["boards", "-A", "yyy"]);

		assert ("options" in cmd, "options exists in cmd");
		assert (cmd.options.arduino === "xxx", "using env value in override mode");

		delete process.env.ARDUINO_APP;
		optParser.config.envMode = envMode;
	});
});
