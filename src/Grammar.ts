import Rule from "./Rule"

export default class Grammar
{
    rules: {[name:string]:Rule}

    constructor(rules: {[name:string]:Rule}) {
        this.rules = rules
    }

}