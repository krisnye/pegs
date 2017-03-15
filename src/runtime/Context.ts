import Grammar from "./Grammar"
import ParseSuccess from "./ParseSuccess"
import Rule from "./Rule"
import LocationCalculator from "./LocationCalculator"
import Location from "./Location"

export default class Context
{
    readonly root: Context
    readonly grammar: Grammar
    readonly source: string
    offset: number = 0
    state: object = {}
    private locationCalculator: LocationCalculator | null = null
    rules: Rule[] | null = null     //  present while parsing sequences
    values: any[] | null = null     //  present while parsing sequences, contains values parsed so far in sequence
    location: () => Location        //  present while parsing sequences

    constructor(grammar: Grammar, source: string, offset: number, state: object = {}, root?: Context) {
        this.root = root || this
        this.grammar = grammar
        this.source = source
        this.offset = offset
        this.state = state
    }

    getLocationCalculator() {
        if (this.root.locationCalculator == null)
            this.root.locationCalculator = new LocationCalculator(this.source)
        return this.root.locationCalculator
    }

    clone() {
        return new Context(this.grammar, this.source, this.offset, JSON.parse(JSON.stringify(this.state)), this.root);
    }

}