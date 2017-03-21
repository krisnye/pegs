import Rule from "./Rule"
import Context from "./Context"
import Parser from "./Parser"
import Location from "./Location"
import * as Colors from "./Colors"

function getRuleLabel(rules: StackFrame[], offset: number) {
    for (let i = rules.length - 1; i >= 0; i--) {
        let frame = rules[i]
        if (frame.rule.label != null && frame.offset == offset)
            return frame.rule.label
    }
    //  no label so we just use the rules string value
    return rules[rules.length - 1].rule.toString()
}

class StackFrame {
    rule: Rule
    offset: number

    constructor(rule: Rule, offset: number) {
        this.rule = rule
        this.offset = offset
    }
}

export default class ErrorContext extends Context
{

    // The offset of the errors that we are going to capture information about.
    debugErrorOffsetStart: number
    debugErrorOffsetFinish: number
    ruleStack: StackFrame[] = []
    errorStacks: StackFrame[][] = []

    constructor(context: Context) {
        super(context.parser, context.source)
        this.debugErrorOffsetStart = context.failureOffsetStart
        this.debugErrorOffsetFinish = context.failureOffsetFinish
    }

    pushRule(rule: Rule) {
        this.ruleStack.push(new StackFrame(rule, this.offset))
    }

    popRule() {
        this.ruleStack.pop()
    }

    failure(failureOffsetFinish: number = this.offset) {
        if (this.offset == this.debugErrorOffsetStart) {
            this.errorStacks.push(this.ruleStack.slice(0))
        }
        return super.failure(failureOffsetFinish)
    }

    getExpected(includeWhitespace : boolean) {
        let expected = []
        for (let stack of this.errorStacks) {
            if (includeWhitespace || !stack[stack.length-1].rule.isWhitespace)
            {
                let label = getRuleLabel(stack, this.debugErrorOffsetStart)
                if (expected.indexOf(label) < 0)
                    expected.push(label)
            }
        }
        return expected
    }

    pad(text: string, length: number) {
        while (text.length < length)
            text = " " + text
        return text
    }

    wrapErrorLine(lineNumber: number, errorLocation: Location, start: string, end: string) {
        let lineText = this.getLine(lineNumber)
        if (lineText == null)
            return null

        if (lineNumber < errorLocation.start.line || lineNumber > errorLocation.end.line)
            return lineText
        if (lineNumber > errorLocation.start.line && lineNumber < errorLocation.end.line)
            return start + lineText + end
        console.log(lineNumber, errorLocation.start.line)
        let startIndex = lineNumber == errorLocation.start.line ? errorLocation.start.column : 1
        let endIndex = lineNumber == errorLocation.end.line ? errorLocation.end.column : lineText.length
        if (startIndex == endIndex)
            endIndex += 1
        let result = lineText.substring(0, startIndex - 1) + start + lineText.substring(startIndex - 1, endIndex - 1) + end + lineText.substring(endIndex - 1)
        return result
    }

    getLinesWithNumbers(startLine: number, endLine: number, errorLocation: Location) {
        let length = Math.max(Math.max(0, startLine).toString().length, endLine.toString().length)
        let lines = []
        for (let i = startLine; i <= endLine; i++) {
            let line = this.wrapErrorLine(i, errorLocation, Colors.BgMagenta, Colors.Reset)
            if (line != null) {
                lines.push(Colors.Dim + this.pad(i.toString(), length) + "| " + Colors.Reset + line)
            }
        }
        return lines.join('\n')
    }

    getError() {
        let location = this.getLocationCalculator().getLocation(this.debugErrorOffsetStart, this.debugErrorOffsetFinish)
        let errorLine = location.start.line
        let lines = this.getLinesWithNumbers(errorLine - 3, errorLine, location)
        console.log(lines)

        let expected = this.getExpected(false)
        if (expected.length == 0)
            expected = this.getExpected(true)
        let expectedString = "Expected " + expected.join(" or ")
        let message = expectedString
        let error: any = new Error(message)
        error.expected = expectedString
        return error
    }

}