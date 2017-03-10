import Context from "./Context"
import ParseError from "./ParseError"
import ParseSuccess from "./ParseSuccess"

export default class Rule {
    parse(context: Context): ParseError | ParseSuccess {
        throw new ParseError("Expected real implementation", context.offset)
    }
}
