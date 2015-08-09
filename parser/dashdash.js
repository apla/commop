var util = require ("util");

var dashdash = require ("dashdash");

var ArgvParser = require ("./base");

var typeConversion = {
	"boolean": "bool"
};

function DashDashParser (config) {

	this.config = config;

	var argvOptions = this.getOptions ();

	// translate options:
	// option name + aliases => names: ['file', 'f'],       // Required (or `name`).
	// type => type: 'string',             // Required.
	// env => env: 'MYTOOL_FILE',
	// description => help: 'Config file to load before running "mytool"',
	// NOT TRANSLATED: helpArg: 'PATH',
	// NOT TRANSLATED: helpWrap: false,
	// default => default: path.resolve(process.env.HOME, '.mytoolrc')

	var dashDashOpts = [];

	for (var opt in argvOptions) {

		dashDashOpts.push ({
			names:     [opt],
			type:      typeConversion[argvOptions[opt].type] || argvOptions[opt].type,
			env:       argvOptions[opt].env,
			"default": argvOptions[opt].default,
			help:      argvOptions[opt].description
		});
		var optConf = dashDashOpts[dashDashOpts.length - 1];

		if ("alias" in argvOptions[opt]) {
			if (argvOptions[opt].alias.forEach) {
				argvOptions[opt].alias.forEach (function (aliasName) {
					optConf.names.push (aliasName);
				});
			} else {
				optConf.names.push (argvOptions[opt].alias);
			}
		}
	}

	this.dashDashOptions = dashDashOpts;

	this.config = config;

}

util.inherits (DashDashParser, ArgvParser);

DashDashParser.prototype.parse = function (argv) {

	if (!argv)
		argv = process.argv.slice (2);

	var parser = dashdash.createParser({
		options: this.dashDashOptions,
		// if false, dashdash will throw errors, other parsers also set up to ignore unknown
		allowUnknown: true,
	});
	try {
		var options = parser.parse ({argv: argv, slice: 0});
	} catch (e) {
		console.error('foo: error: %s', e.message);
		process.exit(1);
	}

	// dashdash also return argv order
	// _order: [ { key: 'timeout', value: 5000, from: 'env' } ],

	var order = options._order;
	delete options._order;

	options._ = options._args.filter (function (arg) {return arg === "--" ? true : !arg.match(/^-{1,2}/)});
	delete options._args;

	return options;
}

module.exports = DashDashParser;
