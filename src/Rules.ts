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
export class Terminal extends Rule
{
    success: ParseSuccess
    match: string
    constructor(match: string) {
        super()
        this.match = match
        //  we can just cache success since they all look alike
        //  using Object.defineProperty so it's not enumerable
        Object.defineProperty(this, 'success', {value: new ParseSuccess(this, this.match.length, this.match)})
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
export class CharRange extends Rule
{
    lower: number
    upper: number

    constructor(lower: string, upper: string) {
        super()
        this.lower = lower.charCodeAt(0)
        this.upper = upper.charCodeAt(0)
        if (this.lower > this.upper)
            throw new Error("Lower and upper characters are in wrong order!")
    }

    parse(context: Context) {
        var code = context.source.charCodeAt(context.offset);
        if (this.lower <= code && this.upper >= code)
            return new ParseSuccess(this, 1, context.source.charAt(context.offset));
        else
            return new ParseError(this, context.offset);
    }

    toString(): string {
        return this.label || '[' + this.lower + '-' + this.upper + ']'
    }

}

export class Reference extends Rule
{
    name: string
    constructor(name: string) {
        super()
        this.name = name
    }
    parse(context: Context) {
        let rule = context.grammar.rules[this.name]
        return rule.parse(context)
    }

}

var anyMemoized = memoize((char: string) => char == null ? new ParseError("any character", 0, "end of file") : new ParseSuccess("any character", 1, char))
export class Any extends Rule
{
    parse(context: Context) {
        return anyMemoized(context.source[context.offset])
    }
}

export class Sequence extends Rule
{
    rules: Rule[]

    constructor(...rules: Rule[]) {
        super()
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
            result.push(match.value)
        }

        return new ParseSuccess(this, contextClone.offset - context.offset, result, contextClone.state)
    }
}

export class Choice extends Rule 
{
    rules: Rule[]

    constructor(...rules: Rule[]) {
        super()
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

export class Repeat extends Rule
{
    rule: Rule
    min: number
    max: number

    constructor(rule: Rule, min: number = 0, max: number = Number.MAX_VALUE) {
        super()
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
                result.push(match.value)
            } else if (matches < this.min) {
                return match
            } else {
                break
            }
        }

        return new ParseSuccess(this, contextClone.offset - context.offset, result, contextClone.state)
    }
}

export class Optional extends Rule
{
    rule: Rule

    constructor(rule: Rule) {
        super()
        this.rule = rule
    }

    parse(context: Context) {
        var match = this.rule.parse(context)
        if (match instanceof ParseSuccess)
            return match
        return new ParseSuccess(this, 0, null)
    }

    toString(): string {
        return this.label || "(" + this.rule + ")?"
    }
}

export class Not extends Rule
{
    rule: Rule

    constructor(rule: Rule) {
        super()
        this.rule = rule
    }

    parse(context: Context) {
        var match = this.rule.parse(context)
        if (match instanceof ParseSuccess)
            return new ParseError(null, context.offset, this.rule)
        return new ParseSuccess(this, 0, null)
    }
}

export class Extract extends Rule {

    sequence: Sequence
    index: number

    constructor(sequence: Sequence, index:number) {
        if (index < 0 || index >= sequence.rules.length)
            throw new Error("Invalid index: " + index)
        super()
        this.sequence = sequence
        this.index = index
    }

    parse(context:Context) {
        let p = this.sequence.parse(context)
        if (p instanceof ParseSuccess)
            p = new ParseSuccess(p.found, p.consumed, p.value[this.index], p.state)
        return p
    }

}