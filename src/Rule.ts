import Context from "./Context"
import ParseError from "./ParseError"
import ParseSuccess from "./ParseSuccess"

abstract class Rule extends Object {

    //  The identifier name of this rule. must be a valid identifier
    name: string | null = null

    //  The friendly name of this rule
    label: string | null = null

    abstract parse(context: Context): ParseError | ParseSuccess

    toString(): string {
        if (this.label != null)
            return this.label
        let className = (this.constructor as any).name
        return className + JSON.stringify(this)
    }

}

export default Rule