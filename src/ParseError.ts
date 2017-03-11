
export default class ParseError {
    //  a description of what we expected to find
    expected: string | string[]
    //  where we expected to find it at
    expectedOffset?: number
    //  how far we did successfully match, this could be farther than the expected offset
    matchedOffset?: number

    constructor(expected: string, expectedOffset?: number, matchedOffset?: number) {
        this.expected = expected
        this.expectedOffset = expectedOffset
        this.matchedOffset = matchedOffset
    }

}
