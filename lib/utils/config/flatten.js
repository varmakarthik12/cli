// use the defined flattening function, and copy over any scoped
// registries and registry-specific "nerfdart" configs verbatim
const definitions = require('./definitions.js')
const flatten = (obj, flat) => {
  for (const [key, val] of Object.entries(obj)) {
    const def = definitions[key]
    if (def && def.flatten)
      def.flatten(key, val, obj, flat)
    else if (/@.*:registry$/i.test(key) || /^\/\//.test(key))
      flat[key] = val
  }

  // XXX make this the bin/npm-cli.js file explicitly instead
  // otherwise using npm programmatically is a bit of a pain.
  flat.npmBin = require.main && require.main.filename
  flat.nodeBin = process.env.NODE || process.execPath

  // XXX should this be sha512?  is it even relevant?
  flat.hashAlgorithm = 'sha1'

  return flat
}

module.exports = flatten
