import Rule from "./Rule"
import Context from "./Context"
import Parser from "./Parser"

function getRuleLabel(rules: Rule[]) {
    for (let i = rules.length - 1; i >= 0; i--) {
        let rule = rules[i]
        if (rule.label != null)
            return rule.label
    }
    //  no label so we just use the rules string value
    return rules[rules.length - 1].toString()
}

export default class ErrorContext extends Context
{

    // The offset of the errors that we are going to capture information about.
    debugErrorOffsetStart: number
    debugErrorOffsetFinish: number
    errorStacks: Rule[][] = []

    constructor(context: Context) {
        super(context.parser, context.source)
        this.debugErrorOffsetStart = context.failureOffsetStart
        this.debugErrorOffsetFinish = context.failureOffsetFinish
    }

    failure(failureOffsetFinish: number = this.offset) {
        if (this.offset == this.debugErrorOffsetStart) {
            this.errorStacks.push(this.stack.slice(0))
        }
        return super.failure(failureOffsetFinish)
    }

    getExpected(includeWhitespace : boolean) {
        let expected = []
        for (let stack of this.errorStacks) {
            if (includeWhitespace || !stack[stack.length-1].isWhitespace)
            {
                let label = getRuleLabel(stack)
                if (expected.indexOf(label) < 0)
                    expected.push(label)
            }
        }
        return expected
    }

    getError() {
        let expected = this.getExpected(false)
        if (expected.length == 0)
            expected = this.getExpected(true)
        let message = "Expected " + expected.join(" or ")
        let error = new Error(message)
        return error
    }

}