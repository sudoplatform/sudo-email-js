/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailMessageEncryptionStatus as EncryptionStatusGQL } from '../../../../gen/graphqlTypes'
import { EncryptionStatus } from '../../../../public/typings/encryptionStatus'

export class EmailMessageEncryptionStatusTransformer {
  fromAPIToGraphQL(data: EncryptionStatus): EncryptionStatusGQL {
    switch (data) {
      case EncryptionStatus.ENCRYPTED:
        return EncryptionStatusGQL.Encrypted
      case EncryptionStatus.UNENCRYPTED:
        return EncryptionStatusGQL.Unencrypted
    }
  }

  fromGraphQLToAPI(data: EncryptionStatusGQL): EncryptionStatus {
    switch (data) {
      case EncryptionStatusGQL.Encrypted:
        return EncryptionStatus.ENCRYPTED
      case EncryptionStatusGQL.Unencrypted:
        return EncryptionStatus.UNENCRYPTED
    }
  }
}
