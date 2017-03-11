import Context from "./Context"
import ParseError from "./ParseError"
import ParseSuccess from "./ParseSuccess"
import Rule from "./Rule"

export class Terminal implements Rule
{
    match: string

    constructor(match: string) {
        this.match = match
    }

    parse(context: Context) {
        for (let i = 0; i < this.match.length; i++) {
            if (context.source[context.offset + i] !== this.match[i])
                return new ParseError(this.match, context.offset)
        }
        return new ParseSuccess(this.match.length, this.match)
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
}