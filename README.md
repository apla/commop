# parcli



[! [Build Status](https://api.travis-ci.org/apla/parcli.js.svg)](http://travis-ci.org/apla/parcli.js)
[! [NPM Version](http://img.shields.io/npm/v/parcli.svg?style=flat)](https://www.npmjs.org/package/parcli)


Solution for complex cli interfaces. [Story](http://apla.me/parcli) behind this module.

## Installation

$ npm install parcli

## Example

```javascript
{
	"verbose":  {"type": "boolean", "global": true, "alias": "v"},
	"arduino":  {"type": "string",  "global": true, "alias": "A"},
	"include":  {"type": "string",  "alias": "I"},
	"define":   {"type": "string",  "alias": "D"},
	"port":     {"type": "string",  "alias": "p"},
	"baudrate": {"type": "number",  "alias": "r"},

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

```javascript

var parcli    = require ('parcli');
var cmdConfig = require ('parcli.json');

var launcher = new parcli (cmdConfig);

function compile (cmd, next) {
	if (cmd.options.inc) {
		// TODO: make something with inc
	}
	// code to compile
}

module.exports.compile = compile;

launcher.start (); // process.argv, module.exports

```

I need to create cli for arduino. Tasks are `compile`, `upload` and `platform`.
Every task supports `verbose` and `arduino` flags.
`compile` and `upload` both supports `sketch` and `board` options.
Additionally, `compile` supports defines via `-D`, includes via `-I`.
Upload must support `port` and `baudrate` options. `platform` is actually set of commands,
like `platform add <>` and `platform remove <>`.

### Option parsing

Option parsing is out of scope for this module. You can use any module you want with adapter.
Currently supporting [yargs]() by historical reasons, but since `yargs~3.x` suffers from
dependency overflow, I planning to use minimist by default.

## License

MIT

