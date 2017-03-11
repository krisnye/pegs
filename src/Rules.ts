import Context from "./Context"
import ParseError from "./ParseError"
import ParseSuccess from "./ParseSuccess"
import Rule from "./Rule"

//  memoization function to improve performance
function memoize<O>(fn: (input:string) => O) {
    let cache: {[input:string]:O} = {}
    return function (input:string) {
        let result = cache[input]
        if (result == null)
            result = cache[input] = fn(input)
        return result
    }
}

//  tries to match an exact string and return it
export class Terminal implements Rule
{
    success: ParseSuccess
    error: ParseError
    match: string
    constructor(match: string) {
        this.match = match
        //  we can just cache success since they all look alike
        this.success = new ParseSuccess(this.match.length, this.match)
        this.error = new ParseError(this.match)
    }
    parse(context: Context) {
        for (let i = 0; i < this.match.length; i++) {
            if (context.source[context.offset + i] !== this.match[i])
                return this.error
        }
        return this.success
    }
}

export class Reference implements Rule
{
    name: string
    constructor(name: string) {
        this.name = name
    }
    parse(context: Context) {
        let rule = context.grammar.rules[this.name]
        return rule.parse(context)
    }

}

var anyMemoized = memoize(function(char: string) {
    if (char == null)
        return new ParseError("<any>")
    else
        return new ParseSuccess(1, char)
})
export class Any implements Rule
{
    parse(context: Context) {
        return anyMemoized(context.source[context.offset])
    }
}

export class Sequence implements Rule
{
    rules: Rule[] = []
    labels: {[key: number]: string} = {}
    mapped: boolean //The output is a labeled map of certain parts of the sequence.
    single: boolean //The output is a single value.

    constructor(...params: (string | Rule)[]) {
        var ruleIndex = 0;
        this.rules = [];
        for(var part of params) {
            if(typeof part === 'string') {
                this.mapped = true;
                this.single = part === '@';
                this.labels[ruleIndex] = part;
            } else {
                ruleIndex++;
                this.rules.push(part);
            }
        }
    }

    parse(context: Context) {
        var consumed = 0;
        var result;
        result = this.mapped ? {} : [];

        var ruleIndex = 0;
        for(var rule of this.rules) {
            var parseResult = rule.parse(context);

            if(parseResult instanceof ParseError)
                return parseResult;

            context.offset += parseResult.consumed;
            consumed += parseResult.consumed;

            if(this.mapped) {
                var label = this.labels[ruleIndex];
                if(label !== undefined){
                    if(this.single)
                        result = parseResult.result;
                    else
                        result[label] = parseResult.result;
                }
            } else {
                result.push(parseResult.result);
            }

            if(parseResult.state != null)
                context.state = parseResult.state;

            ruleIndex++;
        }
        return new ParseSuccess(consumed, result, context.state);
    }
}

export class Choice implements Rule 
{
    rules: Rule[]

    constructor(...rules: Rule[]) {
        this.rules = rules;
    }

    parse(context: Context) {
        var expectations: string[] = [];
        for(var rule of this.rules) {
            var parseResult = rule.parse(context);
            if(parseResult instanceof ParseSuccess)
               return parseResult;
            
            expectations.push(parseResult.expected);
        }

        return new ParseError(expectations.join(','), context.offset);
    }
}

export class Optional implements Rule
{
    rule: Rule

    constructor(rule: Rule) {
        this.rule = rule;
    }

    parse(context: Context){
        var parseResult = this.rule.parse(context);
        if(parseResult instanceof ParseSuccess)
            return parseResult;
        return new ParseSuccess(0, null, context.state);
    }
}

// export class Repeat implements Rule
// {
//     rule: Rule
//     min: number
//     max: number

//     constructor(rule: Rule, min: number = 0, max: number = Number.MAX_VALUE) {
//         this.rule = rule;
//         this.max = max;
//         this.min = min;
//     }

//     parse(context: Context) {
//         var matches = 0;
//         while(true) {
//             var parseResult = this.rule.parse(context);
//             if(parseResult instanceof ParseSuccess){

//             }
//         }
//     }
//}