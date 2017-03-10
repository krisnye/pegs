
export default class ParseError {
    expected: string
    offset: number
    length: number

    constructor(expected: string, offset: number, length: number = 1) {
        this.expected = expected
        this.offset = offset
        this.length = length
    }

}
