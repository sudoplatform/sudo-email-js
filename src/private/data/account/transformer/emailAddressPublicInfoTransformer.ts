/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailAddressPublicInfo as EmailAddressPublicInfoGraphQL } from '../../../../gen/graphqlTypes'
import { EmailAddressPublicInfo } from '../../../../public/typings/emailAddressPublicInfo'
import { EmailAddressPublicInfoEntity } from '../../../domain/entities/account/emailAddressPublicInfoEntity'

export class EmailAddressPublicInfoTransformer {
  public static transformGraphQL(
    graphql: EmailAddressPublicInfoGraphQL,
  ): EmailAddressPublicInfoEntity {
    const transformed: EmailAddressPublicInfoEntity = {
      emailAddress: graphql.emailAddress,
      publicKey: graphql.publicKey,
    }

    return transformed
  }

  public static transformEntity(
    entity: EmailAddressPublicInfoEntity,
  ): EmailAddressPublicInfo {
    const transformed: EmailAddressPublicInfo = {
      emailAddress: entity.emailAddress,
      publicKey: entity.publicKey,
    }

    return transformed
  }
}
