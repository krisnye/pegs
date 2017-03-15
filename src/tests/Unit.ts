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

const red   = '\u001b[31m'
const blue  = '\u001b[36m'
const green = '\u001b[32m'
const endColor = '\u001b[0m'

let testStart = 0
let testCount = 0
let testFails = 0
function start() {
    testStart = new Date().getTime()
}
function finish() {
    let testFinish = new Date().getTime()
    let time = testFinish - testStart
    let testPass = testCount - testFails
    let color = testFails ? red : blue

    if (testFails == 0) {
        console.log(color + testPass + "/" + testCount + " Passed (" + time + "ms)" + endColor)
    }
    else {
        console.log(color + testFails + "/" + testCount + " Failed (" + time + "ms)" + endColor)
    }
}
start()

function testRule(rule:Rule, source:string, pass: boolean | number = true, value?:any, grammar = new Grammar([])) {
    testCount++
    var context = new Context(grammar, source, 0, {})
    var result = rule.parse(context)

    function fail(message: string) {
        testFails++
        console.log("rule: " + rule)
        console.log("source: " + source)
        console.log("result: " + result)

        console.log(red + message)
    }

    var shouldFail = pass == false || typeof pass == 'number'
    //  if pass is a number that indicates an offset where an error is expected
    if (shouldFail == (result instanceof ParseSuccess))
        return fail("Rule should have " + (pass ? "passed " : "failed ") + "but didn't!")

    if (typeof pass == 'number' && result instanceof ParseError) {
        if (result.offset != pass)
            return fail("Rule should have returned error offset " + pass + " but returned " + result.offset)
    }
    else {
        if (result instanceof ParseSuccess && value != null && JSON.stringify(result.value) != JSON.stringify(value))
            return fail("Rule value should have been " + JSON.stringify(value) + "but was " + JSON.stringify(result.value))
    }
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
testRule(test, "abc 123!", 7)

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
testRule(test, "[1,[2,3],[4,[5]]]]", 17, null, grammar)
testRule(test, "[1,[2,3],[4,[5]]", 16, null, grammar)

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
testRule(test, "abc", 2)

//  test for proper errors.
testRule(test, "abd", 2)

finish()