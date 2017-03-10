import Context from "./Context"
import ParseError from "./ParseError"
import ParseSuccess from "./ParseSuccess"

interface Rule {
    parse(context: Context): ParseError | ParseSuccess
}

export default Rule