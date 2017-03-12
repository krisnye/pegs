import Rule from "./Rule"
import Context from "./Context"
import ParseError from "./ParseError"
import ParseSuccess from "./ParseSuccess"

export default class Grammar
{
    rules: {[name:string]:Rule} = {}
    start: Rule

    constructor(rules: Rule[], start: Rule = rules[0]) {
        for (let rule of rules) {
            this.rules[rule.name as string] = rule
        }
        this.start = start
    }

    //  either returns the resulting parse value or throws a ParseError
    parse(source:string, start: Rule = this.start) : any {
        let c = new Context(this, source, 0, {})
        let result = start.parse(c)
        if (result instanceof ParseError)
            throw result
        return result.value
    }

}