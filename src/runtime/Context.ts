import Parser from "./Parser"
import Rule from "./Rule"
import LocationCalculator from "./LocationCalculator"
import Location from "./Location"

export default class Context
{
    readonly parser: Parser
    readonly source: string
    offset: number = 0
    state: object = {}
    private stack?: Rule[]
    private locationCalculator?: LocationCalculator
    rules?: Rule[]              //  present while parsing sequences
    values?: any[]              //  present while parsing sequences, contains values parsed so far in sequence
    location?: () => Location   //  present while parsing sequences
    failureOffset: number       //  furthest failure offset used for creating errors

    constructor(parser: Parser, source: string, offset: number, state: object = {}) {
        this.parser = parser
        this.source = source
        this.offset = offset
        this.state = state
    }

    failure(offset: number = this.offset) {
        if (this.failureOffset == null || this.failureOffset < offset) {
            this.failureOffset = offset
        }
        return Rule.failure
    }

    getLocationCalculator() {
        if (this.locationCalculator == null)
            this.locationCalculator = new LocationCalculator(this.source)
        return this.locationCalculator
    }

    getStack() {
        if (this.stack == null)
            this.stack = []
        return this.stack
    }

    pushRule(rule: Rule) {
        this.getStack().push(rule)
    }

    popRule() {
        this.getStack().pop()
    }

    getErrorMessage(expected: any /* Set */, offset: number, length: number, unexpected?: string) {

    }

}