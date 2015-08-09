var path   = require ('path');
var fs     = require ('fs');
var assert = require ('assert');

var globalVerbose = process.env.VERBOSE || false;

var files = [];

var packageDir = path.join (__dirname, '..');

function filesToRead (depth, dir, fileName) {
	if (fileName.match (/^\./)) return;
	var filePath = path.join (dir, fileName);
	var fileStat = fs.statSync (filePath);
	if (fileStat.isFile()) {
		files.push (filePath);
	} else if (fileStat.isDirectory() && depth < 1) {
		var subDir = path.join (dir, fileName);
		fs.readdirSync (subDir).map (filesToRead.bind (this, depth + 1, subDir));
	}
}

fs.readdirSync (packageDir).map (filesToRead.bind (this, 0, packageDir));

// console.log (files);

describe ("01-tech-debt", function () {
	files.forEach (function (fileName) {
		if (fileName.match (/^\./) || !fileName.match (/\.js$/)) {
			return;
		}
		var fileContents = fs.readFileSync (fileName);
		var todos = fileContents.toString().match (/TODO[^\n\r]+|WTF[^\n\r]+/g);
		if (todos) {
			todos.forEach (function (todoText) {
				if (fileName !== __filename)
					it.skip (path.relative (packageDir, fileName) + ': ' + todoText);
				// console.log (todoText);
			});
		}

	});

});
