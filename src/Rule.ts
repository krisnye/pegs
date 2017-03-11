import Context from "./Context"
import ParseError from "./ParseError"
import ParseSuccess from "./ParseSuccess"

abstract class Rule {
    name?: string
    abstract parse(context: Context): ParseError | ParseSuccess
}

export default Rule