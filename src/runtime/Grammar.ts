import Rule from "./Rule"
import Context from "./Context"

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
        let context = new Context(this, source, 0, {})
        let result: any
        try {
            result = start.parse(context)
        }
        catch (e) {
            result = e
        }
        if (Rule.passed(result))
            return result
        else
            throw new Error("Error offset: " + context.failureOffset)
    }

}