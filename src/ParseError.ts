import SourceLocation from "./SourceLocation"

export default class ParseError {
    readonly source: string
    readonly message: string
    readonly location: SourceLocation
}
