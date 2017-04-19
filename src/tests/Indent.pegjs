start
  = source !.

source
  = sourceElement+

sourceElement
  = expression
  / block

expression
  = dent ('foo' / 'bar') '()' newline?

block
  = dent 'block:' newline dentedSource

dentedSource = outdent (source / dentedSource) indent

outdent
  = spaces++

indent
  = spaces--

dent
  = ' '<spaces>
__
  = ' '*

newline 
  = '\r\n'
  / '\r'
  / '\n' 