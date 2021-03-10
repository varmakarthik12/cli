const definitions = require('./definitions.js')
const describeAll = () => {
  // sort not-deprecated ones to the top
  const sort = (([keya, {deprecated: depa}], [keyb, {deprecated: depb}]) => {
    return depa && !depb ? 1
      : !depa && depb ? -1
      : keya.localeCompare(keyb)
  })
  return Object.entries(definitions).sort(sort)
    .map(([key, def]) => def.describe())
    .join('\n\n')
}
module.exports = describeAll
