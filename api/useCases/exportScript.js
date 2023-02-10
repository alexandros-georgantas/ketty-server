const config = require('config')
const forEach = require('lodash/forEach')

const scripts = config.get('export.scripts')

const getExportScripts = async (scope = undefined) => {
  try {
    let res = []

    if (!scripts || scripts.length === 0) {
      return res
    }

    if (!scope) {
      res = scripts.map(script => ({
        label: `${script.label} (${script.scope})`,
        value: `${script.label}-${script.scope}`,
        scope: script.scope,
      }))
      return res
    }

    forEach(scripts, script => {
      if (script.scope.toLowerCase() === scope.toLowerCase()) {
        res.push({
          label: `${script.label} (${script.scope})`,
          value: `${script.label}-${script.scope}`,
          scope: script.scope,
        })
      }
    })
    return res
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  getExportScripts,
}
