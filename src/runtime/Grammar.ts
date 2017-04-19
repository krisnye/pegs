import Rule from "./Rule"

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

}