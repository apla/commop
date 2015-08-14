var util = require ("util");
var path = require ("path");

/**
 * Generic parser class for argv
 * @class
 * @param {Object} config commands and options
 */
function ArgvParser (config) {

	/* if you want to implement new parser, you should call init */
	this.init (config);

}

ArgvParser.l10nMessage = {
	optionConflict: "option '%s' conflicts with '%s'",
	optionConfMissing: "unexpected option '%s'",
	commandDefinedAsOption: "found command '%s', but in configuration '%s' defined as an option",
	commandHandlerMissing: "command '%s' doesn't contain 'run', 'flow' or 'script' key to define code to handle command",
	commandSubMissing: "command '%s' doesn't contain 'sub' key to define subcommand for %s",
	globalOptions: "Global options:",
	commands: "Commands:",
	commandIntro: path.basename (process.argv[1]),
	options: "Options:",
	subCommands: "Subcommands:",
	taskError: "task '%s' error:",
	configKeysError: "configuration must contain 'options' and 'commands' keys",
	unknownEnvMode: "unknown environment mode %s",
	optionFoundInCommandButConfig: "can't find option '%s' for command '%s'",
	optionImplied: "option '%s' implies option '%s' to be defined"
};

ArgvParser.prototype.init = function (config) {
	if (!config || !config.options || !config.commands) {
		throw this.l10nMessage ("configKeysError");
	}

	this.config = config;

	this.optionConfig = config.options;

	this.commandConfig = config.commands;
	this.commandConfigFilter ();
}

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

function parseCmdOpt (optConf) {
	if (typeof optConf === "string") {
		var param = optConf;
		optConf = {};
		optConf[param] = true;
	}

	if (optConf === null || typeof optConf !== "object") {
		optConf = {};
	}

	return optConf;
}

