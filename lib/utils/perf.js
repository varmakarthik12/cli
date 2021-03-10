const log = require('npmlog')
const timings = new Map()

process.on('time', (name) => {
  timings.set(name, process.hrtime())
})

process.on('timeEnd', (name) => {
  if (timings.has(name)) {
    const [sec, micro] = process.hrtime(timings.get(name))
    const ms = sec * 1e3 + micro / 1e6
    process.emit('timing', name, ms)
    log.timing(name, `Completed in ${ms}ms`)
    timings.delete(name)
  } else
    log.silly('timing', "Tried to end timer that doesn't exist:", name)
})
