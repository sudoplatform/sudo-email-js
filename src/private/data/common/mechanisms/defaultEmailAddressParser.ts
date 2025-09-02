/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import EmailAddressParser from '../../../domain/entities/common/mechanisms/emailAddressParser'

export class DefaultEmailAddressParser implements EmailAddressParser {
  normalize(email: string): string {
    const [localPart, domain] = email.toLowerCase().split('@', 2) // split local part from domain

    if (!domain) {
      return localPart
    } else {
      return `${localPart}@${domain}`
    }
  }

  getDomain(email: string): string {
    const [, domain] = email.toLowerCase().split('@', 2)
    return domain || ''
  }

  private readonly regex = /^[\S]+@[\S]+\.[\S]+$/

  validate(email: string): boolean {
    if (email.length > 256) {
      return false
    }
    if (!this.regex.test(email)) {
      return false
    }

    const [localPart, address] = email.split('@')
    if (localPart.length > 64) {
      return false
    }
    if (!address) {
      return false
    }
    const domainParts = address.split('.')
    if (
      domainParts.some(function (part) {
        return part.length > 63
      })
    ) {
      return false
    }

    return true
  }
}
