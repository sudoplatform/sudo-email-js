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
}
