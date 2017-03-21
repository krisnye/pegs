// run "yarn profile"
// then run "node --prof-process isolate-0x<nnnnnnnnnnnn>-v8.log > profile.txt"
// (fill in the n's with the specifics)

declare var require: (name:string) => any

var fs = require('fs')
var pegs = require('../../lib/compiler/Parser.js').parser

var source = fs.readFileSync('src/tests/ParserInput', { encoding: 'utf8' });

var time = new Date().getTime()
for(let i = 0; i < 20; i++) pegs.parse(source)
time = new Date().getTime() - time

console.log('Done in ' + time + 'ms.')