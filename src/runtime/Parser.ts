import Rule from "./Rule"
import Grammar from "./Grammar"
import Context from "./Context"
import ErrorContext from "./ErrorContext"

export default class Parser
{
    grammar: Grammar
    context: Context

    constructor(grammar: Grammar) {
        this.grammar = grammar
    }

    //  either returns the resulting parse value or throws a ParseError
    parse(source:string, rule: Rule = this.grammar.start) : any {
        this.context = new Context(this.grammar, source)
        let value = rule.parse(this.context)
        if (Rule.passed(value))
            return value

        //  ok, our parse failed... so we need to do another parse with debugging enabled
        let errorContext = new ErrorContext(this.context)
        this.context = errorContext
        rule.parse(errorContext)
        throw errorContext.getError()
    }

}