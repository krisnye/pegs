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
    match: string
    constructor(match: string) {
        this.match = match
        //  we can just cache success since they all look alike
        this.success = new ParseSuccess(this.match.length, this.match)
    }
    parse(context: Context) {
        for (let i = 0; i < this.match.length; i++) {
            if (context.source[context.offset + i] !== this.match[i])
                return new ParseError(this.match, context.offset + i)
        }
        return this.success
    }
}


//todo: memoize this.
export class CharRange implements Rule
{
    lower: number
    upper: number
    expectation: string;

    constructor(lower: string, upper: string) {
        this.lower = lower.charCodeAt(0)
        this.upper = upper.charCodeAt(0)
        if (this.lower > this.upper)
            throw new Error("Lower and upper characters are in wrong order!")
        this.expectation = '[' + lower + '-' + upper + ']'
    }

    parse(context: Context) {
        var code = context.source.charCodeAt(context.offset);
        if (this.lower <= code && this.upper >= code)
            return new ParseSuccess(1, context.source.charAt(context.offset));
        else
            return new ParseError(this.expectation, context.offset);
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
    rules: Rule[]

    constructor(...rules: Rule[]) {
        this.rules = rules;
    }

    parse(context: Context) {
        var contextClone = context.clone()
        var consumed = 0
        var result = []
        
        for (var rule of this.rules) {
            var match = rule.parse(contextClone)

            if (match instanceof ParseError)
                return match

            contextClone.update(match)
            result.push(match.result)
        }

        return new ParseSuccess(contextClone.offset - context.offset, result, contextClone.state)
    }
}

export class Choice implements Rule 
{
    rules: Rule[]

    constructor(...rules: Rule[]) {
        this.rules = rules
    }

    parse(context: Context) {
        var errors: ParseError[] = []
        for(var rule of this.rules) {
            var match = rule.parse(context)
            if (match instanceof ParseSuccess)
               return match
            
            errors.push(match)
        }

        var maxOffset = 0
        for (var error of errors) {
            if (error.offset > maxOffset)
                maxOffset = error.offset
        }

        var expectations: string[] = []
        for (var error of errors) {
            if (error.offset == maxOffset) {
                if (typeof error.expected == 'string')
                    expectations.push(error.expected)
                else
                    Array.prototype.push.apply(expectations, error.expected)
            }
        }        

        return new ParseError(expectations, maxOffset)
    }
}

export class Repeat implements Rule
{
    rule: Rule
    min: number
    max: number

    constructor(rule: Rule, min: number = 0, max: number = Number.MAX_VALUE) {
        this.rule = rule
        this.max = max
        this.min = min
    }

    parse(context: Context) {
        var contextClone = context.clone()
        var matches = 0
        var result: any[] = []

        while (matches < this.max) {
            var match = this.rule.parse(contextClone)
            if (match instanceof ParseSuccess) {
                matches++
                contextClone.update(match)
                result.push(match.result)
            } else if (matches < this.min) {
                return match
            } else {
                break
            }
        }

         return new ParseSuccess(contextClone.offset - context.offset, result, contextClone.state)
    }
}

export class Optional implements Rule
{
    rule: Rule

    constructor(rule: Rule) {
        this.rule = rule
    }

    parse(context: Context){
        var match = this.rule.parse(context)
        if (match instanceof ParseSuccess)
            return match
        return new ParseSuccess(0, null)
    }
}

export class Not implements Rule
{
    rule: Rule

    constructor(rule: Rule) {
        this.rule = rule
    }

    parse(context: Context){
        var match = this.rule.parse(context)
        if (match instanceof ParseSuccess)
            return new ParseError("Not " + this.rule, context.offset)
             //todo: Not sure how to get proper expectation here. Perhaps a new Rule.toString() method?
        return new ParseSuccess(0, null)
    }
}