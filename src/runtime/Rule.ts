import Context from "./Context"
import ParseError from "./ParseError"
import ParseSuccess from "./ParseSuccess"
import BaseObject from "./BaseObject"

abstract class Rule extends BaseObject {

    abstract parse(context: Context): ParseError | ParseSuccess

    //  The identifier name of this rule. must be a valid identifier
    name: string | undefined = undefined
    setName(name: string): this {
        this.name = name
        return this
    }

    //  The friendly name of this rule
    label: string | undefined = undefined
    setLabel(label: string): this {
        this.label = label
        return this
    }

    toString(): string {
        return this.label || super.toString()
    }

}

export default Rule