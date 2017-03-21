import Parser from "./Parser"
import Rule from "./Rule"
import LocationCalculator from "./LocationCalculator"
import Location from "./Location"

export default class Context
{
    readonly parser: Parser
    readonly source: string
    readonly debug: false
    offset: number = 0
    state: object = {}
    private locationCalculator?: LocationCalculator
    rules?: Rule[]              //  present while parsing sequences
    values?: any[]              //  present while parsing sequences, contains values parsed so far in sequence
    location?: () => Location   //  present while parsing sequences
    failureOffsetStart: number = 0      //  furthest failure offset start used for creating errors
    failureOffsetFinish: number = 0     //  furthest failure offset finish used for creating errors

    constructor(parser: Parser, source: string) {
        this.parser = parser
        this.source = source
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

    getErrorMessage() {
        //  todo: populate info with debug flag and use it here to make a pimp ass error message
        return "Error fucking offset: " + this.failureOffsetStart
    }

}