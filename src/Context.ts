import Grammar from "./Grammar"
import ParseSuccess from "./ParseSuccess"

export default class Context
{
    source: string
    offset: number = 0
    state: object = {}
    grammar: Grammar

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