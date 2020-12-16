// declare var require: (name:string) => any

let pegjs = require('./PegJsSelfParser.js')
let fs = require('fs')

import * as runtime from "../runtime"

const red   = '\u001b[31m'
const endColor = '\u001b[0m'

// ---- AST preprocessing and analysis ---- //

// Traverses the ast and calls a callback for each node.
function traverse(ast: any, callback: any, parent: any = null, index: any = 0) {
    callback(ast, parent, index)
    for (let key of ['rules', 'alternatives', 'elements']) {
        if (ast[key]) {
            let i = 0;
            for (let elem of ast[key]) traverse(elem, callback, ast, i++)
        }
    }
    if (ast.expression) traverse(ast.expression, callback, ast, 0)
}

// Traverses the ast and calls a callback for each node. If the callback returns a value other than undefined, it replaces the node it's called on.
// Callbacks are ordered so they are only called once all a node's children have been processed.
function transform(ast: any, callback: any, parent: any = null, index: any = 0) {
    for (let key of ['rules', 'alternatives', 'elements']) {
        if (ast[key]) {
            let i = 0;
            for (let elem of ast[key]) {
                let child = transform(elem, callback, ast, i)
                if (child !== undefined) ast[key][i] = child
                i++
            }
        }
    }
    if (ast.expression) {
        let child = transform(ast.expression, callback, ast, 0)
        if (child !== undefined) ast.expression = child
    }
    let result = callback(ast, parent, index)
    //if (result) console.log('converted ' + ast.type + ' to ' + result.type)
    return result
}

function forChildren(ast: any, callback: any) {
    for (let member of ['rules', 'alternatives', 'elements']) {
        if (ast[member]) {
            let i = 0;
            for (let elem of ast[member]) callback(elem)
        }
    }
    if (ast.expression) callback(ast.expression)
}

//Currently CustomPredicate and Action differ from their PEG.js analog in that they can't see higher scopes.
//This may cause problems.

function addScopeInformation (ast: any) {
    traverse(ast, function(ast: any, parent: any, index: any) {
        if (ast.type == "action") ast.scope = scopeUpto(ast.expression)
        if (ast.type == "semantic_and") ast.scope = scopeUpto(parent, index)
    })
}

function scopeUpto(ast: any, index: number = Infinity) {
    if (ast.type == "labeled") return [{name: ast.label, index: 0}]

    if (ast.type == "sequence") {
        let scope = []
        let i = 0
        for (let rule of ast.elements) {
            if (i >= index) break
            if (rule.type == "labeled") scope.push({name: rule.label, index: i})
            i++
        }
        return scope
    }
    return []
}

function getRuleMap(grammar: any) {
    let rules: any = {}
    forChildren(grammar, function(rule: any) { rules[rule.name] = rule })
    return rules
}

function checkRefences(grammar: any) {
    let rules = getRuleMap(grammar)
    traverse(grammar, function(ast: any) { 
        if (ast.type == "rule_ref" && rules[ast.name] === undefined) {
            console.log(
                red, 
                "\n\nLine: " +
                ast.location.start.line +
                ' Column: ' +
                ast.location.start.column +
                ", No such rule: " +
                ast.name +
                '\n\n',
                endColor)
        } 
    })
}

function childrenAreCompatibleRegex(ast: any) {
    let result = true
    let flags: any = null
    let i = 0
    forChildren(ast, function(child: any) {
         if (i++ == 0) flags = child.flags
         if (flags != child.flags) result = false
         if (child.type != "regex") result = false
    })
    return result
}

function regexify(grammar: any) {
    let ruleMap: any = getRuleMap(grammar)
    forChildren(grammar, function(rule: any) { regexifyRule(rule, ruleMap) })
}

function regexifyRule(rule: any, ruleMap: any) {
    if (rule.REGEXIFIED) return
    rule.REGEXIFIED = true
    transform(rule, function(ast: any) {
        if (!childrenAreCompatibleRegex(ast)) return
        let result: any = {type: 'regex', flags: ''}
        switch(ast.type) {
            case "class" : {
                let parts = ast.parts.map(classPartToRegex).join('')
                result.source =  (ast.inverted ? '[^' : '[') + parts + ']'
                result.flags = ast.ignoreCase ? 'i' : ''
                return result }
            case "any" : {
                result.source = '[^]'
                return result }
            case "named" : {
                return ast.expression }
            case "text" : {
                return ast.expression }
            case "group" : {
                return ast.expression }
            case "choice" : {
                result.source = ast.alternatives.map((child: any) => child.source).join('|')
                result.flags = ast.alternatives[0].flags
                return result }
            case "rule_ref" : {
                let deref = ruleMap[ast.name]
                regexifyRule(deref, ruleMap)
                if (deref.expression.type !== "regex") return
                return deref.expression }
            // case "optional" : {
            //     result.source = '(?:' + ast.expression.source + ')'
            //     result.flags = ast.expression.flags
            //     return result }
            // case "simple_not": {
            //     result.source = '(?!(' + ast.expression.source + '))'
            //     result.flags = ast.expression.flags
            //     return result }
            // case "literal": {
            //     result.source = escapeRegExp(ast.value)
            //     return result }
            // case "sequence" : {
            //     result.source = ast.elements.map((child: any) => child.source).join('')
            //     result.flags = ast.elements[0].flags
            //     return result }
            // case "one_or_more" : { 
            //     if (ast.expression.nonconsuming) return ast.expression
            //     result.source = '((' + ast.expression.source + ')+)'
            //     result.flags = ast.expression.flags
            //     return result }
            // case "zero_or_more" : {
            //     if (ast.expression.nonconsuming) return ast.expression
            //     result.source = '((' + ast.expression.source + ')*)'
            //     result.flags = ast.expression.flags
            //     result.nonconsuming = true
            //     return result }
        }
    })
}

