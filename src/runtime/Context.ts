import Grammar from "./Grammar"
import Rule from "./Rule"
import LocationCalculator from "./LocationCalculator"
import Location from "./Location"

export default class Context
{
    readonly root: Context
    readonly grammar: Grammar
    readonly source: string
    readonly debug: boolean
    offset: number = 0
    state: object = {}
    private stack?: Rule[]
    private locationCalculator?: LocationCalculator
    rules?: Rule[]              //  present while parsing sequences
    values?: any[]              //  present while parsing sequences, contains values parsed so far in sequence
    location?: () => Location   //  present while parsing sequences
    //  parsing success fields
    successConsumed: number
    successValue: any
    successState: object | null
    //  parsing failure fields
    failureExpected: object | string | null
    failureOffset: number
    failureLength: number
    failureUnexpected: object | string | null

    constructor(grammar: Grammar, source: string, offset: number, state: object = {}, debug: boolean = false, root?: Context) {
        this.root = root || this
        this.grammar = grammar
        this.source = source
        this.offset = offset
        this.state = state
        this.debug = debug
    }

    success(consumed: number, value: any, state: object | null = null) {
        this.successConsumed = consumed
        this.successValue = value
        this.successState = state
        // return new ParseSuccess(this.getStack()[this.getStack().length - 1], consumed, value, state)
        return true
    }

    failure(expected: object | string | null, offset: number, length: number = 0, unexpected: object | string | null = null) {
        this.failureExpected = expected
        this.failureOffset = offset
        this.failureLength = length
        this.failureUnexpected = unexpected
        // return new ParseError(expected, offset, length, unexpected)
        return false
    }

    getLocationCalculator() {
        if (this.root.locationCalculator == null)
            this.root.locationCalculator = new LocationCalculator(this.source)
        return this.root.locationCalculator
    }

    getStack() {
        if (this.root.stack == null)
            this.root.stack = []
        return this.root.stack
    }

    push(rule: Rule) {
        this.getStack().push(rule)
    }

    pop() {
        this.getStack().pop()
    }

    clone() {
        return new Context(this.grammar, this.source, this.offset, JSON.parse(JSON.stringify(this.state)), this.debug, this.root);
    }

}