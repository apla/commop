var util = require ("util");

/**
 * Generic parser class for argv
 * @class
 * @param {Object} config commands and options
 */
function ArgvParser (config) {

	/* if you want to implement new parser, you should include code below */
	this.config = config;

	this.optionConfig = config.options;

	this.commandConfig = config.commands;

}

ArgvParser.l10nMessage = {
	optionConflict: "option '%s' conflicts with '%s'",
	optionConfMissing: "unexpected option '%s'",
	commandDefinedAsOption: "found command '%s', but in configuration '%s' defined as an option",
	commandHandlerMissing: "command '%s' doesn't contain 'run', 'flow' or 'script' key to define code to handle command",
	commandSubMissing: "command '%s' doesn't contain 'sub' key to define subcommand for %s",
	globalOptions: "Global options:",
	commands: "Commands",
	taskError: "task '%s' error:",
};

/**
 * Gather all option configurations from config
 */
ArgvParser.prototype.getOptions = function () {
	var options = {};

	for (var k in this.optionConfig) {
		var optsConf = this.optionConfig[k];
		if ("type" in optsConf && "description" in optsConf) {
			// seems like parameter to me
			options[k] = optsConf;
		}
	}

	return options;
}

ArgvParser.prototype.l10nMessage = function (str) {
	if (this.constructor.l10nMessage && this.constructor.l10nMessage[str]) {
		return this.constructor.l10nMessage[str];
	} else if (ArgvParser.l10nMessage[str]) {
		return ArgvParser.l10nMessage[str];
	} else {
		return "l10n message:"+str
	}
}

ArgvParser.prototype.l10nDescription = function (str, description) {
	if (this.constructor.l10nDescription && this.constructor.l10nDescription[str]) {
		return this.constructor.l10nDescription[str];
	} else if (ArgvParser.l10nDescription && ArgvParser.l10nDescription[str]) {
		return ArgvParser.l10nDescription[str];
	} else {
		return description
	}
}

/**
 * Checks if the command exists in configuration
 * @param   {Object}  cmd     Command object to fill
 * @param   {String}  cmdName String from argv pretending to be a command
 * @param   {Number}  idx     Index of that string in argv remains
 * @param   {Array}   cmdList argv remains after option parsing
 * @returns {Boolean} true if processing finished, actual command is stored in {@link cmd cmd property}}
 */
ArgvParser.prototype.commandExists = function (cmd, cmdName, idx, cmdList) {
	// check if command exists in config

	var cmdConf;
	if (cmd.config && cmd.config.sub && cmd.config.sub[cmdName]) {
		cmdConf = cmd.config.sub[cmdName];
	} else if (this.commandConfig[cmdName]) {
		cmdConf = this.commandConfig[cmdName];
	} else {
		// TODO: add ignoreUnknownCommands config key to the docs
		if (this.config.ignoreUnknownCommands) {
			// TODO: put skipped params somewhere
			return;
		}

		// TODO: append error
		return true;
	}

	cmd.config = cmdConf;
	cmd.branch = cmd.branch || [];
	cmd.branch.push (cmdName);

	if ("type" in cmdConf) {
		this.appendError (this.l10nMessage ("commandDefinedAsOption"), cmdName, cmdName);
		return true;
	}

	// walk command tree if any
	if (!cmdConf.run && !cmdConf.flow && !cmdConf.script) {

		if (!cmdList[idx + 1]) {
			this.appendError (this.l10nMessage ("commandHandlerMissing"), cmdName);
			return true;
		}

		if (!cmdConf.sub || !cmdConf.sub[cmdList[idx + 1]]) {
			this.appendError (this.l10nMessage ("commandSubMissing"), cmdName, cmdList[idx + 1]);
			return true;
		}

		// found possible subcommand
		return this.commandExists (cmd, cmdList[idx + 1], idx + 1, cmdList);
	}

	return cmd;
}

/**
 * Format option for usage or help command
 * @param   {Object} option  Name of the option
 * @param   {Object} optConf Option configuration
 * @returns {Array}  Array with option name with all aliases and description
 */
