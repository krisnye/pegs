import Rule from "./Rule"
import Context from "./Context"
import Location from "./Location"
import * as Colors from "./Colors"

function pad(text: string, length: number, insert: string = " ") {
    while (text.length < length)
        text = insert + text
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
        super(context.grammar, context.source, context.filename)
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
        let startIndex = lineNumber == errorLocation.start.line ? errorLocation.start.column : 0
        let endIndex = lineNumber == errorLocation.end.line ? errorLocation.end.column : lineText.length + 1
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

    getError(errorDescription?: string, location?: Location) {
        if (location == null)
            location = this.getLocationCalculator().getLocation(this.debugErrorOffsetStart, this.debugErrorOffsetFinish, this.filename)
        let {filename} = location
        let errorLine = location.start.line
        let [padLength, lines] = this.getLinesWithNumbers(errorLine - 2, errorLine + 2, location)
        // if (filename != null)
        //     lines = Colors.Dim + pad("", padLength) + filename + Colors.Reset + "\n" + lines

        if (errorDescription == null) {
            let expected = this.getExpected(false)
            if (expected.length == 0)
                expected = this.getExpected(true)
            errorDescription = "Expected " + expected.join(" or ")
        }
        let message = "\n" +
            errorDescription + "\n\n" +
            Colors.Dim + pad("", padLength - 1, "/") + " " + filename + "\n" + Colors.Reset +
            lines + "\n\n" + pad(" ", padLength) + "\n"
        let error: any = new Error(message)
        error.description = errorDescription
        error.location = location
        return error
    }

}