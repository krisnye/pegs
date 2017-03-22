declare var require: (name:string) => any

let pegjs = require('./PegJsSelfParser.js')
let fs = require('fs')
let runtime = require('../runtime')

const red   = '\u001b[31m'
const endColor = '\u001b[0m'

// --------- AST proprocessing and analysis -------------- //

//Currently CustomPredicate and Action differ from their PEG.js analog in that they can't see higher scopes.
//This may cause problems.
function addScopeInformation (ast: any, parent: any = null, index = 0) {

    for (let member of ['rules', 'alternatives', 'elements']) {
        if (ast[member]) {
            let i = 0;
            for (let elem of ast[member])
                addScopeInformation(elem, ast, i++)
        }
    }

    if (ast.expression)
        addScopeInformation(ast.expression, ast, 0)

    if (ast.type == "action")
        ast.scope = scopeUpto(ast.expression)

    if (ast.type == "semantic_and")
        ast.scope = scopeUpto(parent, index)
}

function scopeUpto(ast: any, index: number = Infinity) {
    if (ast.type == "labeled")
        return [{name: ast.label, index: 0}]

    if (ast.type == "sequence") {
        let scope = []
        let i = 0
        for (let rule of ast.elements) {
            if (i >= index)
               break
            if (rule.type == "labeled")
                scope.push({name: rule.label, index: i})
            i++
        }
        return scope
    }

    return []
}

function badReference(ast: any) {
    let rules: any = {}
    let references: any = []
    rulesAndReferences(ast, rules, references)
    for (let ref of references) {
        if (rules[ref.name] == undefined)
            return ref
    }
}

function rulesAndReferences(ast: any, rules: any = {}, references: any = []){
    for (let member of ['rules', 'alternatives', 'elements']) {
        if (ast[member]) {
            for (let elem of ast[member])
                rulesAndReferences(elem, rules, references)
        }
    }

    if (ast.expression)
        rulesAndReferences(ast.expression, rules, references)

    if (ast.type == "rule")
        rules[ast.name] = true
    else if (ast.type == "rule_ref")
        references.push(ast)
}

// --------- Code generation -------------- //

//  creates a function that will extract named rules out into local variables for use by the function body
function createFunctionFromBody(scope: any[], body: string): string {
    let localVariables = scope.map(
        (elem) => {
            return "let " + elem.name + " = __values[" + elem.index + "]"
        }
    ).join(";\n")

    return "\nfunction(__context, __values) {\nlet location = () => __context.offset;\nlet text = () => __context.source[__context.offset - 1];\n" + localVariables + ";\n" + body + "}"
}

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
    let args = ast.parts.map((part: any) => convertCharClassPart(part, ast.ignoreCase, ast.invert))
    if (args.length == 1)
        return args[0]
    else
        return obj("Choice", ...args)
}

function convertCharClassPart(part: any, ignoreCase: any, invert: any) {
    if(typeof part == 'string') {
        return obj("Terminal", quote(part))
    } else {
        let args = [quote(part[0]), quote(part[1])]
        if (ignoreCase || invert) args.push(JSON.stringify(ignoreCase))
        if (invert) args.push('true')
        return obj("CharRange", ...args)
    }
}

function escapeRegExp(str: string) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

export function astToJS(ast: any): any {
    try {
    switch (ast.type) {
        case "grammar": return (ast.initializer ? ast.initializer.code + '\n' : "") + "exports.parser = " + obj("Parser", array(ast.rules.map(astToJS), ',\n\n'))
        case "choice": return obj("Choice", ...ast.alternatives.map(astToJS))
        case "sequence": return obj("Sequence", ...ast.elements.map(astToJS))
        case "group": return obj("Group", astToJS(ast.expression))
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
        case "action": return obj("Action", ensureSequence(ast.expression), createFunctionFromBody(ast.scope, ast.code))
        case "semantic_and": return obj("CustomPredicate", "''") + ".setHandler(" + createFunctionFromBody(ast.scope, ast.code) + ")"
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

let header: string[] = []
header.push("let runtime = require('../runtime')\n")
for (let key in runtime)
    header.push('let ' + key + ' = runtime.' + key)
header.push("\n")

export function generate(input: any, writeToFile = true, path = 'lib/compiler/Parser.js') {
    let ast = (typeof input == 'string') ? pegjs.parse(input) : input;
    let badRef: any = badReference(ast)
    if (badRef !== undefined) {
        console.log("Line: " + badRef.location.start.line + ' Column: ' + badRef.location.start.column + ", No such rule: " + badRef.name)
    }
    addScopeInformation(ast)
    let js = header.join('\n') + astToJS(ast);
    if (writeToFile)
        fs.writeFileSync(path, js)
    return js;
}

let text = fs.readFileSync('src/compiler/Input.pegjs', { encoding: 'utf8' });
generate(text as string)