import Rule from "./Rule"
import Grammar from "./Grammar"
import Context from "./Context"
import ErrorContext from "./ErrorContext"

export default class Parser
{
    grammar: Grammar
    context: Context

    constructor(grammar: Grammar, source:string) {
        this.grammar = grammar
        this.context = new Context(grammar, source)
    }

    //  either returns the resulting parse value or throws a ParseError
    parse(source:string) : any {
        if (source !== undefined) this.context.source = source
        let value = this.grammar.start.parse(this.context)
        if (Rule.passed(value))
            return value

        //  ok, our parse failed... so we need to do another parse with debugging enabled
        let errorContext = new ErrorContext(this.context)
        this.grammar.start.parse(errorContext)
        throw errorContext.getError()
    }

}