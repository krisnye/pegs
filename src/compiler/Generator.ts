let peg = require('pegjs');
let fs = require('fs');

function obj(name: string, ...args: any[]) {
    return 'new ' + name + '(' + args.join(', ') + ')';
}

function array(args: any[], sep = ', ') {
    return '[' + args.join('\n') + ']';
}

function ensureSequence(expression: any) {
    if(expression.type == "sequence")
       return astToJS(expression)
    else
       return obj("Sequence", astToJS(expression))
}

function astToJS(ast: any): any {
    switch (ast.type) {
        // We need to add an initializer function to our grammars to correspond with pegjs initializers.
        case "grammar": return obj("Grammar", array(ast.rules.map(astToJS), ',\n'));
        case "choice": return obj.apply("Choice", ast.alternatives.map(astToJS));
        case "sequence": return obj.apply("Sequence", (ast.elements.map(astToJS)));
        case "rule_ref": return obj("Reference", JSON.stringify(ast.name));
        case "rule": return astToJS(ast.expression) + ".setName(" + JSON.stringify(ast.name) + ")";
        case "any": return obj("Any");
        case "literal": return obj("Terminal", JSON.stringify(ast.value))
        case "class": return obj("CharRange", JSON.stringify(ast.parts[0][0]), JSON.stringify(ast.parts[0][1]))
        // We should probably add an AndPredicate rule.
        case "simple_and": return obj("NotPredicate", obj("NotPredicate", astToJS(ast.expression)))
        case "simple_not": return obj("NotPredicate", astToJS(ast.expression))
        case "zero_or_more": return obj("Repeat", astToJS(ast.expression))
        case "one_or_more": return obj("Repeat", astToJS(ast.expression), "1")
        case "optional": return obj("Optional", astToJS(ast.expression))
        case "text": return obj("StringValue", astToJS(ast.expression))
        case "labeled": return astToJS(ast.expression) + ".setName(" + JSON.stringify(ast.label) + ")"
        case "action": return obj("Action", ensureSequence(ast.expression), JSON.stringify(ast.code))
        case "semantic_and": return obj("CustomPredicate", JSON.stringify(ast.code))
        //TODO: case "semantic_not": return 
    }
}

let parserText = fs.readFileSync('src/compiler/Parser.pegjs', { encoding: 'utf8' });
let parser = peg.generate(parserText);
let input = fs.readFileSync('src/compiler/Input.pegjs', { encoding: 'utf8' });
//let input = fs.readFileSync('src/compiler/Parser.pegjs', { encoding: 'utf8' });
let result = parser.parse(input);
console.log(result.rules[0])
console.log('\n')
let js = astToJS(result);
console.log(js);