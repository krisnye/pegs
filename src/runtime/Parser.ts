import Rule from "./Rule"
import Grammar from "./Grammar"
import Context from "./Context"
import ErrorContext from "./ErrorContext"

export default class Parser
{
    options: any
    grammar: Grammar
    context: Context

    constructor(grammar: Grammar, options: any = {}) {
        this.grammar = grammar
        this.options = options
    }

    //  either returns the resulting parse value or throws a ParseError
    parse(source: string, filename?: string) : any {
        let start = this.options.start ? this.grammar.rules[this.options.start] : this.grammar.start

        this.context = new Context(this.grammar, source, filename)
        let value = start.parse(this.context)
        if (Rule.passed(value))
            return value

        //  ok, our parse failed... so we need to do another parse with debugging enabled
        let errorContext = new ErrorContext(this.context)
        this.context = errorContext
        start.parse(errorContext)
        throw errorContext.getError()
    }

}