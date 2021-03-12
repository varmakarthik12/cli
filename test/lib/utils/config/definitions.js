const t = require('tap')

const requireInject = require('require-inject')

// have to fake the node version, or else it'll only pass on this one
Object.defineProperty(process, 'version', {
  value: 'v14.8.0',
})

// also fake the npm version, so that it doesn't get reset every time
const pkg = require('../../../../package.json')
pkg.version = '99.99.99-testversion.99'

// this is a pain to keep typing
const defpath = '../../../../lib/utils/config/definitions.js'

// set this in the test when we need it
delete process.env.NODE_ENV
const definitions = require(defpath)

const isWin = '../../../../lib/utils/is-windows.js'

// snapshot these just so we note when they change
t.matchSnapshot(Object.keys(definitions), 'all config keys')
t.matchSnapshot(Object.keys(definitions).filter(d => d.flatten),
  'all config keys that are shared to flatOptions')

t.test('basic flattening function camelCases from css-case', t => {
  const flat = {}
  const obj = { 'always-auth': true }
  definitions['always-auth'].flatten('always-auth', true, obj, flat)
  t.strictSame(flat, { alwaysAuth: true })
  t.end()
})

t.test('editor', t => {
  t.test('has EDITOR and VISUAL, use EDITOR', t => {
    process.env.EDITOR = 'vim'
    process.env.VISUAL = 'mate'
    const defs = requireInject(defpath)
    t.equal(defs.editor.default, 'vim')
    t.end()
  })
  t.test('has VISUAL but no EDITOR, use VISUAL', t => {
    delete process.env.EDITOR
    process.env.VISUAL = 'mate'
    const defs = requireInject(defpath)
    t.equal(defs.editor.default, 'mate')
    t.end()
  })
  t.test('has neither EDITOR nor VISUAL, system specific', t => {
    delete process.env.EDITOR
    delete process.env.VISUAL
    const defsWin = requireInject(defpath, {
      [isWin]: true,
    })
    t.equal(defsWin.editor.default, 'notepad.exe')
    const defsNix = requireInject(defpath, {
      [isWin]: false,
    })
    t.equal(defsNix.editor.default, 'vi')
    t.end()
  })
  t.end()
})

t.test('shell', t => {
  t.test('windows, env.ComSpec then cmd.exe', t => {
    process.env.ComSpec = 'command.com'
    const defsComSpec = requireInject(defpath, {
      [isWin]: true,
    })
    t.equal(defsComSpec.shell.default, 'command.com')
    delete process.env.ComSpec
    const defsNoComSpec = requireInject(defpath, {
      [isWin]: true,
    })
    t.equal(defsNoComSpec.shell.default, 'cmd')
    t.end()
  })

  t.test('nix, SHELL then sh', t => {
    process.env.SHELL = '/usr/local/bin/bash'
    const defsShell = requireInject(defpath, {
      [isWin]: false,
    })
    t.equal(defsShell.shell.default, '/usr/local/bin/bash')
    delete process.env.SHELL
    const defsNoShell = requireInject(defpath, {
      [isWin]: false,
    })
    t.equal(defsNoShell.shell.default, 'sh')
    t.end()
  })

  t.end()
})

t.test('local-address allowed types', t => {
  t.test('get list from os.networkInterfaces', t => {
    const os = {
      tmpdir: () => '/tmp',
      networkInterfaces: () => ({
        eth420: [{ address: '127.0.0.1' }],
        eth69: [{ address: 'no place like home' }],
      }),
    }
    const defs = requireInject(defpath, { os })
    t.same(defs['local-address'].type, [
      null,
      '127.0.0.1',
      'no place like home',
    ])
    t.end()
  })
  t.test('handle os.networkInterfaces throwing', t => {
    const os = {
      tmpdir: () => '/tmp',
      networkInterfaces: () => {
        throw new Error('no network interfaces for some reason')
      },
    }
    const defs = requireInject(defpath, { os })
    t.same(defs['local-address'].type, [ null ])
    t.end()
  })
  t.end()
})

