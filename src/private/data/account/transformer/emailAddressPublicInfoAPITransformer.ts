/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailAddressPublicKeyAPITransformer } from './emailAddressPublicKeyAPITransformer'
import { EmailAddressPublicInfo } from '../../../../public/typings/emailAddressPublicInfo'
import { EmailAddressPublicInfoEntity } from '../../../domain/entities/account/emailAddressPublicInfoEntity'

export class EmailAddressPublicInfoAPITransformer {
  static transformEntity(
    entity: EmailAddressPublicInfoEntity,
  ): EmailAddressPublicInfo {
    return {
      emailAddress: entity.emailAddress,
      keyId: entity.keyId,
      publicKey: entity.publicKeyDetails.publicKey,
      publicKeyDetails: EmailAddressPublicKeyAPITransformer.transformEntity(
        entity.publicKeyDetails,
      ),
    }
  }
}
