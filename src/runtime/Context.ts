import Grammar from "./Grammar"
import Rule from "./Rule"
import LocationCalculator from "./LocationCalculator"
import Location from "./Location"

export default class Context
{
    readonly grammar: Grammar
    readonly debug: false
    readonly filename: string
    source: string
    offset: number = 0
    state: {[name: string]: any} = {}
    private locationCalculator?: LocationCalculator
    rules?: Rule[]              //  present while parsing sequences
    values?: any[]              //  present while parsing sequences, contains values parsed so far in sequence
    location?: () => Location   //  present while parsing sequences
    failureOffsetStart: number = 0      //  furthest failure offset start used for creating errors
    failureOffsetFinish: number = 0     //  furthest failure offset finish used for creating errors

    constructor(grammar: Grammar, source: string, filename?: string) {
        this.grammar = grammar
        this.source = source
        if (filename != null)
            this.filename = filename
    }

    private lines: string[]
    getLines() {
        if (this.lines == null)
            this.lines = this.source.split(/\r?\n/g)
        return this.lines
    }
    getLine(indexStartingAtOne: number) {
        return this.getLines()[indexStartingAtOne - 1]
    }

    getState(name: string, defaultValue = 0) {
        let value = this.state[name]
        if (value == null)
            value = defaultValue
        return value
    }
    setState(name: string, value: any) {
        //  we always treat our state object as immutable, so we clone the whole thing on any write
        var newState = (Object as any).assign({}, this.state)
        newState[name] = value
        this.state = newState
    }

    pushRule(rule: Rule) {}
    popRule() {}

    failure(failureOffsetFinish: number = this.offset) {
        if (this.offset >= this.failureOffsetStart) {
            this.failureOffsetStart = this.offset
            this.failureOffsetFinish = failureOffsetFinish
        }
        return Rule.failure
    }

    getLocationCalculator() {
        if (this.locationCalculator == null)
            this.locationCalculator = new LocationCalculator(this.source)
        return this.locationCalculator
    }

}