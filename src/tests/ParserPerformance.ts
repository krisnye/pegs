declare var require: (name:string) => any

let fs = require('fs')

let pegs = require('../../lib/compiler/Parser.js').parser
let pegjs = require('../../lib/compiler/PegJsSelfParser.js')

let source = fs.readFileSync('src/tests/ParserInput', { encoding: 'utf8' });

function traverse(ast: any, callback: any) {
    try {
        callback(ast)
        for (let key in ast) {
            //console.log(key)
            traverse(ast[key], callback)
        }
    } catch(e) {}
}

let pegsTime = new Date().getTime()
let pegsOut = pegs.parse(source)
pegsTime = new Date().getTime() - pegsTime

let pegjsTime = new Date().getTime()
let pegjsOut = pegjs.parse(source)
pegjsTime = new Date().getTime() - pegjsTime

for (let ast of [pegsOut, pegjsOut]) traverse(ast, (ast: any) => {
    ast.location = undefined
    ast.end = undefined
})

pegsOut = JSON.stringify(pegsOut)
pegjsOut = JSON.stringify(pegjsOut)

if (pegsOut != pegjsOut) {
    console.log('Pegs output:\n')
    console.log(pegsOut)
    console.log('\n')
    console.log('PEGjs output:\n')
    console.log(pegjsOut)
    console.log("\nOutputs are unequal!\n")
    console.log('Pegs output length: ' + pegsOut.length)
    console.log('PEGjs output length: ' + pegjsOut.length)
}

console.log('\n')
console.log('Pegs parse time: ' + pegsTime + 'ms')
console.log('PEGjs parse time: ' + pegjsTime + 'ms')
console.log('\n')