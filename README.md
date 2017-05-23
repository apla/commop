# CommOp

[![Build Status](https://travis-ci.org/apla/commop.svg?branch=master)](https://travis-ci.org/apla/commop)
[![NPM Version](http://img.shields.io/npm/v/commop.svg?style=flat)](https://www.npmjs.org/package/commop)

Solution for complex cli interfaces.

## Installation

$ npm install -g commop

### Writing another module

This is not an option parser module. If you writing small script, which handles one simple task,
please use another module, there is many option parsers: [commander](https://github.com/tj/commander.js), [dashdash](https://github.com/trentm/node-dashdash),
[minimist](https://github.com/substack/minimist) or [yargs](https://github.com/bcoe/yargs).

For some of my tasks I had to write complicated cli interface. With global options,
options per command, command sets, localized messages, environment as fallback/override and so on.
So, I decided to write helper module which can use any option parser module for parsing argv and then
build a cli I want.


## Example

```javascript
{
	"options": {
		"verbose":  {"type": "boolean", "global": true, "alias": "v"},
		"arduino":  {"type": "string",  "global": true, "alias": "A"},
		"include":  {"type": "string",  "alias": "I"},
		"define":   {"type": "string",  "alias": "D"},
		"port":     {"type": "string",  "alias": "p"},
		"baudrate": {"type": "number",  "alias": "r"},
	},
	"commands": {
		"compile":  {"options": ["inc", "define"], "run": "compile"},
		"upload":   {"options": ["port", "baudrate"], "run": "upload"},
		"platform": {
			"sub": {
				"add":    {"run": "addPlatform"},
				"remove": {"run": "removePlatform"}
			}
		}
	}
}
```

```javascript

var commop = require ('commop');
var config = require ('./commop.json');

var launcher = new commop (config);

function compile (cmd, next) {
	if (cmd.options.inc) {
		// TODO: make something with inc
	}
	// code to compile
}

module.exports.compile = compile;

launcher.start (); // process.argv, module.exports

```

I had to create cli for arduino supporting commands like `compile`, `upload` and `platform`.
Each task should have `verbose` and `arduino` options.
And `compile` and `upload` commands should have `sketch` and `board` options.
Afterall `compile` must be configurable via `-D`, includes via `-I` options.
Upload must support `port` and `baudrate` options.
`platform` is actually set of commands,
like `platform add <>` and `platform remove <>`.

### Option parsing

I've tried a lot of option parsing modules, and found out that it is matter of preference which module to use.
For my own tasks (almost) any option parser can handle job. But some needs [advanced validation](https://github.com/trentm/node-dashdash#option-specs),
in some cases [no requirements](https://github.com/substack/minimist) is a must, and some [loves pirates](https://github.com/bcoe/yargs).

`commop` uses bundled `minimist` module and supports `yargs` and `dashdash` interfaces.

## Interface

There is no fancy interface to add options. Module takes [configuration](#configuration) and
launches tasks tied to that configuration.

```javascript

var commop = require ('commop');
var config = require ('./commop.json');

var launcher = new commop (cmdConfig);

// getting command configuration from argv
var cmd;

// now you can command configuration
cmd = launcher.findCommand ();
// or
cmd = launcher.findCommand (process.argv);
// or
cmd = launcher.findCommand (process.argv);

/*
cmd: {
	config: <command config from configuration object>
	branch: [ 'library' ], // actual command branch
	options: { verbose: false, debug: false }, // options, accessible by that command
	failedOptions: {}, // if option is required and missed or some options conflicts
	errors: [] // another errors
}
*/

// launch tasks associated with that command
launcher.start ();

// launch tasks associated with that command
launcher.start (process.argv, require.main, function (cmd, data) {
	// every task is completed
});

```

## Features

### Command handler(s)

#### Using list of tasks with `run` key

Each command must have a handler, described by `run` key in [command configuration](#configuration-for-command).
If handler is an array, then tasks launched one after one. Task laso can be a promise or function,
which return a promise.

```javascript
/**
* task function
* @param {Object}   cmd  command object
* @param {Object}   data shared object between tasks in current handler
* @param {Function} next call next if done
*/
function task (cmd, data, next) {

}

```

Command objects usually contains `config` key with associated configuration structure,
`branch` key with list of parsed command names, `positional` with positional parameters,
`options` — list of applicable options, also `failedOptions` and `errors`

Data should be modified and returned via `next` callback or promise's resolve.
Next task will be launched regardless of return status of previous task.
If your task rely on data from previous command, assert data section.

Those tasks can be object methods, you just have to provide an origin as parameter to the `start` call.
If origin is not provided, `require.main` is used instead (it is your main module exports).

```javascript

var theProgram = new Program ();

launcher.start (null, theProgram, function (cmd, data) {
});

```

#### Using external script with `script` key

If you defined `script` key for command, this script will run. You can pass
options as environment variables. Script's `stdout` and `stderr` you'll get via
`data.scriptStderr` and `data.scriptStdout`. If command configuration contains
`anyway` key, then script error will be written to the `data.scriptError` and
callback will be called.

```javascript

var testConfig2 = {
	options: {
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

var co = new CommOp (testConfig2);

co.start (null, null, function (cmd, data) {
	console.log (data.scriptStderr, data.scriptStdout)
});

```

Also, if you need to launch different scripts on different OS'es,
use next format:

```javascript

script: {
	win32:  nodePath + " -e 'console.log (process.argv)' AAA=%BBB% CCC=%DDD%",
	default: nodePath + " -e 'console.log (process.argv)' AAA=${BBB} CCC=${DDD}"
}

```

### Usage/help localization

Each message is localizable,for more information please refer `test/04-l10n.js`

### Option sharing

Option can be global or shared between specified commands.

### Implied, conflicting and required options

Examples at `test/02-options.js`

### Usage generator

If your commands and options have properly defined descriptions,
`commop` will generate usage automatically. By default, if there is no command specified,
usage will be displayed automatically. But you can override this behaviour.

```javascript

// usage is displayed automatically unless showUsage is false
launcher.showUsage = false;

// usage will be displayed automatically if there is no commands in argv
launcher.start ([], null, function (cmd, data) {
	// we cannot find any commands
	if ("usage" in cmd) {
		// do something like this:
		if (cmd.branch[0] === 'xxx') {
			launcher.helpForCommand (["xxx"]);
		}
	}

});

// or, you can generate usage

var usageString = launcher.usage();

```

### Help generator for command

Command help displayed automatically if you added a `help` keyword before actual command.
Also, you can provide your own help handler by setting `run` key for a `help` command in config.

```javascript

// command help will be displayed automatically if you prefixed command with help keyword
launcher.start (["help", "cmd"], null, function (cmd, data) {
	if ("usage" in cmd) {
	}
});

// or, you can generate command help programmatically

var helpString = launcher.helpForCommand (["cmd"]);

```

## Configuration

Configuration is a javascript object. Options and commands configurations under
`options` and `commands` keys.

### Configuration for option

```javascript
"options": {
	"verbose":  {
		"type": "boolean",
		"global": true,
		"alias": "v",
		"description": "be verbose",
		"default": false,
		"env": "VERBOSE"
	},
	"arduino":  {"type": "string",  "global": true, "alias": "A"},
	"include":  {"type": "string",  "alias": "I"},
	"define":   {"type": "string",  "alias": "D"},
	"port":     {"type": "string",  "alias": "p"},
	"baudrate": {"type": "number",  "alias": "r"},
}
```

Configuration keys:

 * `type` handling depends on option parsing module

 * `global` options available for all commands

 * Single `alias` or list of aliases

 * `description` needed for usage/help generation

 * `default` value

 * `env` keys to use for that option


### Configuration for command

```javascript

"commands": {
	"compile":  {"options": ["inc", "define"], "run": "compile"},
	"upload":   {"options": ["port", "baudrate"], "run": "upload"},
	"platform": {
		"sub": {
			"add":    {"run": "addPlatform"},
			"remove": {"run": "removePlatform"}
		}
	}
}

```

Configuration keys:

 * `run` task or task set to run command

 * `sub` subcommands

 * `description` needed for usage/help generation

 * `options` is applicable options (`implies` is WIP):

```javascript

// simplest way to use:
options: ["port", "baudrate"]

// complete:
options: {
	"port": {"required": true, "conflicts": "board"},
	"board": null,
	"baudrate": {"implies": "port"}
}

```

##### Note

Implied/conflicting options works quite badly with booleans.
Using boolean options you will allways get value, either
true or false even if that option is not present.

### Additional flags

 * `envMode` can be `override` or `fallback`. In fallback mode every missing option
 will be filled from environment variable. In override mode environment values
 takes over precedence over argv options.

 * `ignoreUnknownCommands` allows to ignore unknown commands

### See also

https://github.com/freeformsystems/cli-command complex, many deps, don't have option relationship, events, +sections, +pod



## License

MIT

