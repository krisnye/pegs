import Grammar from "./Grammar"

export default class Context
{
    source: string
    offset: number = 0
    state: object = {}
    grammar: Grammar

    constructor(source: string, offset: number, state: object, grammar: Grammar) {
        this.source = source
        this.offset = offset
        this.state = state
        this.grammar = grammar
    }

    clone() {
        return new Context(this.source, this.offset, JSON.parse(JSON.stringify(this.state)), this.grammar);
    }

}