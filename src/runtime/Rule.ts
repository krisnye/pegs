import Context from "./Context"
import BaseObject from "./BaseObject"
declare var Symbol: any

abstract class Rule extends BaseObject {

    //  unique object that represents a failure to parse a rule.
    static failure = Symbol('Rule.failure')
    static passed(result:any) { return result !== Rule.failure }

    isWhitespace: boolean = false

    parse(context: Context): any {
        context.pushRule(this)
        var saveOffset = context.offset
        var saveState = context.state
        var result = this.parseInternal(context)
        if (!Rule.passed(result)) {
            // our rule failed to parse, so we must restore previous state.
            context.offset = saveOffset
            context.state = saveState
        }
        context.popRule()
        return result
    }

    protected abstract parseInternal(context: Context): any

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