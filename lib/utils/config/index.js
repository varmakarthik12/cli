const flatten = require('./flatten.js')
const definitions = require('./definitions.js')
const describeAll = require('./describe-all.js')

// aliases where they get expanded into a completely different thing
// these are NOT supported in the environment or npmrc files, only
// expanded on the CLI.  "Normal" single-char short options are handled
// separately from these, because they can be combined.
const aliases = {
  'enjoy-by': ['--before'],
  d: ['--loglevel=info'],
  dd: ['--loglevel=verbose'],
  ddd: ['--loglevel=silly'],
  quiet: ['--loglevel=warn'],
  q: ['--loglevel=warn'],
  s: ['--loglevel=silent'],
  silent: ['--loglevel=silent'],
  verbose: ['--loglevel=verbose'],
  desc: ['--description'],
  help: ['--usage'],
  local: ['--no-global'],
  n: ['--no-yes'],
  no: ['--no-yes'],
  porcelain: ['--parseable'],
  readonly: ['--read-only'],
  reg: ['--registry'],
}

module.exports = {
  definitions,
  flatten,
  aliases,
  describeAll,
}
