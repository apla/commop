var util = require ("util");

var yargs = require ('yargs');

var ArgvParser = require ("./base");

function YargsParser (config) {

	/* if you want to implement new parser, you should call init */
	this.init (config);

	return;

	var yargsOptions = this.getOptions ();
	var commands = [];
	for (var optName in config) {
		if (!config[optName].description)
			continue;
		config[optName].run
			? commands.push ("   " + optName + "\t" + config[optName].description)
		: yargsOptions[optName] = config[optName];
	}

	yargs.usage (
		config.help.banner.concat (commands.sort()).join ("\n"),
		yargsOptions
	);

	yargs.help ('help', config.help.description);


}

util.inherits (YargsParser, ArgvParser);

YargsParser.prototype.launchParser = function (argv) {

	var options = yargs.parse (argv);

	this.cleanupAliases (options);
	this.fillOptionsFromEnv (options);

	return options;
}

module.exports = YargsParser;
