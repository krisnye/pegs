declare var require: (name:string) => any
declare var process: any

var fs = require('fs')

import {
    generateParserSource
} from "./compiler"

var args = process.argv.slice(2)

var parser = fs.readFileSync(args[0], { encoding: 'utf8' });
fs.writeFileSync(args[1], generateParserSource(parser), { encoding: 'utf8' })