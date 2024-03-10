/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EmailMessage,
  EmailMessageAddress,
} from '../../../../public/typings/emailMessage'
import { EmailAddressEntity } from '../../../domain/entities/account/emailAddressEntity'
import { EmailMessageEntity } from '../../../domain/entities/message/emailMessageEntity'

function transformEntityEmailAddressEntity(
  entity: EmailAddressEntity,
): EmailMessageAddress {
  return {
    emailAddress: entity.emailAddress,
    displayName: entity.displayName,
  }
}

export class EmailMessageAPITransformer {
  transformEntity(entity: EmailMessageEntity): EmailMessage {
    return {
      id: entity.id,
      clientRefId: entity.clientRefId,
      owner: entity.owner,
      owners: entity.owners.map(({ id, issuer }) => ({ id, issuer })),
      emailAddressId: entity.emailAddressId,
      folderId: entity.folderId,
      previousFolderId: entity.previousFolderId,
      seen: entity.seen,
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
    }
  }
}
