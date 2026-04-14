/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailDomainEntity } from '../../../domain/entities/emailDomain/emailDomainEntity'
import { EmailDomain } from '../../../../public/typings/emailDomain'

export class EmailDomainAPITransformer {
  transformEntity(entity: EmailDomainEntity): EmailDomain {
    return {
      domain: entity.domain,
      isMaskDomain: entity.isMaskDomain ?? false,
      metadata: this.parseMetadata(entity.metadata),
    }
  }

  private parseMetadata(metadata?: string): Record<string, string> {
    if (!metadata) {
      return {}
    }

    try {
      return JSON.parse(metadata)
    } catch {
      return {}
    }
  }
}
