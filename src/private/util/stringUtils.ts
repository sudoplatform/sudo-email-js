/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash } from 'crypto'

export function generateHash(cleartext: string): string {
  return createHash('sha256').update(cleartext).digest('base64')
}

export function htmlToPlaintext(html: string): string {
  let text = html
  text = text.replace(/<style([\s\S]*?)<\/style>/gi, '')
  text = text.replace(/<script([\s\S]*?)<\/script>/gi, '')
  text = text.replace(/<a.*?href="(.*?)[\?\"].*?>(.*?)<\/a.*?>/gi, ' $2 $1 ')
  text = text.replace(/<\/div>/gi, '\n\n')
  text = text.replace(/<\/li>/gi, '\n')
  text = text.replace(/<li.*?>/gi, '  *  ')
  text = text.replace(/<\/ul>/gi, '\n\n')
  text = text.replace(/<\/p>/gi, '\n\n')
  text = text.replace(/<br\s*[\/]?>/gi, '\n')
  text = text.replace(/<[^>]+>/gi, '')
  text = text.replace(/ ,/gi, ',')
  text = text.replace(/ +/gi, ' ')
  return text
}

export function escapeBackslashesAndDoubleQuotes(unescaped: string): string {
  return unescaped
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/"/g, '\"') // Escape double quotes
}

/**
 * This function will insert a `\n` into the string every lineLength characters.
 * It's main use is to ensure compliance with the RFC5322 (https://www.ietf.org/rfc/rfc5322.txt#:~:text=Each%20line%20of%20characters%20MUST,998%20characters%20on%20a%20line.)
 * suggestion to have no more than 78 characters in a line, hence the default lineLength value of 78
 * @param {string} str
 * @param {number} lineLength
 * @returns {string}
 */
export function insertLinebreaks(str: string, lineLength = 78): string {
  // Insert line breaks every n characters
  return str.replace(new RegExp(`(.{${lineLength}})`, 'g'), '$1\n')
}
