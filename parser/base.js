// var cliConfig = require ('./cli-options.json');

var yargs = require ("yargs");

var util = require ("util");

/**
 * Generic parser class for argv
 * @class
 * @param {Object} config commands and options
 */
function ArgvParser (config) {

}

/**
 * Gather all option configurations from config
 */
ArgvParser.prototype.getOptions = function () {
	var options = {};

	for (var k in this.config) {
		var optsConf = this.config[k];
		if ("type" in optsConf && "description" in optsConf) {
			// seems like parameter to me
			options[k] = optsConf;
		}
	}

	return options;
}

/**
 * Checks if the command exists in configuration
 * @param   {Object}  config      Whole configuration object
 * @param   {String}  possibleCmd String from argv pretending to be a command
 * @param   {Number}  idx         Index of that string in argv remains
 * @param   {Array}   cmdList     argv remains after option parsing
 * @returns {Boolean} true if processing finished, actual command is stored in {@link cmd cmd property}}
 */
ArgvParser.prototype.commandExists = function (config, possibleCmd, idx, cmdList) {
	// check if command exists in config

	if (!this.config[possibleCmd]) {
		if (this.ignoreUnknownCommands) {
			return;
		}

		return true;
	}

	var cmdConf = this.config[possibleCmd];

	if ("type" in cmdConf) {
		console.error ("found command '%s', but in configuration '%s' defined as an option", possibleCmd, possibleCmd);
		return true;
	}

	// walk command tree if any
	if (!cmdConf.run && !cmdConf.flow && !cmdConf.script) {

		if (!cmdList[idx + 1]) {
			console.error ("command '%s' doesn't contain 'run', 'flow' or 'script' key to define code to handle command", possibleCmd);
			return true;
		}

		if (!cmdConf.sub || !cmdConf.sub[cmdList[idx + 1]]) {
			console.error ("command '%s' doesn't contain 'sub' key to define subcommand for %s", possibleCmd, cmdList[idx + 1]);
			return true;
		}

		// found possible subcommand
		return this.commandExists (cmdConf, cmdList[idx + 1], idx + 1, cmdList);
	}

	this.cmd = cmdConf;

	return cmdConf;
}

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
		return (name.length === 1 ? "-" : "--") + name;
	}).join (", ");

	if (optConf.type !== "boolean")
		line += ' ' + "[" + optConf.type + "]";

	return [line, optConf.description];
}

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
	for (var optName in this.config) {
		var optConf = this.config[optName];
		if (!optConf.description)
			continue;

		// non global option
		if (optConf.type) {
			if (optConf.global) {
				var optHelp = this.formatOption (optName, optConf);
				maxOptWidth = Math.max (optHelp[0].length, maxOptWidth);
				options.push (optHelp);
			}
			continue;
		}

		if (optConf.run || optConf.script || optConf.flow) {
			maxCmdWidth = Math.max (optName.length + 3, maxCmdWidth);
			commands.push (["   " + optName, optConf.description]);
		}
	}

	function spaceFill (m, v) {for (var l = m + 3 - v[0].length; l--; v[0] += " "); return v[0] + v[1];}

	var optSpaceFill = spaceFill.bind (this, maxOptWidth);
	var cmdSpaceFill = spaceFill.bind (this, maxCmdWidth);

	// TODO: cluster commands using some key from config.help
	// TODO: check if banner and help exists
	var usage = this.config.help.banner.concat (
		commands.map (cmdSpaceFill).sort(),
		"\nGlobal options:",
		options.map (optSpaceFill).sort()
	).join ("\n")

	console.log (usage);

	return usage;
}