t.test('unicode allowed?', t => {
  const { LC_ALL, LC_CTYPE, LANG } = process.env
  t.teardown(() => Object.assign(process.env, { LC_ALL, LC_CTYPE, LANG }))

  process.env.LC_ALL = 'utf8'
  process.env.LC_CTYPE = 'UTF-8'
  process.env.LANG = 'Unicode utf-8'

  const lcAll = requireInject(defpath)
  t.equal(lcAll.unicode.default, true)
  process.env.LC_ALL = 'no unicode for youUUUU!'
  const noLcAll = requireInject(defpath)
  t.equal(noLcAll.unicode.default, false)

  delete process.env.LC_ALL
  const lcCtype = requireInject(defpath)
  t.equal(lcCtype.unicode.default, true)
  process.env.LC_CTYPE = 'something other than unicode version 8'
  const noLcCtype = requireInject(defpath)
  t.equal(noLcCtype.unicode.default, false)

  delete process.env.LC_CTYPE
  const lang = requireInject(defpath)
  t.equal(lang.unicode.default, true)
  process.env.LANG = 'ISO-8859-1'
  const noLang = requireInject(defpath)
  t.equal(noLang.unicode.default, false)
  t.end()
})

t.test('cache', t => {
  process.env.LOCALAPPDATA = 'app/data/local'
  const defsWinLocalAppData = requireInject(defpath, {
    [isWin]: true,
  })
  t.equal(defsWinLocalAppData.cache.default, 'app/data/local/npm-cache')

  delete process.env.LOCALAPPDATA
  const defsWinNoLocalAppData = requireInject(defpath, {
    [isWin]: true,
  })
  t.equal(defsWinNoLocalAppData.cache.default, '~/npm-cache')

  const defsNix = requireInject(defpath, {
    [isWin]: false,
  })
  t.equal(defsNix.cache.default, '~/.npm')

  const flat = {}
  defsNix.cache.flatten('cache', '/some/cache/value', {}, flat)
  const {join} = require('path')
  t.equal(flat.cache, join('/some/cache/value', '_cacache'))

  t.end()
})

t.test('flatteners that populate flat.omit array', t => {
  t.test('also', t => {
    const flat = {}
    const obj = {}

    // ignored if setting is not dev or development
    definitions.also.flatten('also', 'ignored', {}, flat)
    t.strictSame(obj, {}, 'nothing done')
    t.strictSame(flat, {}, 'nothing done')

    definitions.also.flatten('also', 'development', obj, flat)
    t.strictSame(obj, { include: ['dev'] }, 'marked dev as included')
    t.strictSame(flat, { omit: [] }, 'nothing omitted, so nothing changed')

    obj.omit = ['dev', 'optional']
    obj.include = []
    definitions.also.flatten('also', 'development', obj, flat)
    t.strictSame(obj, { omit: ['dev', 'optional'], include: ['dev'] }, 'marked dev as included')
    t.strictSame(flat, { omit: ['optional'] }, 'removed dev from omit')
    t.end()
  })

  t.test('include', t => {
    const flat = {}
    const obj = { include: ['dev'] }
    definitions.include.flatten('include', ['dev'], obj, flat)
    t.strictSame(flat, {omit: []}, 'not omitting anything')
    obj.omit = ['optional', 'dev']
    definitions.include.flatten('include', ['dev'], obj, flat)
    t.strictSame(flat, {omit: ['optional']}, 'only omitting optional')
    t.end()
  })

  t.test('omit', t => {
    const flat = {}
    const obj = { include: ['dev'] }
    definitions.omit.flatten('omit', ['dev', 'optional'], obj, flat)
    t.strictSame(flat, { omit: ['optional'] }, 'do not omit what is included')

    process.env.NODE_ENV = 'production'
    const defProdEnv = requireInject(defpath)
    t.strictSame(defProdEnv.omit.default, ['dev'], 'omit dev in production')
    t.end()
  })

  t.test('only', t => {
    const flat = {}
    const obj = { only: 'asdf' }
    definitions.only.flatten('only', 'asdf', obj, flat)
    t.strictSame(flat, {}, 'ignored if value is not production')

    obj.only = 'prod'
    definitions.only.flatten('only', 'prod', obj, flat)
    t.strictSame(flat, {omit: ['dev']}, 'omit dev when --only=prod')

    obj.include = ['dev']
    flat.omit = []
    definitions.only.flatten('only', 'prod', obj, flat)
    t.strictSame(flat, {omit: []}, 'do not omit when included')

    t.end()
  })

  t.test('optional', t => {
    const flat = {}
    const obj = {}

    definitions.optional.flatten('optional', null, obj, flat)
    t.strictSame(obj, {}, 'do nothing by default')
    t.strictSame(flat, {}, 'do nothing by default')

    definitions.optional.flatten('optional', true, obj, flat)
    t.strictSame(obj, {include:['optional']}, 'include optional when set')
    t.strictSame(flat, {omit:[]}, 'nothing to omit in flatOptions')

    delete obj.include
    definitions.optional.flatten('optional', false, obj, flat)
    t.strictSame(obj, {omit:['optional']}, 'omit optional when set false')
    t.strictSame(flat, {omit:['optional']}, 'omit optional when set false')

    t.end()
  })

  t.test('production', t => {
    const flat = {}
    const obj = {}
    definitions.production.flatten('production', true, obj, flat)
    t.strictSame(obj, {omit:['dev']}, '--production sets --omit=dev')
    t.strictSame(flat, {omit:['dev']}, '--production sets --omit=dev')

    delete obj.omit
    delete flat.omit
    definitions.production.flatten('production', false, obj, flat)
    t.strictSame(obj, {}, '--no-production has no effect')
    t.strictSame(flat, {}, '--no-production has no effect')

    obj.include = ['dev']
    definitions.production.flatten('production', true, obj, flat)
    t.strictSame(obj, {include:['dev'], omit: ['dev']}, 'omit and include dev')
    t.strictSame(flat, {omit:[]}, 'do not omit dev when included')

    t.end()
  })

  t.end()
})

