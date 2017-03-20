// let parser = require('../../lib/compiler/Parser.js')
// let fs = require('fs')
// import {
//     Context,
//     Parser,
//     Rule,
//     Terminal,
//     CharRange,
//     Reference,
//     Any,
//     Sequence,
//     Choice,
//     Repeat,
//     Optional,
//     NotPredicate,
//     Extract,
//     Action,
//     StringValue,
//     CustomPredicate
// } from "../runtime"
// import {
//     generate
// } from "../compiler/Generator"

// let parser = parser.grammar
// let input = fs.readFileSync('src/tests/ParserInput', { encoding: 'utf8' });
// let c = new Context(parser, input, 0)
// let ref = new Reference("Grammar")
// let result = ref.parse(c)
// console.log(result)
// console.log(c.successValue)
// console.log(JSON.stringify(c.successValue))

// let converted = generate(c.successValue, false)
// console.log(converted)