ArgvParser.prototype.cleanupAliases = function (options) {
	for (var k in this.config) {
		// clean up options a little
		var aliases = this.config[k].alias;
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

ArgvParser.prototype.fillOptionsFromEnv = function (options) {
	for (var k in this.config) {
		if (!this.config[k].env)
			continue;

		// TODO: make override options from env configurable
		if (options[k])
			continue;

		var envVars = this.config[k].env;
		if (envVars.constructor !== Array)
			envVars = [envVars];
		envVars.forEach (function (envVar) {
			if (process.env[envVar])
				options[k] = process.env[envVar];
		});
	}
}

ArgvParser.prototype.validateOptions = function validateOptions (conf, cmdConf, options) {
	// validate command options
	var valid = {};
	var failed = {};

	var cmdOptions = cmdConf.options || {};

	for (var option in options) {
		if (option === "_") continue;
		if (option in failed) continue;
		var optConf = conf[option];
		if (!optConf) continue;

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
				console.error ("option %s conflicts with %s", option, conflictOpt);
				failed[conflictOpt] = "conflict";
				failed[option] = "conflict";
			}
		});

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

/**
 * After argv parsed, we need to find out which command to launch
 * and validate that command options
 */
ArgvParser.prototype.findCommand = function (options) {

	this.cmd = undefined;

	if (!options || options.constructor === Array) {
		options = this.parse (options);
	}

	var haveCommand;
	var argvRemains  = options._;

	argvRemains.some (this.commandExists.bind (this, this.config));

	var haveCmd = this.cmd;

	if (!haveCmd || haveCmd === true) {
		var usage = this.usage ();
		return {usage: usage};
	}

	var options = this.validateOptions (this.config, haveCmd, options);

	//if (!Object.keys(options.failed).length) {
		return {
			command: haveCmd,
			options: options.valid,
			failedOptions: options.failed
		};
	//}

	for (var k in options) {
		if (!(k in cliConfig))
			continue;

		if (haveCommand && k !== '_' && (cliConfig[k].run || cliConfig[k].flow || cliConfig[k].menu)) {
			console.error (paint.cuwire (), 'you cannot launch two commands at once:', [
				paint.path (k), paint.path (haveCommand)
			].join (' and '));
			return;
		}
		if (k !== '_' && (cliConfig[k].run || cliConfig[k].flow || cliConfig[k].menu)) {
			haveCommand = k;
		}
	}

	// if we don't have a command, try first param
	// ino, leo and so on compatibility
	if (!haveCommand && haveParams[0] && cliConfig[haveParams[0]].run) {
		haveCommand = haveParams.shift();
		options[haveCommand] = true;
	}

	return haveCommand;
}

// TODO: usage generator



var CommandLine = function (args) {
	var options = initOptions ();

	var haveCommand = findCommand (options);

	if (!haveCommand) {
		yargs.showHelp();
		return;
	}

	//	console.log (paint.cuwire (version));

	if (!cliConfig[haveCommand].arduino) {
		//		console.log (cliConfig[haveCommand].run, this, this[cliConfig[haveCommand].run]);
		this.launchCommand (haveCommand, options);
		if (options.dryRun)
			return;
		return;
	}

	// TODO: store app folder in configuration data
	this.arduino = new ArduinoData (options.arduino, undefined, undefined, {
		verbose: options.verbose,
		debug:   options.debug,
		scanExamples: options.test ? true : false
	});

	var longOp = {
		cache: "populating cache, this can take some time"
	};

	this.arduino.on ('longOperation', function (scope) {
		var message = "please wait for "+scope;
		if (longOp[scope])
			message = longOp[scope];
		console.log (
			paint.cuwire (),
			paint.yellow (message)
		);

	});

	this.arduino.on ('done', (function () {

		var runtimeFound = [];
		for (var folderName in this.arduino.folders) {
			var folderData = this.arduino.folders[folderName];
			if (folderData.runtime && folderData.modern) {
				runtimeFound.push ([folderName, folderData]);
			}
		}

		if (runtimeFound.length) {
			if (runtimeFound.length > 1) {
				console.log (
					paint.cuwire (),
					// TODO: add error explantions to wiki
					paint.error ('found multiple runtimes #multipleRuntimesErr, cannot continue. runtime folders:'),
					runtimeFound.map (function (r) {return paint.error (r[0])}).join (',')
				);
				if (cliConfig[haveCommand].runtimeRequired)
					process.exit (1);
			}
			console.log (paint.cuwire (), 'using runtime from', paint.path (runtimeFound[0][0]));
		} else {
			// TODO: add error explantions to wiki
			console.log (paint.cuwire (), paint.error ('no runtimes found #noRuntimesErr'));
			if (cliConfig[haveCommand].runtimeRequired)
				process.exit (1);
		}

		if (options.board) {
			options.board = this.arduino.lookupBoard (options.board, options.model);
			if (!options.board)
				return;
		}

		this.launchCommand (haveCommand, options);
		if (options.dryRun)
			return;

	}).bind (this));

}

CommandLine.prototype.launchCommand = function (cmdName, options) {
	var cmdConf = cliConfig[cmdName];

	var methodNames = [].concat (cliConfig[cmdName].run);

	var launchIdx = -1;

	var launchNext = (function (err) {
		// probably need to stop on error?
		launchIdx ++;
		var methodName = methodNames[launchIdx];
		if (methodName)
			this[methodName](options, launchNext);
	}).bind(this);

	launchNext();

}

module.exports = ArgvParser;
