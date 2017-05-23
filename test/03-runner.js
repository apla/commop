var path   = require ('path');
var fs     = require ('fs');
var assert = require ('assert');

require ('./promise-shim');

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
		next (null, data);
	}, 10);
}

require.main.showPorts = function (cmdConf, data, next) {
	setTimeout (function () {
		data.aaa = "bbb";
		next (null, data);
	}, 10);
}

require.main.console = function (cmdConf, data, next) {
	setTimeout (function () {
		data.bbb = "ccc";
		next (null, data);
	}, 10);
}

require.main.compile = function (cmdConf, data) {
	return new Promise (function (resolve, reject) {
		setTimeout (function () {
			data.ccc = "ddd";
			resolve (data);
		}, 10);
	})
}

require.main.upload = function (cmdConf, data) {
	return new Promise (function (resolve, reject) {
		setTimeout (function () {
			data.ddd = "eee";
			resolve (data);
		}, 10);
	})
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
			assert ("bbb" in data, "task stored 'bbb' key in data");
			done();
		});
	});

	it ("multihandler with promises", function (done) {
		var cmd = optParser.start (["upload"], require.main, function (cmd, data) {
			assert ("aaa" in data, "task stored 'aaa' key in data");
			assert ("ccc" in data, "task stored 'ccc' key in data");
			assert ("ddd" in data, "task stored 'ddd' key in data");
			done();
		});
	});

	it ("multihandler with promises, returning promise", function () {
		return optParser.start (["upload"], require.main).then (function (result) {

			var cmd  = result.cmd;
			var data = result.data;

			assert ("aaa" in data, "task stored 'aaa' key in data");
			assert ("ccc" in data, "task stored 'ccc' key in data");
			assert ("ddd" in data, "task stored 'ddd' key in data");

			return Promise.resolve ();
		});
	});
});

// TODO: test flow key

describe (baseName+" launching command using shell expansion", function () {
	it ("have config", function (done) {

		var nodePath = process.argv[0];

		var testConfig2 = {
			options: {
				xxx: {type: "boolean"},
				BBB: {type: "string"},
				DDD: {type: "string"}
			},
			commands: {
				node: {
					script: nodePath + " -e 'console.log (process.argv)' AAA=${BBB} CCC=${DDD}",
					options: ["BBB", "DDD"]
				}
			}
		};
		testConfig2.ignoreUnknownCommands = true;
		var commop = new OptionParser (testConfig2);

		commop.start (["node", "--BBB", "123", "--DDD", "asdfg"], null, function (cmd, data) {
			assert (data.scriptStdout.match (/AAA=123/), "shell expansion ok");
			assert (data.scriptStdout.match (/CCC=asdfg/), "shell expansion 2 ok");
			done();
		});
	});
});

describe (baseName+" launching command using promise", function () {
	it ("have config", function () {

		var nodePath = process.argv[0];

		require.main.exports._p1 = Promise.resolve ({a: 123});
		require.main.exports._p2 = function (cmd, data) {
			return Promise.resolve (Object.assign (data, {b: 456}));
		}
		// require.main.exports._p2 = Promise.reject (new Error ("456"));

		var testConfig2 = {
			options: {},
			commands: {
				node: {
					run: [
						"_p1",
						"_p2"
					],
					// options: ["BBB", "DDD"]
				}
			}
		};
		testConfig2.ignoreUnknownCommands = true;
		var commop = new OptionParser (testConfig2);

		return commop.start (["node"], null)
	});
});
