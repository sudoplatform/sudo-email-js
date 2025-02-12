/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { PublicKeyFormat } from '@sudoplatform/sudo-common'
import { KeyFormat } from '../../../../gen/graphqlTypes'

export class KeyFormatEntityTransformer {
  static transformEntity(entity: PublicKeyFormat): KeyFormat {
    switch (entity) {
      case PublicKeyFormat.RSAPublicKey:
        return KeyFormat.RsaPublicKey
      case PublicKeyFormat.SPKI:
        return KeyFormat.Spki
    }
  }

  static transformGraphQL(model: KeyFormat): PublicKeyFormat {
    switch (model) {
      case KeyFormat.RsaPublicKey:
        return PublicKeyFormat.RSAPublicKey
      case KeyFormat.Spki:
        return PublicKeyFormat.SPKI
    }
  }
}
