import ParseError from "./ParseError"
import ParseSuccess from "./ParseSuccess"
import Context from "./Context"
import Grammar from "./Grammar"
import {Terminal, Sequence, Choice, Optional} from "./Rules";

var ctx = new Context("bbb", 0, {}, new Grammar({}));

var a = new Terminal("a");
var b = new Terminal("b");
var c = new Terminal("c");
var aaa = new Sequence(a, a, a, c);
var bbb = new Sequence(b, b, b, c);
var ch = new Choice(aaa, bbb);

var out = ch.parse(ctx);
console.log(ctx.source);
console.log(out);