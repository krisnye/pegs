
export default class ParseSuccess {
    consumed: number
    result: any
    state: object | null

    constructor(consumed: number, result: any, state: object | null = null) {
        this.consumed = consumed
        this.result = result
        this.state = state
    }
}
