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

function testRule(rule:Rule, source:string, pass = true, value?:any, grammar = new Grammar([])) {
    var ctx = new Context(grammar, source, 0, {})
    var match = rule.parse(ctx)
    console.log(source)
    console.log(match.toString())
    if (pass != (match instanceof ParseSuccess))
        throw new Error("Rule should have " + (pass ? "passed " : "failed ") + "but didn't!")
    if (match instanceof ParseSuccess && value != null && JSON.stringify(match.value) != JSON.stringify(value))
        throw new Error("Rule value should have been " + JSON.stringify(value) + "but was " + JSON.stringify(match.value))
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
var ows = new Repeat(ws)
var end = new NotPredicate(new Any())
var comma = new Terminal(',')
function makeListRule(rule:Rule) {
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

var test:Rule = new Sequence(word, mws, number, end)
testRule(test, "abc 123")
testRule(test, "abc 123!", false)

testRule(new Sequence(makeListRule(number), end), "1,2,3,4,5")

var grammar = new Grammar([
    new Sequence(
        new Terminal('['),
        makeListRule(new Reference("value")),
        new Terminal(']')
    ).setName("list"),
    new Choice(number, new Reference("list")).setName("value")
]);
test = new Sequence(new Reference("list"), end);
testRule(test, "[1,[2,3],[4,[5]]]", true, null, grammar)
testRule(test, "[1,[2,3],[4,[5]]]]", false, null, grammar)

//  Extract
test = new Extract(new Sequence(new Terminal("a"), new Terminal("b"), new Terminal("c")), 1)
testRule(test, "abc", true, "b")

//  Action
test = new Action(
    new Sequence(new Terminal("a").setName("alpha"), new Terminal("b"), new Terminal("c").setName("charlie")),
    "return alpha + charlie"
)
testRule(test, "abc", true, "ac")

//  StringValue
// now wrap that previous test in a string value
test = new StringValue(test)
testRule(test, "abc", true, "abc")

//  CustomPredicate
test = new Sequence(
    new Terminal("a").setName("alpha"),
    new Terminal("b").setName("bravo"),
    //  we check that alpha and bravo are present and that charlie is not defined since it isn't a preceding rule
    new CustomPredicate("return alpha == 'a' && bravo == 'b' && typeof charlie == 'undefined'"),
    new Terminal("c").setName("charlie")
)

testRule(test, "abc", true, ["a","b", null, "c"])

test = new Sequence(
    new Terminal("a").setName("alpha"),
    new Terminal("b").setName("bravo"),
    new CustomPredicate("return alpha == bravo"),
    new Terminal("c").setName("charlie")
)
testRule(test, "abc", false)