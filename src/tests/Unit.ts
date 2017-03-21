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
start()

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

function testError(parser: Parser, source: string, expected: string) {
    testCount++
    try {
        parser.parse(source)
        testFails++
    }
    catch (e) {
        if (e.expected != expected) {
            testFails++
            console.log("Parsing " + source + " expected error " + expected +  ", actual error: " + e.message)
        }
        // else {
            console.log(e.message)
        // }
    }
}

function testRule(rule:Rule, source:string, pass: boolean | number = true, expectedValue?:any, parser = new Parser([])) {
    testCount++
    var context = new Context(parser, source)
    var value = rule.parse(context)
    var passed = Rule.passed(value)

    function fail(message: string) {
        testFails++
        console.log("rule: " + rule)
        console.log("source: " + source)
        console.log("result: " + passed)
        console.log(red + message)
    }

    var shouldFail = pass == false || typeof pass == 'number'
    //  if pass is a number that indicates an offset where an error is expected
    if (shouldFail == passed)
        return fail("Rule should have " + (pass ? "passed " : "failed ") + "but didn't!")

    if (typeof pass == 'number' && !passed) {
        if (context.failureOffsetStart != pass)
            return fail("Rule should have returned error offset " + pass + " but returned " + context.failureOffsetStart)
    }
    else {
        if (passed && expectedValue != null && JSON.stringify(value) != JSON.stringify(expectedValue))
            return fail("Rule value should have been " + JSON.stringify(expectedValue) + "but was " + JSON.stringify(value))
    }
}

var alphaLower = new CharRange('a', 'z')
var alphaUpper = new CharRange('A', 'Z')
var alpha = new Choice(alphaLower, alphaUpper)
var num = new CharRange('0', '9')
var ws = new Choice(new Terminal(" "), new Terminal("\r"), new Terminal("\n"))
var word = new Repeat(alpha, 1)
var number = new Repeat(num, 1)
var mws = new Repeat(ws, 1)
var __ = new Repeat(ws).setLabel('Whitespace')
var end = new NotPredicate(new Any())
var comma = new Terminal(',')
function makeListRule(rule:Rule) {
    return new Sequence(
        rule,
        new Repeat(
            new Sequence(
                __,
                comma,
                __,
                rule
            )
        )
    )
}

var test:Rule = new Sequence(word, mws, number, end)
testRule(test, "abc 123")
testRule(test, "abc 123!", 7)

testRule(new Sequence(makeListRule(number), end), "1,2,3,4,5")

var parser = new Parser([
    new Sequence(
        new Terminal('['),
        makeListRule(new Reference("value")),
        new Terminal(']')
    ).setName("list"),
    new Choice(number, new Reference("list")).setName("value")
]);
test = new Sequence(new Reference("list"), end);
testRule(test, "[1,[2,3],[4,[5]]]", true, null, parser)
testRule(test, "[1,[2,3],[4,[5]]]]", 17, null, parser)
testRule(test, "[1,[2,3],[4,[5]]", 16, null, parser)

// CharRange
test = new CharRange('A', 'z', true)
testRule(test, '[') // '[' is between A and z and should still match
test = new CharRange('a', 'z', true)
testRule(test, 'G')
test = new CharRange('a', 'z', false, true)
testRule(test, 'G')
testRule(test, 'g', false)
test = new CharRange('a', 'z', true, true)
testRule(test, 'G', false)
testRule(test, 'g', false)


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

//  test for good errors
parser = new Parser([
    new Sequence(
        new Terminal('['),
        __,
        //  Optional fails, but should be the farthest found.
        makeListRule(new Reference("value")).setName('values'),
        __,
        new Terminal(']')
    ).setName("list").setLabel('Array'),
    __,
    new Choice(number.setLabel('Number'), new Reference("list")).setName("value")
]);

testError(parser, "[1,\n    [2,3],\n    [x4,[5]\n    ]\n]", "Expected Number or Array")
testError(parser, "crap", "Expected Array")

//  TODO: Fix this, it's reporting too far up the rule stack, where offset isn't the same.
testError(parser, "[ 1,  \n[2,3],\n[4,[5]\n]", 'Expected "," or "]"')

finish()