const t = require('tap')
const config = require('../../../../lib/utils/config/index.js')
const flatten = require('../../../../lib/utils/config/flatten.js')
const definitions = require('../../../../lib/utils/config/definitions.js')
const describeAll = require('../../../../lib/utils/config/describe-all.js')
t.matchSnapshot(config.shorthands, 'shorthands')

t.strictSame(config, {
  shorthands: config.shorthands,
  flatten,
  definitions,
  describeAll,
})
