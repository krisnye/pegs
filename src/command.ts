#!/usr/bin/env node
import * as fs from "fs"
import { generateParserSource } from "./compiler"

var args = process.argv.slice(2)

if (args.length < 2) {
    console.log("\nUsage:\n\n    pegs input.pegs output.js\n")
}
else {
    var [input,output] = args
    if (fs.statSync(input).isFile()) {
        var parser = fs.readFileSync(input, { encoding: 'utf8' });
        fs.writeFileSync(output, generateParserSource(parser), { encoding: 'utf8' })
    } else {
        console.error(input + " isn't a file.")
    }
}
