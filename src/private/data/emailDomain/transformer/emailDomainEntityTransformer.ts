/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailDomainEntity } from '../../../domain/entities/emailDomain/emailDomainEntity'
import { EmailDomain as GraphQLEmailDomain } from '../../../../gen/graphqlTypes'

export class EmailDomainEntityTransformer {
  transformGraphQL(domain: string): EmailDomainEntity {
    return {
      domain,
    }
  }

  transformListEmailDomainsGraphQL(
    emailDomain: GraphQLEmailDomain,
  ): EmailDomainEntity {
    return {
      domain: emailDomain.domain,
      isMaskDomain: emailDomain.isMaskDomain,
      metadata: emailDomain.metadata,
    }
  }
}
