let parser = require('../../lib/compiler/Parser.js')
import {
    Context,
    Grammar,
    Rule,
    ParseError,
    ParseSuccess,
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
console.log(Object.keys(grammar.rules))
let c = new Context(grammar, "a = b", 0)
let ref = new Reference("Grammar")
let result = ref.parse(c)
console.log(result)