ArgvParser.prototype.formatOption = function (option, optConf) {
	var names = [];
	if (optConf.alias) {
		names = names.concat (optConf.alias);
	}

	var optAliased = option.replace (/[A-Z]/g, "-$&").toLowerCase();
	if (names.indexOf (optAliased) === -1) {
		names.unshift (option);
	}

	var line = "   " + names.map (function (name, i) {
		return this.helpNamePresenter ((name.length === 1 ? "-" : "--") + name);
	}.bind (this)).join (", ");

	// TODO: add support for alternate values type, like "type": ["yes", "no"]
	if (optConf.type !== "boolean")
		line += ' ' + "[" + optConf.type + "]";

	var l10nDescription = this.l10nDescription (option, optConf.description);

	return [line, l10nDescription];
}

ArgvParser.prototype.helpNamePresenter = function (name) {
	return name
}

function removeAnsiEscapes (str) {
	return str.replace (/\033\[\d+m/g, "");
}

/**
 * Usage generator from options and commands
 * @returns {String} contains banner, global options and command list
 */
ArgvParser.prototype.usage = function () {

	// here is the magic: if we have a help config and that config
	// contains run/flow/script key, then user decided to generate
	// usage and help messages on their own. if we don't have such keys,
	// we're to implement usage using banner key and command help
	// using command and options descriptions

	// TODO: launch help.(run/flow/script)

	var maxCmdWidth =  0;
	var maxOptWidth =  0;
	var maxColWidth = 30;

	var commands = [];
	var options  = [];
	for (var optName in this.optionConfig) {
		var optConf = this.optionConfig[optName];
		// XXX: maybe warning?
		if (!optConf.description)
			continue;

		// non global option
		if (!optConf.type) {
			// TODO: show error
			continue;
		}

		if (!optConf.global)
			continue;

		var optHelp = this.formatOption (optName, optConf);
		maxOptWidth = Math.max (removeAnsiEscapes (optHelp[0]).length, maxOptWidth);
		options.push (optHelp);

	}

	for (var cmdName in this.commandConfig) {
		var cmdConf = this.commandConfig[cmdName];

		// XXX: maybe warning?
		if (!cmdConf.description)
			continue;

		if (cmdConf.run || cmdConf.script || cmdConf.flow) {
			var l10nDescription = this.l10nDescription (cmdName, cmdConf.description);
			var cmdHelp = ["   " + this.helpNamePresenter (cmdName), l10nDescription];
			commands.push (cmdHelp);
			maxCmdWidth = Math.max (removeAnsiEscapes (cmdHelp[0]).length, maxCmdWidth);
		}
	}

	function spaceFill (m, v) {
		var l = removeAnsiEscapes(v[0]).length; // removed ansi escapes
		if (l >= m + 3)
			return v[0] + "   " + v[1];
		for (var o = m + 3 - l; o--; v[0] += " ");
		return v[0] + v[1];
	}

	var optSpaceFill = spaceFill.bind (this, maxOptWidth);
	var cmdSpaceFill = spaceFill.bind (this, maxCmdWidth);

	// TODO: cluster commands using some key from config.help
	// TODO: check if banner and help exists
	var usage = [].concat (
		this.config.usage ? this.config.usage : "",
		"",
		this.l10nMessage ("globalOptions"),
		options.map (optSpaceFill).sort(),
		"",
		this.l10nMessage ("commands"),
		commands.map (cmdSpaceFill).sort(),
		""
	).join ("\n")

	return usage;
}


/**
 * Clean up filled aliases
 * @param {Object} options from parser
 */
ArgvParser.prototype.cleanupAliases = function (options) {
	for (var k in this.optionConfig) {
		// clean up options a little
		var aliases = this.optionConfig[k].alias;
		if (aliases) {
			if (aliases.constructor !== Array)
				aliases = [aliases];
			aliases.forEach (function (aliasName) {
				if (aliasName in options && aliasName !== k) {
					options[k] = options[aliasName]; // not really needed, insurance for a yargs api changes
					delete options[aliasName];
				}
			});
		}
	}
}

/**
 * Fullfill option values from environment if env key is present for option
 * @param {Object} options from parser
 */
ArgvParser.prototype.fillOptionsFromEnv = function (options) {
	for (var k in this.optionConfig) {
		if (!this.optionConfig[k].env)
			continue;

		// TODO: make override options from env configurable
		if (options[k])
			continue;

		var envVars = this.optionConfig[k].env;
		if (envVars.constructor !== Array)
			envVars = [envVars];
		envVars.forEach (function (envVar) {
			if (process.env[envVar])
				options[k] = process.env[envVar];
		});
	}
}

/**
 * Append error
 */
ArgvParser.prototype.appendError = function () {
	var string = util.format.apply (util, arguments);
	if (this.verbose) {
		console.error.apply (console, arguments);
	}
	this.errors = this.errors || [];
	this.errors.push (string);
}


/**
 * Cleanup options and validate
 * @param   {Object} cmdConf command configuration
 * @param   {Object} options from parser
 * @returns {Object} with two keys: failed and valid options
 */
ArgvParser.prototype.validateOptions = function (cmd, options) {
	// validate command options
	var valid = {};
	var failed = {};

	var cmdConf = cmd.config;

	var conf = this.optionConfig;

	var cmdOptions = cmdConf.options || {};

	for (var option in options) {
		if (option === "_") continue;
		if (option in failed) continue;
		var optConf = conf[option];
		if (!optConf) {
			this.appendError (this.l10nMessage ("optionConfMissing"), option);
			continue;
		}

		var conflicts = optConf.conflicts || [];

		if (optConf.global) {
			// console.log ('option %s is global', option);
		} else if (cmdOptions.constructor === Array) {
			if (cmdOptions.indexOf (option) === -1) continue;
			// console.log ('option %s is an array item', option);
		} else if (option in cmdOptions) {
			// console.log ('option %s is an object', option);
			// local override for conflicts
			if (cmdOptions[option] && cmdOptions[option].conflicts) {
				conflicts = cmdOptions[option].conflicts;
			}
		} else {
			continue;
		}

		if (conflicts && conflicts.constructor !== Array) {
			conflicts = [conflicts];
		}

		conflicts.forEach (function (conflictOpt) {
			if (options[conflictOpt]) {
				console.error (this.l10nMessage ("optionConflict"), option, conflictOpt);
				failed[conflictOpt] = "conflict";
				failed[option] = "conflict";
			}
		}.bind (this));

		if (!failed[option]) {
			valid[option] = options[option];
		}

		// && cmdConf.options[option]
	}

	for (var optName in cmdOptions) {
		var required = cmdOptions[optName] === true;
		if (cmdOptions[optName] && cmdOptions[optName].required) {
			required = true;
		}
		if (required && !(optName in valid)) {
			failed[optName] = "required";
		}
	}

	return {failed: failed, valid: valid};

}

ArgvParser.prototype.parse = function (argv) {

	delete this.errors;

	// got uprepared argv
	if (argv && argv[0] === process.argv[0] && argv[1] === process.argv[1])
		argv = process.argv.slice (2);

	if (!argv)
		argv = process.argv.slice (2);

	return this.launchParser (argv);
}


/**
 * After argv parsed, we need to find out which command to launch
 * and validate that command options
 */
ArgvParser.prototype.findCommand = function (options) {

	if (!options || options.constructor === Array) {
		options = this.parse (options);
	}

	var haveCommand;
	var argvRemains  = options._;

	// TODO: avoid those class fields
	delete this.cmd;

	var cmd = {};

	argvRemains.some (this.commandExists.bind (this, cmd));

	if (!cmd.config) {
		var usage = this.usage ();
		return {usage: usage};
	}

	var options = this.validateOptions (cmd, options);

	cmd.options = options.valid;
	cmd.failedOptions = options.failed;
	cmd.errors = this.errors;

	//if (!Object.keys(options.failed).length) {
		return cmd;
	//}
}

ArgvParser.prototype.start = function (cmd, origin, cb) {

	// if we got argv, parse it first
	if (!cmd || cmd.constructor === Array) {
		cmd = this.findCommand (cmd);
	}

	if (!cb) cb = function () {}

	if ("usage" in cmd) {
		var showUsage = cb (cmd);
		if (showUsage || showUsage === undefined)
			console.log (cmd.usage);
		return;
	}

	var cmdConf = cmd.config;

	if (!origin)
		origin = require.main;

	var data = {};

	// TODO: add support for flow/script
	var methodNames = [].concat (cmdConf.run);

	var launchIdx = -1;

	var launchNext = function (err) {
		// probably need to stop on error?
		if (err)
			this.appendError (this.l10nMessage ("taskError"), methodNames[launchIdx], err);
		launchIdx ++;
		var methodName = methodNames[launchIdx];
		if (methodName) {
			origin[methodName] (cmd, data, launchNext);
		} else {
			cb (cmd, data);
		}
	}.bind(this);

	launchNext (null);

}

module.exports = ArgvParser;
