// declare var require: (name:string) => any
var fs = require('fs')
var pegjs = require('../../lib/compiler/PegJsSelfParser.js')

// This needs to be updated to use new Grammar object.

// import {
//     generateParser
// } from "../compiler"

// function traverse(ast: any, callback: any) {
//     try {
//         callback(ast)
//         for (let key in ast) {
//             //console.log(key)
//             traverse(ast[key], callback)
//         }
//     } catch(e) {}
// }

// var parser = fs.readFileSync('src/tests/Parser.pegjs', { encoding: 'utf8' });
// var source = fs.readFileSync('src/tests/ParserInput', { encoding: 'utf8' });

// let pegs: any = generateParser(parser)
// var count = 10

// var pegsTime = new Date().getTime()
// for (let i = 0; i < count; i++)
//     pegs.parse(source)
// var pegsOut = pegs.parse(source)
// pegsTime = new Date().getTime() - pegsTime

// var pegjsTime = new Date().getTime()
// for (let i = 0; i < count; i++)
//     pegjs.parse(source)
// var pegjsOut = pegjs.parse(source)
// pegjsTime = new Date().getTime() - pegjsTime

// for (let ast of [pegsOut, pegjsOut]) traverse(ast, (ast: any) => {
//     ast.location = undefined
//     ast.end = undefined
// })

// pegsOut = JSON.stringify(pegsOut)
// pegjsOut = JSON.stringify(pegjsOut)

// if (pegsOut != pegjsOut) {
//     console.log('Pegs output:\n')
//     console.log(pegsOut)
//     console.log('\n')
//     console.log('PEGjs output:\n')
//     console.log(pegjsOut)
//     console.log("\nOutputs are unequal!\n")
//     console.log('Pegs output length: ' + pegsOut.length)
//     console.log('PEGjs output length: ' + pegjsOut.length)
// }

// console.log('\n')
// console.log('Pegs parse time: ' + pegsTime + 'ms')
// console.log('PEGjs parse time: ' + pegjsTime + 'ms')
// console.log('Relative Time: ' + pegsTime / pegjsTime)
// console.log('\n')