import BaseObject from "./BaseObject"

export default class ParseError extends BaseObject {
    //  a description of what we expected to find
    readonly expected: object | object[] | null = null
    //  a description of what we did not expect to find
    readonly unexpected: object | null = null
    //  absolute offset
    readonly offset: number
    //  length of error found
    readonly length: number

    constructor(expected: string | object | object[] | null, offset: number = 0, length: number = 0, unexpected: string | object | null = null) {
        super()
        if (expected == null && unexpected == null)
            throw new Error("either expected or unexpected values are required")
        this.expected = expected as object
        this.offset = offset
        this.unexpected = unexpected as object
    }

}