t.test('cache-max', t => {
  const flat = {}
  const obj = {}
  definitions['cache-max'].flatten('cache-max', 10342, obj, flat)
  t.strictSame(flat, {}, 'no effect if not <= 0')
  definitions['cache-max'].flatten('cache-max', 0, obj, flat)
  t.strictSame(flat, {preferOnline: true}, 'preferOnline if <= 0')
  t.end()
})

t.test('cache-min', t => {
  const flat = {}
  const obj = {}
  definitions['cache-min'].flatten('cache-min', 123, obj, flat)
  t.strictSame(flat, {}, 'no effect if not >= 9999')
  definitions['cache-min'].flatten('cache-min', 9999, obj, flat)
  t.strictSame(flat, {preferOffline: true}, 'preferOffline if >=9999')
  t.end()
})

t.test('color', t => {
  const { isTTY } = process.stdout
  t.teardown(() => process.stdout.isTTY = isTTY)

  const flat = {}
  const obj = {}

  definitions.color.flatten('color', 'always', obj, flat)
  t.strictSame(flat, {color: true}, 'true when --color=always')

  definitions.color.flatten('color', false, obj, flat)
  t.strictSame(flat, {color: false}, 'true when --no-color')

  process.stdout.isTTY = false
  definitions.color.flatten('color', true, obj, flat)
  t.strictSame(flat, {color: false}, 'no color when stdout not tty')
  process.stdout.isTTY = true
  definitions.color.flatten('color', true, obj, flat)
  t.strictSame(flat, {color: true}, '--color turns on color when stdout is tty')

  delete process.env.NO_COLOR
  const defsAllowColor = requireInject(defpath)
  t.equal(defsAllowColor.color.default, true, 'default true when no NO_COLOR env')

  process.env.NO_COLOR = '0'
  const defsNoColor0 = requireInject(defpath)
  t.equal(defsNoColor0.color.default, true, 'default true when no NO_COLOR=0')

  process.env.NO_COLOR = '1'
  const defsNoColor1 = requireInject(defpath)
  t.equal(defsNoColor1.color.default, false, 'default false when no NO_COLOR=1')

  t.end()
})

t.test('retry options', t => {
  const obj = {}
  // <config>: flat.retry[<option>]
  const mapping = {
    'fetch-retries': 'retries',
    'fetch-retry-factor': 'factor',
    'fetch-retry-maxtimeout': 'maxTimeout',
    'fetch-retry-mintimeout': 'minTimeout',
  }
  for (const [config, option] of Object.entries(mapping)) {
    const msg = `${config} -> retry.${option}`
    const flat = {}
    definitions[config].flatten(config, 99, obj, flat)
    t.strictSame(flat, {retry:{[option]:99}}, msg)
  }
  t.end()
})

