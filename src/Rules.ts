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

// advances context to where the parse success left off
function advance(context: Context, success: ParseSuccess) {
        context.offset += success.consumed;
        if (success.state != null)
            context.state = success.state;
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
        let code = context.source.charCodeAt(context.offset);
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

let anyMemoized = memoize((char: string) => char == null ? new ParseError("any character", 0, "end of file") : new ParseSuccess("any character", 1, char))
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
        let contextClone = context.clone()
        let consumed = 0
        let result = []
        
        for (let rule of this.rules) {
            let p = rule.parse(contextClone)

            if (p instanceof ParseError)
                return p

            advance(contextClone, p);
            result.push(p.value)
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
        let errors: ParseError[] = []
        for(let rule of this.rules) {
            let p = rule.parse(context)
            if (p instanceof ParseSuccess)
               return p
            
            errors.push(p)
        }

        let maxOffset = 0
        for (let error of errors) {
            if (error.offset > maxOffset)
                maxOffset = error.offset
        }

        let expectations: string[] = []
        for (let error of errors) {
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
        let contextClone = context.clone()
        let matches = 0
        let result: any[] = []

        while (matches < this.max) {
            let p = this.rule.parse(contextClone)
            if (p instanceof ParseSuccess) {
                matches++
                advance(contextClone, p);
                result.push(p.value)
            } else if (matches < this.min) {
                return p
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
        let p = this.rule.parse(context)
        if (p instanceof ParseSuccess)
            return p
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
        let p = this.rule.parse(context)
        if (p instanceof ParseSuccess)
            return new ParseError(null, context.offset, this.rule)
        return new ParseSuccess(this, 0, null)
    }
}

export class Extract extends Rule {

    sequence: Sequence
    index: number

    constructor(sequence: Sequence, index:number) {
        super()
        if (index < 0 || index >= sequence.rules.length)
            throw new Error("Invalid index: " + index)
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