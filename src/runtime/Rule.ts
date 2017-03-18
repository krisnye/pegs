import Context from "./Context"
import BaseObject from "./BaseObject"

abstract class Rule extends BaseObject {

    parse(context: Context): boolean {
        context.push(this)
        var result = this.parseInternal(context)
        context.pop()
        return result
    }
    protected abstract parseInternal(context: Context): boolean

    //  The identifier name of this rule. must be a valid identifier
    name?: string
    setName(name: string): this {
        this.name = name
        return this
    }

    //  The friendly name of this rule
    label?: string
    setLabel(label: string): this {
        this.label = label
        return this
    }

    toString(): string {
        return this.label || super.toString()
    }

}

export default Rule