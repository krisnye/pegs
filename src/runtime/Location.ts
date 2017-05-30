import Position from "./Position"

export default class Location {

    readonly start: Position
    readonly end: Position
    readonly filename?: string

    constructor(start: Position, end: Position, filename?: string) {
        this.start = start
        this.end = end
        this.filename = filename
    }

}
