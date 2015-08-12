# parcli


<!--
[! [Build Status](https://api.travis-ci.org/apla/parcli.js.svg)](http://travis-ci.org/apla/parcli.js)
[! [NPM Version](http://img.shields.io/npm/v/parcli.svg?style=flat)](https://www.npmjs.org/package/parcli)
-->


Solution for complex cli interfaces.

## Installation

$ npm install -g parcli

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

var parcli = require ('parcli');
var config = require ('./parcli.json');

var launcher = new parcli (config);

function compile (cmd, next) {
	if (cmd.options.inc) {
		// TODO: make something with inc
	}
	// code to compile
}

module.exports.compile = compile;

launcher.start (); // process.argv, module.exports

```

I had to create cli for arduino supporting ommands like `compile`, `upload` and `platform`.
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

`parcli` uses bundled `minimist` module and supports `yargs` and `dashdash` interfaces.

## Interface

There is no fancy interface to add options. Module takes [configuration](#configuration) and
launches tasks tied to that configuration.

```javascript

var parcli = require ('parcli');
var config = require ('./parcli.json');

var launcher = new parcli (cmdConfig);

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

Each command must have a handler, described by `run` key in [command configuration](#configuration-for-command).
If handler is an array, then tasks launched one after one.

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

Those tasks can be object methods, you just have to provide an origin as parameter to the `start` call.
If origin is not provided, `require.main` is used instead (it is your main module exports).

```javascript

var theProgram = new Program ();

launcher.start (null, theProgram, function (cmd, data) {
});

```

### Usage/help localization

Each message is localizable,for more information please refer `test/04-l10n.js`

### Option sharing

Option can be global or shared between specified commands.

### Implied, conflicting and required options

Examples at `test/02-options.js`

### Usage generator

If your commands and options have properly defined descriptions,
`parcli` will generate usage automatically. By default, if there is no command specifie,
usage will be displayed automatically. But you can override this behaviour.

```javascript

// usage will be displayed automatically if there is no commands in argv
launcher.start ([], null, function (cmd, data) {
	// we cannot find any commands
	if ("usage" in cmd) {
		// you can return false to skip usage output
		return false;
	}

});

// or, you can generate usage

var usageString = launcher.usage();

```

### Help generator for command

WIP

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
		"default": false
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

### Additional flags

TODO

## License

MIT

