/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailAddressEntity } from '../../../domain/entities/account/emailAddressEntity'

export class EmailAddressEntityTransformer {
  transform(address: string, alias?: string): EmailAddressEntity {
    return alias ? { emailAddress: address, alias } : { emailAddress: address }
  }
}
