import ParseError from "./ParseError"
import ParseSuccess from "./ParseSuccess"
import Context from "./Context";
import {Terminal, Sequence, Choice, Optional} from "./Rules";

var c = new Context();
c.source = "ab";

var a = new Terminal("a");
var b = new Terminal("b");
var s = new Sequence(new Optional(a), b);

var out = s.parse(c);
console.log(c.source);
console.log(out);