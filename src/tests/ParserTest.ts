declare var require: (name:string) => any

let parser = require('../../lib/compiler/Parser.js')
let fs = require('fs')
import {
    Context,
    Parser,
    Rule,
    Terminal,
    CharRange,
    Reference,
    Any,
    Sequence,
    Choice,
    Repeat,
    Optional,
    NotPredicate,
    Extract,
    Action,
    StringValue,
    CustomPredicate
} from "../runtime"
import {
    generate
} from "../compiler/Generator"

parser = parser.grammar
let input = fs.readFileSync('src/tests/ParserInput', { encoding: 'utf8' });
let c = new Context(parser, input)
let ref = new Reference("Grammar")
let result = ref.parse(c)
// console.log(result)
// console.log(JSON.stringify(result))
let converted = generate(result, false)
console.log(converted)