declare var require: (name:string) => any

var fs = require('fs')
var pegs = require('../../lib/compiler/Parser.js').parser

var source = fs.readFileSync('src/tests/ParserInput', { encoding: 'utf8' });

var time = new Date().getTime()
var result = pegs.parse(source)
time = new Date().getTime() - time

console.log(result)
console.log('Done in ' + time + 'ms.')