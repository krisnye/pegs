
export default class ParseError {
    //  a description of what we expected to find
    expected: string | string[]
    //  offset relative to context.offset
    offset: number

    constructor(expected: string, offset: number = 0) {
        this.expected = expected
        this.offset = offset
    }

}
