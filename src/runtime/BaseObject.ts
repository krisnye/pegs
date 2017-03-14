
export default class BaseObject {

    toString(): string {
        let className = (this.constructor as any).name
        return className + JSON.stringify(this)
    }

}