// ---- Parser generation ---- //

//  creates a function that will extract named rules out into local variables for use by the function body
function createFunctionFromBody(scope: any[], body: string): string {
    let localVariables = scope.map( (elem) => "let " + elem.name + " = __values[" + elem.index + "]" ).join(";\n")
    return "(\nfunction(__context, __values) {\n" + localVariables + ";\n" + body + "})"
}

function obj(name: string, ...args: any[]) { return 'new ' + name + '(' + args.join(', ') + ')'; }
function array(args: any[], sep = ', ') { return '[' + args.join(sep) + ']'; }

//convert to sequence since Rules.Action only accepts a sequence
function ensureSequence(ast: any) { return ast.type == "sequence" ? ast : { type:"sequence", elements: [ast] } }

function hex(ch: any) { return ch.charCodeAt(0).toString(16).toUpperCase() }
function quote(s: any) { return '"' + escapeString(s) + '"' }
function escapeRegExp(str: string) { return escapeString(str).replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\^\$\|]/g, "\\$&"); }
function escapeString(s: any) {
    return s
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
      .replace(/[\u1000-\uFFFF]/g,      function(ch: any) { return '\\u'  + hex(ch) })
}

function classPartToRegex(part: any) { return typeof part == 'string' ? escapeRegExp(part) : escapeRegExp(part[0]) + '-' + escapeRegExp(part[1]) }
function classToRegex(ast: any) {
    let parts = ast.parts.map(classPartToRegex).join('')
    return (ast.inverted ? '/[^' : '/[') + parts + (ast.ignoreCase ? ']/yi': ']/y')
 }

function grammarToJS(ast: any): any {

    let imports: string[] = [];
    for (let key in runtime) imports.push('var ' + key + ' = runtime.' + key)

    return [
`(function() {
var runtime
try { runtime = require('pegs') } catch (e) {}
if (runtime == null) { /* use r to avoid parcel trying to resolve path */ var r = require; runtime = r('../runtime') }`,

imports.join('\n'),
`
    return function(options) {
        if (options == null)
            options = {}
        var parser
        var location = function() {
            return parser.context.location()
        }
        var text = function() {
            let loc = location()
            return parser.context.source.substring(loc.start.offset, loc.end.offset)
        }
`,
(ast.initializer ? ast.initializer.code + '\n' : ""),
`       parser = ` + obj("Parser", obj("Grammar", array(ast.rules.map(astToJS), ',\n\n'))),
`
        return parser
    }
})()
`
    ].join('\n')
}

export function astToJS(ast: any): any {
    try {
    switch (ast.type) {
        case "grammar": return grammarToJS(ast)
        case "choice": return obj("Choice", ...ast.alternatives.map(astToJS))
        case "sequence": return obj("Sequence", ...ast.elements.map(astToJS))
        case "group": return obj("Group", astToJS(ast.expression))
        case "rule_ref": return obj("Reference", JSON.stringify(ast.name));
        case "rule": return astToJS(ast.expression) + ".setName(" + JSON.stringify(ast.name) + ")"
        case "any": return obj("Any");
        case "literal": return obj("Terminal", quote(ast.value))
        case "class": return obj("Regex", classToRegex(ast))
        case "regex": return obj("Regex", '/' + ast.source + '/y' + ast.flags)
        // We should probably add an AndPredicate rule.
        case "simple_and": return obj("NotPredicate", obj("NotPredicate", astToJS(ast.expression)))
        case "simple_not": return obj("NotPredicate", astToJS(ast.expression))
        case "zero_or_more": return obj("Repeat", astToJS(ast.expression))
        case "one_or_more": return obj("Repeat", astToJS(ast.expression), "1")
        case "repeat": return obj("Repeat", astToJS(ast.expression), ast.min, ast.max)
        case "optional": return obj("Optional", astToJS(ast.expression))
        case "text": return obj("StringValue", astToJS(ast.expression))
        // We use name where pegjs uses label and label where pegjs uses name.
        case "labeled": return astToJS(ast.expression) + ".setName(" + JSON.stringify(ast.label) + ")"
        case "named": return astToJS(ast.expression) + ".setLabel(" + JSON.stringify(ast.name) + ")"
        case "action": return obj("Action", astToJS(ensureSequence(ast.expression)), createFunctionFromBody(ast.scope, ast.code))
        case "semantic_and": return obj("CustomPredicate", "''") + ".setHandler(" + createFunctionFromBody(ast.scope, ast.code) + ")"
        //case "semantic_not": 
        case "increment_state": return obj("Increment", ast.name, ast.step)
    } }
    catch (e) {
        console.log(red, ast, endColor)
        console.log()
        console.log(red, e.message, endColor)
        console.log()
        return "<ERROR:" + ast.type + ">"
    }

    console.log(red, ast, endColor)
    console.log()
    console.log(red, "Unrecognized rule type: " + ast.type, endColor)
    console.log()
    return "<ERROR:" + ast.type + ">"
}

function sourceToAst(input: string) {
    let ast = pegjs.parse(input)
    checkRefences(ast)
    // regexify saves 25% on time but it makes for ugly bug reporting
    //regexify(ast)
    addScopeInformation(ast)
    return ast
}

// ---- API ---- //

export function generateParserSource(source: string) {
    let js = astToJS(sourceToAst(source))
    return `module.exports = exports = ${js};\nexports.default = exports`;
    // return `export default ${js.trim()};\n`;
}

export function generateParser(source: string): runtime.Parser {
    let ParserType = eval(astToJS(sourceToAst(source)))
    return ParserType()
}