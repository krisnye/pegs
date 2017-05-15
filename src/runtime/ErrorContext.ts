import Rule from "./Rule"
import Context from "./Context"
import Location from "./Location"
import * as Colors from "./Colors"

function pad(text: string, length: number) {
    while (text.length < length)
        text = " " + text
    return text
}

function getRuleLabel(frames: StackFrame[], offset: number) {
    for (let i = frames.length - 1; i >= 0; i--) {
        let frame = frames[i]
        if (frame.rule.label != null && frame.offset == offset)
            return frame.rule.label
    }
    //  no label so we just use the last frames rules string value
    return frames[frames.length - 1].rule.toString()
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
        super(context.grammar, context.source, context.root)
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
                if (expected.indexOf(label) < 0 && label.length > 0)
                    expected.push(label)
            }
        }
        return expected
    }

    wrapErrorLine(lineNumber: number, errorLocation: Location, start: string, end: string) {
        let lineText = this.getLine(lineNumber)
        if (lineText == null)
            return null

        if (lineNumber < errorLocation.start.line || lineNumber > errorLocation.end.line)
            return lineText
        if (lineNumber > errorLocation.start.line && lineNumber < errorLocation.end.line)
            return start + lineText + end
        let startIndex = lineNumber == errorLocation.start.line ? errorLocation.start.column : 1
        let endIndex = lineNumber == errorLocation.end.line ? errorLocation.end.column : lineText.length
        if (startIndex >= lineText.length) {
            //  error is at end of file.
            let append = Colors.Dim + " "
            lineText += append
            endIndex = startIndex + append.length
        }
        if (startIndex == endIndex)
            endIndex += 1
        let result = lineText.substring(0, startIndex - 1) + start + lineText.substring(startIndex - 1, endIndex - 1) + end + lineText.substring(endIndex - 1)
        return result
    }

    getLinesWithNumbers(startLine: number, endLine: number, errorLocation: Location): [number, string] {
        let lineDigits = Math.max(Math.max(0, startLine).toString().length, endLine.toString().length)
        let linePrefix = "| "
        let lines = []
        for (let i = startLine; i <= endLine; i++) {
            let line = this.wrapErrorLine(i, errorLocation, Colors.BgMagenta, Colors.Reset)
            if (line != null) {
                lines.push(Colors.Dim + pad(i.toString(), lineDigits) + linePrefix + Colors.Reset + line)
            }
        }
        return [lineDigits + linePrefix.length, lines.join('\n')]
    }

    getError() {
        let location = this.getLocationCalculator().getLocation(this.debugErrorOffsetStart, this.debugErrorOffsetFinish)
        let errorLine = location.start.line
        let [padLength, lines] = this.getLinesWithNumbers(errorLine - 2, errorLine + 2, location)

        let expected = this.getExpected(false)
        if (expected.length == 0)
            expected = this.getExpected(true)
        let expectedString = "Expected " + expected.join(" or ")
        let message = lines + "\n\n" + pad(" ", padLength) + expectedString + "\n"
        let error: any = new Error(message)
        error.expected = expectedString
        return error
    }

}