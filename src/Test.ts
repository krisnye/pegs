import ParseError from "./ParseError"
import ParseSuccess from "./ParseSuccess"
import Context from "./Context"
import Grammar from "./Grammar"
import Rule from "./Rule"
import {Terminal, CharRange, Reference, Any, Sequence, Choice, Repeat, Optional, Not} from "./Rules";

function prettyJSON(obj: any) {
    var result = "";
    var count = 0;
    if (Array.isArray(obj)) {
        result += '[';
        for (var elem of obj) {
            if(count > 0)
                result += ', '
            result += prettyJSON(elem);
            count++;
        }
        result += ']';
    } else if (typeof obj === 'object') {
        result += '{';
        for (var key in obj) {
            if(count > 0)
                result += ', '
            result += key + ' : ';
            result += prettyJSON(obj[key]);
            count++;
        }
        result += '}';
    } else {
        result += JSON.stringify(obj);
    }
    return result;
}

function testRule(rule: Rule, source: string, pass: boolean = true, grammar: Grammar = new Grammar({})) {
    var ctx = new Context(source, 0, {}, grammar);
    var match = rule.parse(ctx);
    console.log(source)
    console.log(prettyJSON(match))
    if (pass != (match instanceof ParseSuccess))
        throw new Error("Rule should have " + (pass ? "passed " : "failed ") + "but didn't!");
    console.log("PASSED!\n")
}

var ctx = new Context("", 0, {}, new Grammar({}))
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
function makeListRule(rule: Rule) {
    return new Sequence(
    rule,
     new Repeat(
         new Sequence(
             comma,
             rule
         )))
}

ctx.source = "abc 123"
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