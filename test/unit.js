const ParseError = require("../lib/ParseError").default
const ParseSuccess = require("../lib/ParseSuccess").default
const Context = require("../lib/Context").default
const Grammar = require("../lib/Grammar").default
const Rule = require("../lib/Rule").default
const {Terminal, CharRange, Reference, Any, Sequence, Choice, Repeat, Optional, Not, Extract, Action} = require("../lib/Rules")

function testRule(rule, source, pass = true, value, grammar = new Grammar({})) {
    var ctx = new Context(grammar, source, 0, {});
    var match = rule.parse(ctx);
    console.log(source)
    console.log(match.toString())
    if (pass != (match instanceof ParseSuccess))
        throw new Error("Rule should have " + (pass ? "passed " : "failed ") + "but didn't!");
    if (value != null && JSON.stringify(match.value) != JSON.stringify(value))
        throw new Error("Rule value should have been " + JSON.stringify(value) + "but was " + JSON.stringify(match.value));
    console.log("PASSED!\n")
}

function name(name, rule) {
    rule.name = name
    return rule
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
            )
        )
    )
}

var test = new Sequence(word, mws, number, end)
testRule(test, "abc 123");
testRule(test, "abc 123!", false);

testRule(new Sequence(makeListRule(number), end), "1,2,3,4,5");

var grammar = new Grammar([
    name("list", new Sequence(
            new Terminal('['),
            makeListRule(new Reference("value")),
            new Terminal(']')
        )
    ),
    name("value", new Choice(number, new Reference("list")))
]);
test = new Sequence(new Reference("list"), end);
testRule(test, "[1,[2,3],[4,[5]]]", true, null, grammar)
testRule(test, "[1,[2,3],[4,[5]]]]", false, null, grammar)

test = new Extract(new Sequence(new Terminal("a"), new Terminal("b"), new Terminal("c")), 1)
testRule(test, "abc", true, "b")

test = new Action(
    new Sequence(name("alpha", new Terminal("a")), new Terminal("b"), name("charlie", new Terminal("c"))),
    "return alpha + charlie"
)
testRule(test, "abc", true, "ac")