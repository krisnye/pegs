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
                return new ParseError(this.match, context.offset, context.offset + i)
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