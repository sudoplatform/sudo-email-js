/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailAddressPublicKey } from '../../../../public/typings/emailAddressPublicKey'
import { EmailAddressPublicKeyEntity } from '../../../domain/entities/account/emailAddressPublicKeyEntity'

export class EmailAddressPublicKeyAPITransformer {
  static transformEntity(
    entity: EmailAddressPublicKeyEntity,
  ): EmailAddressPublicKey {
    return {
      publicKey: entity.publicKey,
      algorithm: entity.algorithm,
      keyFormat: entity.keyFormat,
    }
  }
}
