const ParseError = require("../lib/ParseError").default
const ParseSuccess = require("../lib/ParseSuccess").default
const Context = require("../lib/Context").default
const Grammar = require("../lib/Grammar").default
const Rule = require("../lib/Rule").default
const {Terminal, CharRange, Reference, Any, Sequence, Choice, Repeat, Optional, Not} = require("../lib/Rules")

function testRule(rule, source, pass = true, grammar = new Grammar({})) {
    var ctx = new Context(source, 0, {}, grammar);
    var match = rule.parse(ctx);
    console.log(source)
    console.log(match.toString())
    if (pass != (match instanceof ParseSuccess))
        throw new Error("Rule should have " + (pass ? "passed " : "failed ") + "but didn't!");
    console.log("PASSED!\n")
}

var alphaLower = new CharRange('a', 'z')
var alphaUpper = new CharRange('A', 'Z')
var alpha = new Choice(alphaLower, alphaUpper)
var num = new CharRange('0', '9')
var ws = new Terminal(" ")
var word = new Repeat(alpha, 1)
var number = new Repeat(num, 1)
var mws = new Repeat(ws, 1)
var end = new Not(new Any())
var comma = new Terminal(',')
function makeListRule(rule) {
    return new Sequence(
    rule,
     new Repeat(
         new Sequence(
             comma,
             rule
         )))
}

var test = new Sequence(word, mws, number, end)
testRule(test, "abc 123");

testRule(test, "abc 123!", false);

test = new Sequence(makeListRule(number), end)
testRule(test, "1,2,3,4,5");

var grammar = new Grammar({
    "list" : new Sequence(
        new Terminal('['),
        makeListRule(new Reference("value")),
        new Terminal(']')
        ),
    "value" : new Choice(number, new Reference("list"))
});
test = new Sequence(new Reference("list"), end)
testRule(new Sequence(new Reference("list"), end), "[1,[2,3],[4,[5]]]", true, grammar)
testRule(new Sequence(new Reference("list"), end), "[1,[2,3],[4,[5]]]]", false, grammar)
