// Basic npm fixture that you can give a config object that acts like
// npm.config You still need a separate flatOptions but this is the first step
// to eventually just using npm itself

const mockNpm = (base = {}) => {
  const config = base.config || {}
  const flatOptions = base.flatOptions || {}
  return {
    ...base,
    flatOptions,
    config: {
      get: (k) => config[k],
      set: (k, v) => config[k] = v
    },
  }
}

module.exports = mockNpm
