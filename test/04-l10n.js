var path   = require ('path');
var fs     = require ('fs');
var assert = require ('assert');
var util   = require ('util');

var parserModule = process.env.COMMOP_PARSER ? "../parser/" + process.env.COMMOP_PARSER : "../";

var OptionParser = require (parserModule);

var baseName = path.basename (__filename, path.extname (__filename));
// var testFile = path.join (__dirname, baseName + '.json');
var testFile = path.join (__dirname, 'cuwire.json');

var testConfig = {
	options: {
		verbose: {global: true, type: "boolean", description: "be verbose"},
		opt1: {type: "boolean", description: "opt1"}, // XXX: it is fine to have some options non-localized?
		opt2: {type: "boolean", description: "opt2"},
		opt3: {type: "boolean", description: "opt3"},
	},
	commands: {
		cmd: {description: "cmd to run", run: "runCmd", options: {
			opt1: {"conflicts": "opt2"},
			opt2: null,
			opt3: {"required": true}
		}},
		cmdtree: {
			description: "cmd with subcommands",
			sub: {
				"cmd": {description: "cmd from subtree to run", run: "runCmd"}
			}
		},
		hidden: {run: "justTest"}
	},
	usage: [
		"testbannertest"
	]
};

function L10NParser (config) {
	OptionParser.apply (this, arguments);
}

util.inherits (L10NParser, OptionParser);

var globalVerbose = process.env.VERBOSE || false;

L10NParser.l10nMessage = {
	optionConflict: "aaa", // "option %s conflicts with %s",
	optionConfMissing: "bbb", // "unexpected option '%s'",
	commandDefinedAsOption: "ccc", // "found command '%s', but in configuration '%s' defined as an option",
	commandHandlerMissing: "ddd", // "command '%s' doesn't contain 'run', 'flow' or 'script' key to define code to handle command",
	commandSubMissing: "eee", // "command '%s' doesn't contain 'sub' key to define subcommand for %s",
	globalOptions: "fff", // "Global options:",
	commands: "ggg", // "Commands",
}

L10NParser.l10nDescription = {
	verbose: "xxx",
	cmd: "yyy",
	"cmdtree.cmd": "zzz"
}

var optParser = new L10NParser (testConfig);

describe (baseName+" parse empty argv", function () {

	it ("for usage", function () {
		var cmd = optParser.findCommand ([]);

		assert ("usage" in cmd, "have usage");
		// console.log (cmd.usage);
		assert (cmd.usage.match (L10NParser.l10nMessage.globalOptions), "have l10n for 'global options' message");
		assert (cmd.usage.match (L10NParser.l10nMessage.commands), "have l10n for 'commands' message");
		assert (cmd.usage.match (L10NParser.l10nDescription.verbose), "have l10n for 'verbose' option description");
		assert (cmd.usage.match (L10NParser.l10nDescription.cmd), "have l10n for 'cmd' command description");
		assert (!cmd.usage.match ("hidden"), "don't have command without description in usage");
		assert (cmd.usage.match (testConfig.usage[0]), "with usage prologue");

		assert (!cmd.usage.match (testConfig.options.opt1.description), "don't have description for option opt1");
		assert (!cmd.usage.match (testConfig.options.opt2.description), "don't have description for option opt2");
		assert (!cmd.usage.match (testConfig.options.opt3.description), "don't have description for option opt3");
	});
});

// TODO: add test for help <something>

describe (baseName+" parse help command", function () {

	it ("with config errors", function () {
		var help = optParser.helpForCommand (["cmd"]);

		// console.log (help);

		assert (help.match (L10NParser.l10nMessage.globalOptions), "have l10n for 'global options' message");
		assert (!help.match (L10NParser.l10nMessage.commands), "don't have l10n for 'commands' message");
		assert (help.match (L10NParser.l10nMessage.command), "have l10n for 'command' message");
		assert (help.match (L10NParser.l10nDescription.verbose), "have l10n for 'verbose' option description");

		assert (help.match (testConfig.options.opt1.description), "have description for option opt1");
		assert (help.match (testConfig.options.opt2.description), "have description for option opt2");
		assert (help.match (testConfig.options.opt3.description), "have description for option opt3");
	});

	it ("with config errors", function () {
		var help = optParser.helpForCommand (["cmdtree"]);

		// console.log (help);

		assert (help.match (L10NParser.l10nMessage.globalOptions), "have l10n for 'global options' message");
		assert (!help.match (L10NParser.l10nMessage.commands), "don't have l10n for 'commands' message");
		assert (help.match (L10NParser.l10nDescription.verbose), "have l10n for 'verbose' option description");

		assert (help.match (L10NParser.l10nDescription["cmdtree.cmd"]), "have l10n for 'cmdtree.cmd' command description");

		assert (help.match (optParser.l10nMessage ("subCommands")), "have l10n for 'subCommands' message");

		// assert (help.match (testConfig.usage[0]), "with usage prologue");

		// console.log (cmd);

	});
});
