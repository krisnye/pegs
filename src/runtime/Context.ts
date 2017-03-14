import Grammar from "./Grammar"
import ParseSuccess from "./ParseSuccess"
import Rule from "./Rule"

export default class Context
{
    source: string
    offset: number = 0
    state: object = {}
    grammar: Grammar
    rules: Rule[] | null = null     //  present while parsing sequences
    values: any[] | null = null     //  present while parsing sequences, contains values parsed so far in sequence

    constructor(grammar: Grammar, source: string, offset: number, state: object = {}) {
        this.grammar = grammar
        this.source = source
        this.offset = offset
        this.state = state
    }

    clone() {
        return new Context(this.grammar, this.source, this.offset, JSON.parse(JSON.stringify(this.state)));
    }
}