/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EmailMessageEncryptionStatus,
  SealedEmailMessage,
} from '../../../../gen/graphqlTypes'
import { SealedEmailMessageEntity } from '../../../domain/entities/message/sealedEmailMessageEntity'
import { EmailMessageDirectionTransformer } from './emailMessageDirectionTransformer'
import { EmailMessageEncryptionStatusTransformer } from './emailMessageEncryptionStatusTransformer'
import { EmailMessageStateTransformer } from './emailMessageStateTransformer'

export class SealedEmailMessageEntityTransformer {
  transformGraphQL(data: SealedEmailMessage): SealedEmailMessageEntity {
    const directionTransformer = new EmailMessageDirectionTransformer()
    const stateTransformer = new EmailMessageStateTransformer()
    const encryptionStatusTransformer =
      new EmailMessageEncryptionStatusTransformer()
    return {
      id: data.id,
      owner: data.owner,
      owners: data.owners.map(({ id, issuer }) => ({ id, issuer })),
      emailAddressId: data.emailAddressId,
      keyId: data.rfc822Header.keyId,
      algorithm: data.rfc822Header.algorithm,
      folderId: data.folderId,
      previousFolderId: data.previousFolderId ?? undefined,
      direction: directionTransformer.fromGraphQLtoAPI(data.direction),
      seen: data.seen,
      repliedTo: data.repliedTo,
      forwarded: data.forwarded,
      state: stateTransformer.fromGraphQLtoAPI(data.state),
      clientRefId: data.clientRefId ?? undefined,
      rfc822Header: data.rfc822Header.base64EncodedSealedData,
      version: data.version,
      sortDate: new Date(data.sortDateEpochMs),
      createdAt: new Date(data.createdAtEpochMs),
      updatedAt: new Date(data.updatedAtEpochMs),
      size: data.size,
      encryptionStatus: encryptionStatusTransformer.fromGraphQLToAPI(
        data.encryptionStatus ?? EmailMessageEncryptionStatus.Unencrypted,
      ),
      emailMaskId: data.emailMaskId ?? undefined,
    }
  }
}
