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

//  creates a function that will extract named rules out into local variables for use by the function body
function createFunctionFromBody(rules:Rule[], body: string): (context:Context, values:[any]) => object {
    let namesToIndexes: {[name:string]:number} = {}
    for (let i = 0; i < rules.length; i++)
    {
        let name = rules[i].name
        if (name != null)
            namesToIndexes[name] = i
    }
    let localVariables = Object.keys(namesToIndexes).map(
        (name) => {
            let index = namesToIndexes[name]
            return "let " + name + " = __values[" + index + "]"
        }
    ).join(";\n")

    let functionText = "(function(__context, __values) {" + localVariables + ";\n" + body + "})"
    return eval(functionText)
}

//  tries to match an exact string AndPredicate return it
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
            throw new Error("Lower AndPredicate upper characters are in wrong order!")
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

export class Any extends Rule
{
    parse(context: Context) {
        let char = context.source[context.offset]
        if (char == null)
            return new ParseError("any character", context.offset, 0, "end of file")
        else
            return new ParseSuccess("any character", 1, char)
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
        let consumed = 0
        let values: any[] = []
        let contextClone = context.clone()
        //  these additional context properties are present while parsing a sequence, used by CustomPredicate
        contextClone.rules = this.rules
        contextClone.values = values
        contextClone.location = () => contextClone.getLocationCalculator().getLocation(context.offset, contextClone.offset)
        
        let index = 0
        for (let rule of this.rules) {
            let p = rule.parse(contextClone)
            if (p instanceof ParseError)
                return p
            advance(contextClone, p);
            values.push(p.value)
            index++
        }

        return new ParseSuccess(this, contextClone.offset - context.offset, values, contextClone.state)
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
                // TODO: This index is relative and wrong!!!!!
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

export class NotPredicate extends Rule
{
    rule: Rule

    constructor(rule: Rule) {
        super()
        this.rule = rule
    }

    parse(context: Context) {
        let p = this.rule.parse(context)
        if (p instanceof ParseSuccess)
            return new ParseError(null, context.offset, p.consumed, this.rule)
        //  NotPredicate rule does not consume any input or return any value
        return new ParseSuccess(this, 0, null)
    }

    toString() {
        return "!" + this.rule
    }
}

export class AndPredicate extends Rule
{
    rule: Rule

    constructor(rule: Rule) {
        super()
        this.rule = rule
    }

    parse(context: Context) {
        let p = this.rule.parse(context)
        if (p instanceof ParseSuccess) {
            //  AndPredicate rule does not consume any input or return any value
            return new ParseSuccess(this.rule, 0, null)
        }
        return p
    }

    toString() {
        return "&" + this.rule
    }
}

//  Returns the raw string value of the matched rule
export class StringValue extends Rule
{
    rule: Rule

    constructor(rule: Rule) {
        super()
        this.rule = rule
    }

    parse(context: Context) {
        let p = this.rule.parse(context)
        if (p instanceof ParseSuccess) {
            let stringValue = context.source.substring(context.offset, context.offset + p.consumed)
            return new ParseSuccess(p.found, p.consumed, stringValue)
        }
        return p
    }

    toString() {
        return "$" + this.rule
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

export class Action extends Rule {

    sequence: Sequence
    handler: (context:Context, values:[any]) => object

    constructor(sequence: Sequence, handler: string | ((context:Context, values:[any]) => object)) {
        super()
        this.sequence = sequence
        if (typeof handler == 'string')
            handler = createFunctionFromBody(sequence.rules, handler)
        this.handler = handler
    }

    parse(context:Context) {
        let p = this.sequence.parse(context)
        if (p instanceof ParseSuccess) {
            let value = this.handler(context, p.value as [any])
            p = new ParseSuccess(p.found, p.consumed, value, p.state)
        }
        return p
    }

}

export class CustomPredicate extends Rule
{

    handlerBody: string
    handlerFunction: (context:Context, values:any[]) => any

    constructor(handlerBody: string) {
        super()
        this.handlerBody = handlerBody
    }

    parse(context: Context) {
        if (context.rules == null || context.values == null)
            throw new Error("CustomPredicate requires context.rules and context.values")

        if (this.handlerFunction == null) {
            let precedingRules = context.rules.slice(0, context.values.length)
            this.handlerFunction = createFunctionFromBody(precedingRules, this.handlerBody)
        }
        if (this.handlerFunction(context, context.values))
            return new ParseSuccess(this, 0, null)
        return new ParseError(this, context.offset)
    }

    toString() {
        return "&{" + this.handlerBody + "}"
    }
}