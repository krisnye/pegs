let peg = global.require('pegjs')
let fs = global.require('fs')
let runtime = global.require('../runtime')

const red   = '\u001b[31m'
const endColor = '\u001b[0m'

let header = []
header.push("let runtime = require('../runtime')")
for(let key in runtime)
    header.push('let ' + key + ' = runtime.' + key)

function obj(name: string, ...args: any[]) {
    return 'new ' + name + '(' + args.join(', ') + ')';
}

function array(args: any[], sep = ', ') {
    return '[' + args.join(sep) + ']';
}

//convert to sequence since Rules.Action only accepts a sequence
function ensureSequence(ast: any) {
    if(ast.type == "sequence")
       return astToJS(ast)
    else
       return obj("Sequence", astToJS(ast))
}

function hex(ch: any) { return ch.charCodeAt(0).toString(16).toUpperCase() }

function quote(s: any) {
    return '"' + s
      .replace(/\\/g,   '\\\\')   // backslash
      .replace(/"/g,    '\\"')    // closing double quote
      .replace(/\0/g,   '\\0')    // null
      .replace(/\x08/g, '\\b')    // backspace
      .replace(/\t/g,   '\\t')    // horizontal tab
      .replace(/\n/g,   '\\n')    // line feed
      .replace(/\f/g,   '\\f')    // form feed
      .replace(/\r/g,   '\\r')    // carriage return
      .replace(/[\x00-\x0F]/g,          function(ch: any) { return '\\x0' + hex(ch) })
      .replace(/[\x10-\x1F\x7F-\xFF]/g, function(ch: any) { return '\\x'  + hex(ch) })
      .replace(/[\u0100-\u0FFF]/g,      function(ch: any) { return '\\u0' + hex(ch) })
      .replace(/[\u1000-\uFFFF]/g,      function(ch: any) { return '\\u'  + hex(ch) }) + '"'
  }

function convertCharClass(ast: any) {
    let args = ast.parts.map(convertCharClassPart)
    if(args.length == 1)
        return args[0]
    else
        return obj("Choice", ...args)
}

function convertCharClassPart(part: any) {
    if(typeof part == 'string')
        return obj("Terminal", quote(part))
    else
        return obj("CharRange", quote(part[0]), quote(part[1]))
}

function astToJS(ast: any): any {
    try {
    switch (ast.type) {
        // We may want to add an initializer function to our grammars to correspond with pegjs initializers.
        case "choice": return obj("Choice", ...ast.alternatives.map(astToJS))
        case "sequence": return obj("Sequence", ...ast.elements.map(astToJS))
        // Group is an expression in parenthesis. 
        // It's important because it acts as a local scope. EG: (k:a) {return k} != k:a {return k}
        // For now a Rules.Sequence works fine for restricting scope.
        case "group": return obj("Sequence", astToJS(ast.expression))
        case "rule_ref": return obj("Reference", JSON.stringify(ast.name));
        case "rule": return astToJS(ast.expression) + ".setName(" + JSON.stringify(ast.name) + ")"
        case "any": return obj("Any");
        case "literal": return obj("Terminal", quote(ast.value))
        case "class": return convertCharClass(ast)
        // We should probably add an AndPredicate rule.
        case "simple_and": return obj("NotPredicate", obj("NotPredicate", astToJS(ast.expression)))
        case "simple_not": return obj("NotPredicate", astToJS(ast.expression))
        case "zero_or_more": return obj("Repeat", astToJS(ast.expression))
        case "one_or_more": return obj("Repeat", astToJS(ast.expression), "1")
        case "optional": return obj("Optional", astToJS(ast.expression))
        case "text": return obj("StringValue", astToJS(ast.expression))
        // We use name where pegjs uses label and label where pegjs uses name.
        case "labeled": return astToJS(ast.expression) + ".setName(" + JSON.stringify(ast.label) + ")"
        case "named": return astToJS(ast.expression) + ".setLabel(" + JSON.stringify(ast.name) + ")"
        case "action": return obj("Action", ensureSequence(ast.expression), JSON.stringify(ast.code))
        case "semantic_and": return obj("CustomPredicate", JSON.stringify(ast.code))
        //case "semantic_not": 
    } }
    catch (e) {
        console.log(red, e.message, endColor)
        console.log(red, ast, endColor)
        return "<ERROR:" + ast.type + ">"
    }

    console.log(red, "Unrecognized rule type: " + ast.type, endColor)
    console.log(red, ast, endColor)
    return "<ERROR:" + ast.type + ">"
}

let parserText = fs.readFileSync('src/compiler/Parser.pegjs', { encoding: 'utf8' });
let parser = peg.generate(parserText);
//let input = fs.readFileSync('src/compiler/Input.pegjs', { encoding: 'utf8' });
let input = fs.readFileSync('src/compiler/Parser.pegjs', { encoding: 'utf8' });
let result = parser.parse(input);
let js = header.join('\n') + astToJS(result);
fs.writeFileSync('lib/compiler/Output.js', js)
console.log(js);