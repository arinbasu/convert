const fs = require('fs')
const memfs = require('memfs')
const path = require('path')
const yaml = require('js-yaml')
const yamlFront = require('yaml-front-matter')

const DocumentPandocConverter = require('./DocumentPandocConverter')

class DocumentMdConverter extends DocumentPandocConverter {
  extensions () {
    return ['md']
  }

  pandocImportFormat () {
    return 'markdown-auto_identifiers'
  }

  pandocImportArgs (options) {
    return super.pandocImportArgs(options).concat([
      '--filter=pandoc-citeproc' // Use citeproc filter of citaion and reference support
    ])
  }

  pandocExportFormat () {
    return 'markdown'
  }

  pandocExportTemplate () {
    return path.join(__dirname, 'DocumentMdTemplate.md')
  }

  pandocExportArgs (options) {
    return super.pandocExportArgs(options).concat([
      '--columns=100', // Text wrapping width (for discussion on optimum see https://www.viget.com/articles/the-line-length-misconception/)
      '--atx-headers'  // Use ATX (#) headers
    ])
  }

  import (pathFrom, pathTo, volumeFrom, volumeTo, options = {}) {
    volumeFrom = volumeFrom || fs
    volumeTo = volumeTo || volumeFrom

    // Process any YAML front matter by translating any aliases
    return this.readFile(pathFrom, volumeFrom || fs).then((md) => {
      let front = yamlFront.loadFront(md)

      let author = front.author || front.authors
      if (author) {
        author = author.map(author => {
          return {
            'surname': author['surname'],
            'given-names': author['given-names'],
            'aff-id': author['aff-id'] || author['affiliation']
          }
        })
        front.author = author
        if (front.authors) front.authors = undefined
      }

      let orgs = front.orgs || front.organisations
      if (orgs) {
        front.orgs = orgs
        if (front.organisations) front.organisations = undefined
      }

      let mdNew = `---\n${yaml.dump(front)}\n---\n\n${front.__content}`

      const volumeTemp = new memfs.Volume()
      return this.writeFile(pathFrom, mdNew, volumeTemp).then(() => {
        return super.import(pathFrom, pathTo, volumeTemp, volumeTo, options)
      })
    })
  }

  export (pathFrom, pathTo, volumeFrom, volumeTo, options = {}) {
    const volumeTemp = new memfs.Volume()
    return super.export(pathFrom, '/temp.md', volumeFrom, volumeTemp, options).then(() => {
      return this.readFile('/temp.md', volumeTemp)
    }).then(md => {
      let mdNew
      if (options.complete) {
        // DocumentMdTemplate.md writes metadata as JSON on the first line
        // so extract that from the content
        const lines = md.split('\n')
        const json = lines[0]
        const content = lines.slice(1).join('\n')

        let front = JSON.parse(json)

        mdNew = `---\n${yaml.dump(front)}---\n\n${content}`
      } else {
        mdNew = md
      }
      return this.writeFile(pathTo, mdNew, volumeTo)
    })
  }
}

module.exports = DocumentMdConverter
