/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailDomainEntity } from '../../../domain/entities/account/emailDomainEntity'

export class EmailDomainEntityTransformer {
  transformGraphQL(domain: string): EmailDomainEntity {
    return {
      domain,
    }
  }
}
