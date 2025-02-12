/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { ListOperationResultStatus } from '@sudoplatform/sudo-common'
import { EmailMessageAddress } from '../../../../public/typings/emailMessage'
import { ListEmailMessagesResult } from '../../../../public/typings/listOperationResult'
import { EmailAddressEntity } from '../../../domain/entities/account/emailAddressEntity'
import { EmailMessageEntity } from '../../../domain/entities/message/emailMessageEntity'

function transformEntityEmailAddressEntity(
  entity: EmailAddressEntity,
): EmailMessageAddress {
  return {
    emailAddress: entity.emailAddress,
    ...(entity.displayName && { displayName: entity.displayName }),
  }
}

export class ListEmailMessagesAPITransformer {
  transform(
    entities: EmailMessageEntity[],
    nextToken?: string,
  ): ListEmailMessagesResult {
    const items = entities
      .filter((entity) => entity.status.type === 'Completed')
      .map((entity) => ({
        id: entity.id,
        clientRefId: entity.clientRefId,
        owner: entity.owner,
        owners: entity.owners.map(({ id, issuer }) => ({ id, issuer })),
        emailAddressId: entity.emailAddressId,
        folderId: entity.folderId,
        previousFolderId: entity.previousFolderId,
        seen: entity.seen,
        repliedTo: entity.repliedTo,
        forwarded: entity.forwarded,
        direction: entity.direction,
        state: entity.state,
        from: entity.from.map(transformEntityEmailAddressEntity),
        to: entity.to.map(transformEntityEmailAddressEntity),
        cc: entity.cc.map(transformEntityEmailAddressEntity),
        bcc: entity.bcc.map(transformEntityEmailAddressEntity),
        replyTo: entity.replyTo.map(transformEntityEmailAddressEntity),
        subject: entity.subject,
        hasAttachments: entity.hasAttachments,
        version: entity.version,
        sortDate: entity.sortDate,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        size: entity.size,
        encryptionStatus: entity.encryptionStatus,
        date: entity.date,
      }))
    const failed = entities
      .filter((entity) => entity.status.type === 'Failed')
      .map((entity) => ({
        item: {
          id: entity.id,
          clientRefId: entity.clientRefId,
          owner: entity.owner,
          owners: entity.owners.map(({ id, issuer }) => ({ id, issuer })),
          emailAddressId: entity.emailAddressId,
          folderId: entity.folderId,
          previousFolderId: entity.previousFolderId,
          seen: entity.seen,
          repliedTo: entity.repliedTo,
          forwarded: entity.forwarded,
          direction: entity.direction,
          state: entity.state,
          version: entity.version,
          sortDate: entity.sortDate,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
          size: entity.size,
          encryptionStatus: entity.encryptionStatus,
          date: entity.date,
        },
        cause:
          entity.status.type === 'Failed' ? entity.status.cause : new Error(),
      }))
    if (failed.length > 0) {
      return {
        status: ListOperationResultStatus.Partial,
        items,
        failed,
        nextToken,
      }
    } else {
      return { status: ListOperationResultStatus.Success, items, nextToken }
    }
  }
}
