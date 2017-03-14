
export default class Position {
    readonly offset: number //  starting at 0
    readonly line: number   //  starting at 1
    readonly column: number //  starting at 1

    constructor(offset: number, line: number, column: number) {
        this.offset = offset
        this.line = line
        this.column = column
    }

}
