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