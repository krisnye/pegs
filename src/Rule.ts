import Context from "./Context"
import ParseError from "./ParseError"

export default class Rule {
    parse(context: Context): ParseError | any {
        return null
    }
}
