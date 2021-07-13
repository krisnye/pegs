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

function isCloseLine(a?: Location, b?: Location, maxDiff = 5) {
    return a && b
        && a.filename == b.filename
        && a.start.line === a.end.line
        && b.start.line === b.end.line
        && Math.abs(a.start.line - b.start.line) <= maxDiff
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

    wrapErrorLine(lineNumber: number, errorLocation: Location, start: string, end: string, lineText: string | undefined = this.getLine(lineNumber)) {
        if (lineText == null)
            return undefined

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

    getLinesWithNumbers(startLine: number, endLine: number, ...errorLocations: Location[]): [number, string] {
        if (errorLocations.length > 1) {
            errorLocations.sort((a, b) => b.start.column - a.start.column)
        }
        let lineDigits = Math.max(Math.max(0, startLine).toString().length, endLine.toString().length)
        let linePrefix = "| "
        let lines = []
        for (let i = startLine; i <= endLine; i++) {
            let line: string | undefined = undefined
            for (let errorLocation of errorLocations) {
                line = this.wrapErrorLine(i, errorLocation, Colors.BgMagenta, Colors.Reset, line)
            }
            if (line != null) {
                lines.push(Colors.Dim + pad(i.toString(), lineDigits) + linePrefix + Colors.Reset + line)
            }
        }
        return [lineDigits + linePrefix.length, lines.join('\n')]
    }

    getError(errorDescription?: string, ...locations: Location[]) {
        if (errorDescription == null) {
            let expected = this.getExpected(false)
            if (expected.length == 0)
                expected = this.getExpected(true)
            errorDescription = "Expected " + expected.join(" or ")
        }
        if (locations == null)
            locations = [this.getLocationCalculator().getLocation(this.debugErrorOffsetStart, this.debugErrorOffsetFinish, this.filename)]
        let message = errorDescription + "\n"
        for (let i = 0; i < locations.length; i++) {
            let location = locations[i]
            let {filename} = location
            let combineLocations = [location]
            while (isCloseLine(location, locations[i + 1])) {
                combineLocations.push(locations[++i])
            }
            let startLine = Math.min(...combineLocations.map(l => l.start.line))
            let endLine = Math.max(...combineLocations.map(l => l.end.line))
            let extraLines = locations.length > 1 ? 1 : 2
            // maybe add more locations if they're on the same line
            let [padLength, errorLines] = this.getLinesWithNumbers(startLine - extraLines, endLine + extraLines, ...combineLocations)
            message +=
                "\n" +
                Colors.Dim + pad("", padLength - 1, "/") + " " + filename + "\n" + Colors.Reset +
                errorLines + "\n"
        }

        let error: any = new Error(message)
        error.description = errorDescription
        error.location = locations[0]
        error.locations = locations
        return error
    }

}