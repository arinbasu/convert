const papa = require('papaparse')

const SheetConverter = require('./SheetConverter')

/**
 * Converter to import/export a Sheet from/to a delimiter separated values (DSV) file
 *
 * There are several dialects of [DSV](https://en.wikipedia.org/wiki/Delimiter-separated_values)
 * the best known of which is CSV (comma separated values).
 *
 * Converts to/from Stencila's internal XML buffer format for Sheets
 */
class SheetDSVConverter extends SheetConverter {
  /**
   * @override
   */
  match (path) {
    return this.matchExtensions(path, ['csv', 'tsv', 'psv'])
  }

  get fileExternal () {
    // TODO file extension based on format
    return 'external.txt'
  }

  /**
   * @override
   */
  import (pathFrom, pathTo, volumeFrom, volumeTo, options = {}) {
    return this.prepareImport(...arguments).then(({ pathFrom, pathTo, volumeFrom, volumeTo }) => {
      return this.readFile(pathFrom, volumeFrom, options).then((content) => {
        options.header = options.header === true

        const result = papa.parse(content.trim(), {
          header: options.header
        })
        const rows = result.data
        const names = Object.keys(rows[0])

        return this.createDom().then((dom) => {
          if (options.header) {
            const columnsEl = dom('meta columns')
            names.forEach((name) => {
              columnsEl.append(dom('<column>').attr('name', name))
            })
          }

          const dataEl = dom('data')
          rows.forEach((row) => {
            const rowEl = dom('<row>')
            names.forEach((name) => {
              rowEl.append(dom('<cell>').text(row[name]))
            })
            dataEl.append(rowEl)
          })

          return this.writeXml(pathTo, dom, volumeTo).then(() => {
            return pathTo
          })
        })
      })
    })
  }
}

module.exports = SheetDSVConverter
