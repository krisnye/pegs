import Position from "./Position"

export default class Location {

    readonly start: Position
    readonly end: Position

    constructor(start: Position, end: Position) {
        this.start = start
        this.end = end
    }

}
