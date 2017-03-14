
import Position from "./Position"
import Location from "./Location"

export default class LocationCalculator
{
    readonly source: string
    readonly lines: number[] = []
    readonly columns: number[] = []

    constructor(source: string) {
        this.source = source
        let line = 1
        let column = 1
        for (let i = 0; i < source.length; i++) {
            this.lines[i] = line
            this.columns[i] = column
            if (source.charCodeAt(i) == 10) {
                line++
                column = 1
            }
            else {
                column++
            }
        }
    }

    getLocation(start: number, end: number) {
        return new Location(
            new Position(start, this.lines[start], this.columns[start]),
            new Position(end, this.lines[end], this.columns[end])
        )
    }

}