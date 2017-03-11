
export default class ParseSuccess {

    //  found is an object that you can call .toString() on to get a description of what was found
    //  it is only used for error handling and debugging
    found: object | string
    consumed: number
    result: any
    state: object | null

    constructor(found: object | string, consumed: number, result: any, state: object | null = null) {
        this.found = found
        this.consumed = consumed
        this.result = result
        this.state = state
    }
}