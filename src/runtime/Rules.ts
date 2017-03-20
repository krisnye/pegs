import Context from "./Context"
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
    match: string

    constructor(match: string) {
        super()
        this.match = match
    }

    parseInternal(context: Context) {
        for (let i = 0; i < this.match.length; i++) {
            if (context.source[context.offset + i] !== this.match[i]) {
                // if (context.offset == 15)
                //     console.log(context.getStack())
                // console.log('>>>>> FUCKING CHAR ' + JSON.stringify(context.source[context.offset + i]) + ', <<<<<< ' + context.offset + ' >>>>>>, ' + JSON.stringify(this.match))
                return context.failure(context.offset + i)
            }
        }
        context.offset += this.match.length
        return this.match
    }

    toString() {
        return JSON.stringify(this.match)
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

    parseInternal(context: Context) {
        let code = context.source.charCodeAt(context.offset);
        if (this.lower <= code && this.upper >= code) {
            context.offset++
            return context.source[context.offset];
        }
        else {
            return context.failure(context.offset);
        }
    }

    toString(): string {
        return this.label || '[' + String.fromCharCode(this.lower) + '-' + String.fromCharCode(this.upper) + ']'
    }

}

export class Reference extends Rule
{
    reference: string
    constructor(reference: string) {
        super()
        this.reference = reference
    }
    parseInternal(context: Context) {
        let rule = context.parser.rules[this.reference]
        return rule.parse(context)
    }

}

export class Any extends Rule
{
    parseInternal(context: Context) {
        let char = context.source[context.offset]
        if (char == null) {
            return context.failure()
        }
        else {
            context.offset++
            return char
        }
    }

}

export class Sequence extends Rule
{
    rules: Rule[]

    constructor(...rules: Rule[]) {
        super()
        this.rules = rules;
    }

    parseInternal(context: Context) {
        let consumed = 0
        let values: any[] = []

        let index = 0
        for (let rule of this.rules) {
            //  these additional context properties are present while parsing a sequence, used by CustomPredicate
            context.rules = this.rules
            context.values = values
            // context.location = () => contextClone.getLocationCalculator().getLocation(context.offset, contextClone.offset)
            let value = rule.parse(context)
            if (!Rule.passed(value))
                return value
            values.push(value)
            index++
        }

        return values
    }
}

export class Choice extends Rule 
{
    rules: Rule[]

    constructor(...rules: Rule[]) {
        super()
        this.rules = rules
    }

    parseInternal(context: Context) {
        for (let rule of this.rules) {
            let value = rule.parse(context)
            if (Rule.passed(value))
               return value
        }

        return Rule.failure
    }
}

export class Repeat extends Rule
{
    rule: Rule
    min: number
    max: number

    constructor(rule: Rule, min: number = 0, max: number = -1) {
        super()
        this.rule = rule
        this.max = max
        this.min = min
    }

    parseInternal(context: Context) {
        let matches = 0
        let values: any[] = []

        while (matches != this.max) {
            let value = this.rule.parse(context)
            if (Rule.passed(value)) {
                matches++
                values.push(value)
            }
            else {
                if (matches < this.min)
                    return context.failure(context.failureOffset)
                break
            }
        }

        return values
    }
}

export class Optional extends Rule
{
    rule: Rule

    constructor(rule: Rule) {
        super()
        this.rule = rule
    }

    parseInternal(context: Context) {
        let value = this.rule.parse(context)
        if (Rule.passed(value))
            return value
        return undefined
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

    parseInternal(context: Context) {
        let initialOffset = context.offset
        let value = this.rule.parse(context)
        context.offset = initialOffset
        if (Rule.passed(value)) {
            return context.failure()
        }
        //  NotPredicate rule does not consume any input or return any value
        return undefined
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

    parseInternal(context: Context) {
        let initialOffset = context.offset
        let value = this.rule.parse(context)
        if (Rule.passed(value)) {
            //  AndPredicate rule does not consume any input or return any value
            context.offset = initialOffset
            return undefined
        }
        return value
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

    parseInternal(context: Context) {
        let initialOffset = context.offset
        let value = this.rule.parse(context)
        if (Rule.passed(value)) {
            value = context.source.substring(initialOffset, context.offset)
        }
        return value
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

    parseInternal(context:Context) {
        let value = this.sequence.parseInternal(context)
        if (Rule.passed(value))
            value = value[this.index]
        return value
    }

}

export class Group extends Rule {
    rule: Rule

    constructor(rule: Rule) {
        super()
        this.rule = rule
    }

    parseInternal(context: Context) {
        return this.rule.parse(context)
    }

    toString() {
        return "(" + this.rule + ")"
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

    parseInternal(context:Context) {
        let value = this.sequence.parseInternal(context)
        if (Rule.passed(value)) {
            value = this.handler(context, value)
        }
        return value
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

    setHandler(handlerFunction: (context:Context, values:any[]) => any) {
        this.handlerFunction = handlerFunction
        return this
    }

    parseInternal(context: Context) {
        if (context.rules == null || context.values == null)
            throw new Error("CustomPredicate requires context.rules and context.values")

        if (this.handlerFunction == null) {
            let precedingRules = context.rules.slice(0, context.values.length)
            this.handlerFunction = createFunctionFromBody(precedingRules, this.handlerBody)
        }
        if (this.handlerFunction(context, context.values))
            return undefined
        return context.failure()
    }

    toString() {
        return "&{" + this.handlerBody + "}"
    }
}
