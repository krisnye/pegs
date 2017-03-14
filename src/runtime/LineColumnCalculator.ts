
export default class LineColumnCalculator
{
    readonly source: string
    readonly lines: number[] = []
    readonly columns: number[] = []

    constructor(source: string) {
        this.source = source
        let line = 1
        let column = 0
        for (let i = 0; i < source.length; i++) {
            this.lines[i] = line
            this.columns[i] = column
            if (source.charCodeAt(i) == 10) {
                line++
                column = 0
            }
            else {
                column++
            }
        }
    }

}