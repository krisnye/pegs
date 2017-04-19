#!/usr/bin/env node
declare var require: (name:string) => any
declare var process: any

var fs = require('fs')

import {
    generateParserSource
} from "./compiler"

var args = process.argv.slice(2)

if (args.length < 2) {
    console.log("\nUsage:\n\n    pegs input.pegs output.js\n")
}
else {
    var [input,output] = args
    var parser = fs.readFileSync(input, { encoding: 'utf8' });
    fs.writeFileSync(output, generateParserSource(parser), { encoding: 'utf8' })
}
