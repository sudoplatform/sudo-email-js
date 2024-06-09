/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
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