ArgvParser.prototype.commandConfigFilter = function (commands) {
	commands = commands || this.commandConfig;
	for (var cmdName in commands) {
		if ("sub" in commands[cmdName]) this.commandConfigFilter (commands[cmdName].sub);
		var cmdOpts = commands[cmdName].options;
		if (cmdOpts) {
			if (cmdOpts.constructor === Array) {
				var cmdOptsArray = cmdOpts;
				cmdOpts = commands[cmdName].options = {};
				cmdOptsArray.forEach (function (optName) {cmdOpts[optName] = {}});
			}
			Object.keys (cmdOpts).forEach (function (optName) {
				var optConf = cmdOpts[optName];

				if (!(optName in this.optionConfig)) {
					throw util.format (
						this.l10nMessage ("optionFoundInCommandButConfig"),
						this.helpNamePresenter (optName),
						this.helpNamePresenter (cmdName)
					);
				}

				optConf = parseCmdOpt (optConf);

				if ("conflicts" in optConf) {
					var conflicts = optConf.conflicts.constructor === Array ? optConf.conflicts : [optConf.conflicts];
					conflicts.forEach (function (conflictOpt) {
						var conflictOptConf = cmdOpts[conflictOpt] = parseCmdOpt (cmdOpts[conflictOpt]);
						if (!("conflicts" in conflictOptConf)) {
							conflictOptConf.conflicts = [optName];
						} else if (conflictOptConf.conflicts.indexOf (optName) === -1) {
							conflictOptConf.conflicts.push (optName);
						}
					}.bind (this));
				}

				cmdOpts[optName] = optConf;
			}.bind (this));
		}
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
		this.appendError (
			this.l10nMessage ("commandDefinedAsOption"),
			this.helpNamePresenter (cmdName),
			this.helpNamePresenter (cmdName)
		);
		return true;
	}

	// walk command tree if any
	if (!cmdConf.run && !cmdConf.flow && !cmdConf.script) {

		if (!cmdList[idx + 1]) {
			this.appendError (
				this.l10nMessage ("commandHandlerMissing"),
				this.helpNamePresenter (cmdName)
			);
			return true;
		}

		if (!cmdConf.sub || !cmdConf.sub[cmdList[idx + 1]]) {
			this.appendError (
				this.l10nMessage ("commandSubMissing"),
				this.helpNamePresenter (cmdName),
				this.helpNamePresenter (cmdList[idx + 1])
			);
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

ArgvParser.prototype.errorPresenter = function (error) {
	return error
}


function removeAnsiEscapes (str) {
	return str.replace (/\033\[\d+m/g, "");
}

function spaceFill (m, v) {
	var l = v[2];
	if (l >= m + 3)
		return v[0] + "   " + v[1];
	for (var o = m + 3 - l; o--; v[0] += " ");
	return v[0] + v[1];
}

ArgvParser.prototype.helpFormatOption = function (optName, optConf) {

	// XXX: maybe warning?
	if (!optConf.description)
		return;

	// non global option
	if (!optConf.type) {
		// TODO: show error
		return;
	}

	var optHelp = this.formatOption (optName, optConf);
	optHelp.push (removeAnsiEscapes (optHelp[0]).length);
	return optHelp;
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

		if (!optConf.global) continue;

		var optHelp = this.helpFormatOption (optName, optConf);

		if (optHelp) {
			options.push (optHelp);
			maxOptWidth = Math.max (optHelp[2], maxOptWidth);
		}
	}

	for (var cmdName in this.commandConfig) {
		var cmdConf = this.commandConfig[cmdName];

		// XXX: maybe warning?
		if (!cmdConf.description)
			continue;

		if (cmdConf.run || cmdConf.script || cmdConf.flow || cmdConf.sub) {
			var l10nDescription = this.l10nDescription (cmdName, cmdConf.description);
			if (cmdConf.sub) {
				l10nDescription += Object.keys (cmdConf.sub).length
					? ": " + Object.keys (cmdConf.sub).map (function (subCmd) {
					return this.helpNamePresenter (subCmd);
				}.bind(this)).join (", ")
				: "";
			}
			var cmdHelp = ["   " + this.helpNamePresenter (cmdName), l10nDescription];
			cmdHelp.push (removeAnsiEscapes (cmdHelp[0]).length);
			commands.push (cmdHelp);
			maxCmdWidth = Math.max (removeAnsiEscapes (cmdHelp[0]).length, maxCmdWidth);
		}
	}

	var optSpaceFill = spaceFill.bind (this, maxOptWidth);
	var cmdSpaceFill = spaceFill.bind (this, maxCmdWidth);

	// TODO: cluster commands using some key from config.help
	var usage = [
		this.l10nMessage ("commandIntro"),
		""
	];
	if (this.config.usage) usage = usage.concat (this.config.usage, "");
	if (options.length) usage = usage.concat (
		this.l10nMessage ("globalOptions"),
		options.map (optSpaceFill).sort(),
		""
	);

	if (commands.length) usage = usage.concat (
		this.l10nMessage ("commands"),
		commands.map (cmdSpaceFill).sort(),
		""
	);

	return usage.join ("\n");
}


ArgvParser.prototype.helpForCommand = function (cmd) {

	if (cmd.constructor === Array) {
		cmd = this.findCommand (cmd);
	}

	var maxCmdWidth =  0;
	var maxOptWidth =  0;
	var maxColWidth = 30;

	var commands      = [];
	var globalOptions = [];
	var options       = [];

	for (var optName in this.optionConfig) {
		var optConf = this.optionConfig[optName];

		if (!optConf.global) continue;

		var optHelp = this.helpFormatOption (optName, optConf);

		if (optHelp) {
			globalOptions.push (optHelp);
			maxOptWidth = Math.max (optHelp[2], maxOptWidth);
		}
	}

	if (cmd.config.options) for (var optName in cmd.config.options) {
		var optConf = this.optionConfig[optName];

		var optHelp = this.helpFormatOption (optName, optConf);

		if (optHelp) {
			options.push (optHelp);
			maxOptWidth = Math.max (optHelp[2], maxOptWidth);
		}
	}

	if (cmd.config.sub) for (var cmdName in cmd.config.sub) {
		var cmdConf = cmd.config.sub[cmdName];

		// XXX: maybe warning?
		if (!cmdConf.description)
			continue;

		if (cmdConf.run || cmdConf.script || cmdConf.flow) {
			var l10nKey = (cmd.branch || []).concat (cmdName).join ('.');
			var l10nDescription = this.l10nDescription (l10nKey, cmdConf.description);
			var cmdHelp = ["   " + this.helpNamePresenter (cmdName), l10nDescription];
			cmdHelp.push (removeAnsiEscapes (cmdHelp[0]).length);
			commands.push (cmdHelp);
			maxCmdWidth = Math.max (removeAnsiEscapes (cmdName).length, maxCmdWidth);
		}
	}

	var optSpaceFill = spaceFill.bind (this, maxOptWidth);
	var cmdSpaceFill = spaceFill.bind (this, maxCmdWidth);

	// TODO: cluster commands using some key from config.help
	var usage = [
		this.l10nMessage ("commandIntro") + " " +
		cmd.branch.map (function (pathChunk) {return this.helpNamePresenter (pathChunk)}.bind (this)).join (" "),
		""
	];
	if (cmd.config.usage) {
		usage.push (cmd.config.usage, "");
	}
	if (globalOptions.length) {
		usage = usage.concat (
			this.l10nMessage ("globalOptions"),
			globalOptions.map (optSpaceFill).sort(),
			""
		);
	}
	if (options.length) {
		usage = usage.concat (
			this.l10nMessage ("options"),
			options.map (optSpaceFill).sort(),
			""
		);
	}
	if (commands.length) {
		usage = usage.concat (
			this.l10nMessage ("subCommands"),
			commands.map (cmdSpaceFill).sort(),
			""
		);
	}

	return usage.join ("\n");
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

	var envMode = this.config.envMode || "fallback";

	for (var k in this.optionConfig) {
		if (!this.optionConfig[k].env)
			continue;

		var envVars = this.optionConfig[k].env;
		if (envVars.constructor !== Array)
			envVars = [envVars];
		envVars.forEach (function (envVar) {
			if (!(envVar in process.env)) return;
			if (envMode === "override") {
				options[k] = process.env[envVar];
			} else if (envMode === "fallback") {
				options[k] = k in options ? options[k] : process.env[envVar];
			} else {
				this.appendError (this.l10nMessage ("unknownEnvMode"), envMode);
			}
		}.bind (this));
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

	var required = {};
	for (var optName in cmdOptions) {
		if (cmdOptions[optName] && (cmdOptions[optName] === "required" || cmdOptions[optName].required)) {
			required[optName] = true;
		}
	}

	for (var option in options) {
		if (option === "_") continue;
		if (option in failed) continue;
		var optConf = conf[option];
		if (!optConf) {
			this.appendError (this.l10nMessage ("optionConfMissing"), this.helpNamePresenter (option));
			continue;
		}

		var conflicts = optConf.conflicts || [];
		var implies   = optConf.implies   || [];

		if (optConf.global) {
			// console.log ('option %s is global', option);
		} else if (cmdOptions.constructor === Array) {
			if (cmdOptions.indexOf (option) === -1) continue;
			// console.log ('option %s is an array item', option);
		} else if (option in cmdOptions) {
			// console.log ('option %s is an object', option);
			// local override for conflicts
			if (cmdOptions[option]) {
				if (cmdOptions[option].conflicts)
					conflicts = cmdOptions[option].conflicts;
				if (cmdOptions[option].implies) {
					implies   = cmdOptions[option].implies;
				}
			}

		} else {
			continue;
		}

		if (conflicts && conflicts.constructor !== Array) {
			conflicts = [conflicts];
		}

		conflicts.forEach (function (conflictOpt) {
			required[conflictOpt] = false;
			if (!(conflictOpt in options)) return;
			var conflictOptConf = conf[conflictOpt];
			if (!conflictOptConf.default && conflictOptConf.type === "boolean" && !options[conflictOpt]) return;
			this.appendError (
				this.l10nMessage ("optionConflict"),
				this.helpNamePresenter (option),
				this.helpNamePresenter (conflictOpt)
			);
			failed[conflictOpt] = "conflict";
			failed[option] = "conflict";
			if (conflictOpt in valid) delete valid[conflictOpt];

		}.bind (this));

		/* implies */

		if (implies && implies.constructor !== Array) {
			implies = [implies];
		}

		implies.forEach (function (impliedOpt) {
			if (impliedOpt in options) return;

			failed[option] = "scarce";
			failed[impliedOpt] = "implied";
			this.appendError (
				this.l10nMessage ("optionImplied"),
				this.helpNamePresenter (option),
				this.helpNamePresenter (impliedOpt)
			);
		}.bind (this));

		required[option] = false;

		if (!(option in failed)) {
			valid[option] = options[option];
		}

		// && cmdConf.options[option]
	}

	for (var optRequired in required) {
		if (!required[optRequired]) continue;
		failed[optRequired] = "required";
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
	var argvRemains  = options._ || [];

	/////////////////////
	var showHelp = false;
	var confHelpHandler = this.commandConfig.help ? this.commandConfig.help.run : undefined;

	if (argvRemains[0] === "help" && !confHelpHandler) {
		argvRemains.shift();
		showHelp = true;
	}

	if (showHelp) {
		return {
			usage: this.helpForCommand (argvRemains)
		};
	}
	/////////////////////

	var cmd = {};

	argvRemains.some (this.commandExists.bind (this, cmd));

	if (!cmd.config) {
		var usage = this.usage ();
		return {usage: usage};
	}

	var options = this.validateOptions (cmd, options);

	cmd.options = options.valid;
	cmd.failedOptions = options.failed;
	// TODO: clear errors
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

	if (cmd.errors) {
		var showErrors = cb (cmd);
		if (showErrors || showErrors === undefined) {
			cmd.errors.forEach (function (err) {
				console.error (this.errorPresenter (pathChunk));
			}.bind (this));
			return;
		}
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
			this.appendError (
				this.l10nMessage ("taskError"),
				this.helpNamePresenter (methodNames[launchIdx]),
				err
			);
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
