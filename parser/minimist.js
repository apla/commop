var util = require ("util");

var minimist = require ("../lib/minimist");

var ArgvParser = require ("./base");

function MiniParser (config) {

	this.config = config;

	this.optionConfig = config.options;

	this.commandConfig = config.commands;

	var argvOptions = this.getOptions ();

	var booleans = [];
	var defaults = {};
	var aliases  = {};

	for (var opt in argvOptions) {
		if (argvOptions[opt].type === "boolean") {
			booleans.push (opt);
		}
		if ("default" in argvOptions[opt]) {
			defaults[opt] = argvOptions[opt]["default"];
		}
		if ("alias" in argvOptions[opt]) {

			if (argvOptions[opt].alias.forEach) {
				argvOptions[opt].alias.forEach (function (aliasName) {
					aliases[aliasName] = opt;
				});
			} else {
				aliases[argvOptions[opt].alias] = opt;
			}
		}
	}

	this.miniOptions = {
		boolean: booleans,
		"default": defaults,
		alias: aliases
	};

	this.config = config;

}

util.inherits (MiniParser, ArgvParser);

MiniParser.prototype.launchParser = function (argv) {

	var options = minimist (argv, this.miniOptions);

	this.cleanupAliases (options);
	this.fillOptionsFromEnv (options);

	return options;
}

module.exports = MiniParser;