t.test('search options', t => {
  const obj = {}
  // <config>: flat.search[<option>]
  const mapping = {
    'description': 'description',
    'searchexclude': 'exclude',
    'searchlimit': 'limit',
    'searchstaleness': 'staleness',
  }
  for (const [config, option] of Object.entries(mapping)) {
    const msg = `${config} -> search.${option}`
    const flat = {}
    definitions[config].flatten(config, 99, obj, flat)
    t.strictSame(flat, { search:{ limit: 20, [option]: 99 }}, msg)
  }
  const flat = {}
  definitions.searchopts.flatten('searchopts', 'a=b&b=c', obj, flat)
  t.strictSame(flat, {
    search: {
      limit: 20,
      opts: Object.assign(Object.create(null), {
        a: 'b',
        b: 'c',
      }),
    },
  }, 'searchopts -> querystring.parse() -> search.opts')

  t.end()
})

t.test('noProxy', t => {
  const obj = {}
  const flat = {}
  definitions.noproxy.flatten('noproxy', ['1.2.3.4,2.3.4.5','3.4.5.6'], obj, flat)
  t.strictSame(flat, { noProxy: '1.2.3.4,2.3.4.5,3.4.5.6' })
  t.end()
})

t.test('maxSockets', t => {
  const obj = {}
  const flat = {}
  definitions.maxsockets.flatten('maxsockets', 123, obj, flat)
  t.strictSame(flat, { maxSockets: 123 })
  t.end()
})

t.test('projectScope', t => {
  const obj = {}
  const flat = {}
  definitions.scope.flatten('scope', 'asdf', obj, flat)
  t.strictSame(flat, { projectScope: '@asdf' }, 'prepend @ if needed')

  definitions.scope.flatten('scope', '@asdf', obj, flat)
  t.strictSame(flat, { projectScope: '@asdf' }, 'leave untouched if has @')

  t.end()
})

t.test('strictSSL', t => {
  const obj = {}
  const flat = {}
  definitions['strict-ssl'].flatten('strict-ssl', false, obj, flat)
  t.strictSame(flat, { strictSSL: false })
  definitions['strict-ssl'].flatten('strict-ssl', true, obj, flat)
  t.strictSame(flat, { strictSSL: true })
  t.end()
})

t.test('shrinkwrap/package-lock', t => {
  const obj = {}
  const flat = {}
  definitions.shrinkwrap.flatten('shrinkwrap', false, obj, flat)
  t.strictSame(flat, {packageLock: false})
  definitions.shrinkwrap.flatten('shrinkwrap', true, obj, flat)
  t.strictSame(flat, {packageLock: true})

  definitions['package-lock'].flatten('package-lock', false, obj, flat)
  t.strictSame(flat, {packageLock: false})
  definitions['package-lock'].flatten('package-lock', true, obj, flat)
  t.strictSame(flat, {packageLock: true})

  t.end()
})

t.test('scriptShell', t => {
  const obj = {}
  const flat = {}
  definitions['script-shell'].flatten('script-shell', null, obj, flat)
  t.ok(flat.hasOwnProperty('scriptShell'), 'should set it to undefined explicitly')
  t.strictSame(flat, { scriptShell: undefined }, 'no other fields')

  definitions['script-shell'].flatten('script-shell', 'asdf', obj, flat)
  t.strictSame(flat, { scriptShell: 'asdf' }, 'sets if not falsey')

  t.end()
})

t.test('defaultTag', t => {
  const obj = {}
  const flat = {}
  definitions['tag'].flatten('tag', 'next', obj, flat)
  t.strictSame(flat, {defaultTag: 'next'})
  t.end()
})

t.test('timeout', t => {
  const obj = {}
  const flat = {}
  definitions['fetch-timeout'].flatten('fetch-timeout', 123, obj, flat)
  t.strictSame(flat, {timeout: 123})
  t.end()
})

