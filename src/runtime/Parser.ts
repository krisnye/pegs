import Rule from "./Rule"
import Context from "./Context"
import ErrorContext from "./ErrorContext"

export default class Parser
{
    rules: {[name:string]:Rule} = {}
    start: Rule

    constructor(rules: Rule[], start: Rule = rules[0]) {
        for (let rule of rules) {
            this.rules[rule.name as string] = rule
        }
        this.start = start
    }

    //  either returns the resulting parse value or throws a ParseError
    parse(source:string, start: Rule = this.start) : any {
        let context = new Context(this, source)
        let value = start.parse(context)
        if (Rule.passed(value))
            return value

        //  ok, our parse failed... so we need to do another parse with debugging enabled
        let errorContext = new ErrorContext(context)
        start.parse(errorContext)
        throw errorContext.getError()
    }

}