'use strict'

const stream = require('stream')
const chalk = require('chalk')
const { parse } = require('date-fns')

/**
 * What do you mean?
 *
 * A custom (Duplex) Transform stream.
 */
class WDYM extends stream.Transform {
  /**
   * Transforms input stream in Common Log Format into useful JSON.
   * @param {stream.Readable} chunk - the input stream of data
   * @param {String} encoding - character encoding of the chunk
   * @param {Function} callback - called when processing is complete for the supplied chunk
   */
  _transform(chunk, encoding, callback) {
    const input = chunk.toString()
    const lines = input.split(/\n/)
    let json = { log: [] }
    lines.forEach((line) => {
      const matches = this.isCLF(line)
      if (matches) {
        const serverLog = {
          remoteHost: matches[1],
          remoteLogName: matches[2],
          authUser: matches[3],
          date:
            Date.parse(matches[4]) || this.parseDate(matches[4])
              ? this.parseDate(matches[4])
              : 'unreadable',
          request: matches[5],
          status: Number(matches[6]) || 'Invalid Status Code',
          size: Number(matches[7]) || 0,
        }
        json.log.push(serverLog)
      } else {
        console.error(
          chalk.red.bold('ERROR'),
          'The log is not in Common Log Format (CLF)'
        )
        process.exit(0)
      }
    })
    this.push(JSON.stringify(json))
    callback()
  }

  /**
   * Matches the line to the standardised (ASCII) CLF Log format.
   * https://www.iri.com/blog/migration/data-migration/clf-elf-web-log-formats/
   * @param {String} line - a line of the input stream
   * @returns {Array}
   */
  isCLF(line) {
    return line.match(
      /^(\S+) (\S+) (\S+) \[([^\]]*)\] "([^"]*)" (\d{3}|-) (\d+|-)\s?"?([^"]*)"?\s?"?([^"]*)?"?$/m
    )
  }

  /**
   * Parses CLF Standard date ([day/month/year:hour:minute:second zone])
   * @param {String} date
   */
  parseDate(date) {
    if (Date.parse(date)) return new Date(date)

    const strftime = /([\w:/]+\s[+\-]\d{4})/
    if (date.match(strftime)) {
      const parsed = parse(date, 'd/MMM/yyyy:kk:mm:ss XX', new Date())
      if (!isNaN(parsed)) return parsed
    }

    return null
  }
}

module.exports = WDYM
