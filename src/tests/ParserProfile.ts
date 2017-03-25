// run "yarn profile"
// then run "node --prof-process isolate-0x<nnnnnnnnnnnn>-v8.log > profile.txt"
// (fill in the n's with the specifics)

declare var require: (name:string) => any
var fs = require('fs')

import {
    generateParser
} from "../compiler"

var parser = fs.readFileSync('src/tests/Parser.pegjs', { encoding: 'utf8' });
var source = fs.readFileSync('src/tests/ParserInput', { encoding: 'utf8' });

let pegs: any = generateParser(parser)

let count = 100

var time = new Date().getTime()
for(let i = 0; i < count; i++) pegs.parse(source)
time = new Date().getTime() - time

console.log('Done in ' + time + 'ms.')