json = value

value = object / array / string / number / namedValue

object = lbrace mappings: (mapping*) rbrace {
  var result = {}
  for (var mapping of mappings) result[mapping.key] = mapping.value
  return result
}
mapping = key: string colon value: value {return {key: key, value: value}}

array = lbrack list: (values?) rbrack {return list || []}
values = head: value tail: (comma @value)* {return [head].concat(tail)}

string = ws quote @($nonquote*) quote ws
nonquote = [^"]

number = ws digits: $([0-9]+ ( dot [0-9]+)?) ws {return Number(digits)}
dot = '.'

namedValue = ws value: ('true' / 'false' / 'null') ws {return JSON.parse(value)}

quote = '"'

lbrace = ws '{' ws
rbrace = ws '}' ws
colon = ws ':' ws

lbrack = ws '[' ws
rbrack = ws ']' ws
comma = ws ',' ws

ws = [ \n\r]*