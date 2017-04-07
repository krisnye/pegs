// start
//   = source !.

// source
//   = sourceElement*

// sourceElement
//   = expression
//   / block

// expression
//   = dent ('foo' / 'bar') __ newline?

// block
//   = dent 'block' __ newline outdent source indent

start = outdent outdent outdent dent !.

outdent
  = spaces++

indent
  = spaces--

dent
  = ' '<spaces>

// __ = ' '*

// newline = '\n'