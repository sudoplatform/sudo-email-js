/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailAddressPublicKeyEntityTransformer } from './emailAddressPublicKeyEntityTransformer'
import { EmailAddressPublicInfoEntity } from '../../../domain/entities/account/emailAddressPublicInfoEntity'
import { EmailAddressPublicInfo as EmailAddressPublicInfoGraphQL } from '../../../../gen/graphqlTypes'

export class EmailAddressPublicInfoEntityTransformer {
  static transformGraphQL(
    graphql: EmailAddressPublicInfoGraphQL,
  ): EmailAddressPublicInfoEntity {
    const transformed: EmailAddressPublicInfoEntity = {
      emailAddress: graphql.emailAddress,
      keyId: graphql.keyId,
      publicKeyDetails: EmailAddressPublicKeyEntityTransformer.transformGraphQL(
        graphql.publicKeyDetails,
      ),
    }

    return transformed
  }

  static transformEntity(
    entity: EmailAddressPublicInfoEntity,
  ): EmailAddressPublicInfoGraphQL {
    const transformed: EmailAddressPublicInfoGraphQL = {
      emailAddress: entity.emailAddress,
      keyId: entity.keyId,
      publicKey: entity.publicKeyDetails.publicKey,
      publicKeyDetails: EmailAddressPublicKeyEntityTransformer.transformEntity(
        entity.publicKeyDetails,
      ),
    }

    return transformed
  }
}
