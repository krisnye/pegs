let parser = require('../../lib/compiler/Parser.js')
let fs = require('fs')
import {
    Context,
    Grammar,
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

let grammar = parser.grammar
let input = fs.readFileSync('src/tests/ParserInput', { encoding: 'utf8' });
let c = new Context(grammar, input, 0)
let ref = new Reference("start")
let result = ref.parse(c)
console.log(result)
console.log(c.successValue)