t.test('saveType', t => {
  t.test('save-prod', t => {
    const obj = {}
    const flat = {}
    definitions['save-prod'].flatten('save-prod', false, obj, flat)
    t.strictSame(flat, {}, 'no effect if false and missing')
    flat.saveType = 'prod'
    definitions['save-prod'].flatten('save-prod', false, obj, flat)
    t.strictSame(flat, {}, 'remove if false and set to prod')
    flat.saveType = 'dev'
    definitions['save-prod'].flatten('save-prod', false, obj, flat)
    t.strictSame(flat, {saveType: 'dev'}, 'ignore if false and not already prod')
    definitions['save-prod'].flatten('save-prod', true, obj, flat)
    t.strictSame(flat, {saveType: 'prod'}, 'set to prod if true')
    t.end()
  })

  t.test('save-prod', t => {
    const obj = {}
    const flat = {}
    definitions['save-dev'].flatten('save-dev', false, obj, flat)
    t.strictSame(flat, {}, 'no effect if false and missing')
    flat.saveType = 'dev'
    definitions['save-dev'].flatten('save-dev', false, obj, flat)
    t.strictSame(flat, {}, 'remove if false and set to dev')
    flat.saveType = 'prod'
    definitions['save-dev'].flatten('save-dev', false, obj, flat)
    t.strictSame(flat, {saveType: 'prod'}, 'ignore if false and not already dev')
    definitions['save-dev'].flatten('save-dev', true, obj, flat)
    t.strictSame(flat, {saveType: 'dev'}, 'set to dev if true')
    t.end()
  })

  t.test('save-bundle', t => {
    const obj = {}
    const flat = {}
    definitions['save-bundle'].flatten('save-bundle', true, obj, flat)
    t.strictSame(flat, {saveBundle: true}, 'set the saveBundle flag')

    definitions['save-bundle'].flatten('save-bundle', false, obj, flat)
    t.strictSame(flat, {saveBundle: false}, 'unset the saveBundle flag')

    obj['save-peer'] = true
    definitions['save-bundle'].flatten('save-bundle', true, obj, flat)
    t.strictSame(flat, {saveBundle: false}, 'false if save-peer is set')

    t.end()
  })

  t.test('save-peer', t => {
    const obj = {}
    const flat = {}
    definitions['save-peer'].flatten('save-peer', false, obj, flat)
    t.strictSame(flat, {}, 'no effect if false and not yet set')

    definitions['save-peer'].flatten('save-peer', true, obj, flat)
    t.strictSame(flat, {saveType:'peer'}, 'set saveType to peer if unset')

    flat.saveType = 'optional'
    definitions['save-peer'].flatten('save-peer', true, obj, flat)
    t.strictSame(flat, {saveType:'peerOptional'}, 'set to peerOptional if optional already')

    definitions['save-peer'].flatten('save-peer', true, obj, flat)
    t.strictSame(flat, {saveType:'peerOptional'}, 'no effect if already peerOptional')

    definitions['save-peer'].flatten('save-peer', false, obj, flat)
    t.strictSame(flat, {saveType:'optional'}, 'switch peerOptional to optional if false')

    flat.saveType = 'peer'
    definitions['save-peer'].flatten('save-peer', false, obj, flat)
    t.strictSame(flat, {}, 'remove saveType if peer and setting false')

    t.end()
  })

  t.test('save-optional', t => {
    const obj = {}
    const flat = {}
    definitions['save-optional'].flatten('save-optional', false, obj, flat)
    t.strictSame(flat, {}, 'no effect if false and not yet set')

    definitions['save-optional'].flatten('save-optional', true, obj, flat)
    t.strictSame(flat, {saveType:'optional'}, 'set saveType to optional if unset')

    flat.saveType = 'peer'
    definitions['save-optional'].flatten('save-optional', true, obj, flat)
    t.strictSame(flat, {saveType:'peerOptional'}, 'set to peerOptional if peer already')

    definitions['save-optional'].flatten('save-optional', true, obj, flat)
    t.strictSame(flat, {saveType:'peerOptional'}, 'no effect if already peerOptional')

    definitions['save-optional'].flatten('save-optional', false, obj, flat)
    t.strictSame(flat, {saveType:'peer'}, 'switch peerOptional to peer if false')

    flat.saveType = 'optional'
    definitions['save-optional'].flatten('save-optional', false, obj, flat)
    t.strictSame(flat, {}, 'remove saveType if optional and setting false')

    t.end()
  })

  t.end()
})
