
export default class ParseError {
    //  a description of what we expected to find
    expected: object | object[] | null = null
    //  a description of what we did not expect to find
    unexpected: object | null = null
    //  offset relative to context.offset
    offset: number

    constructor(expected: string | object | object[] | null, offset: number = 0, unexpected: string | object | null = null) {
        if (expected == null && unexpected == null)
            throw new Error("either expected or unexpected values are required")
        this.expected = expected as object
        this.offset = offset
        this.unexpected = unexpected as object
    }

}
