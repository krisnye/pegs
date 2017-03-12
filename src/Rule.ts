import Context from "./Context"
import ParseError from "./ParseError"
import ParseSuccess from "./ParseSuccess"
import BaseObject from "./BaseObject"

abstract class Rule extends BaseObject {

    //  The identifier name of this rule. must be a valid identifier
    name: string | undefined = undefined

    //  The friendly name of this rule
    label: string | undefined = undefined

    abstract parse(context: Context): ParseError | ParseSuccess

    toString(): string {
        return this.label || super.toString()
    }

}

export default Rule