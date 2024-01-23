/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailAddress } from '../../../../public/typings/emailAddress'
import { EmailAccountEntity } from '../../../domain/entities/account/emailAccountEntity'
import { EmailFolderAPITransformer } from '../../folder/transformer/emailFolderAPITransformer'

export class EmailAddressAPITransformer {
  transformEntity(entity: EmailAccountEntity): EmailAddress {
    const folderTransformer = new EmailFolderAPITransformer()
    const transformed: EmailAddress = {
      id: entity.id,
      owner: entity.owner,
      owners: entity.owners.map(({ id, issuer }) => ({ id, issuer })),
      identityId: entity.identityId,
      emailAddress: entity.emailAddress.emailAddress,
      size: entity.size,
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      lastReceivedAt: entity.lastReceivedAt,
      folders: entity.folders.map((folder) =>
        folderTransformer.transformEntity(folder),
      ),
    }
    if (entity.emailAddress.alias) {
      transformed.alias = entity.emailAddress.alias
    }
    return transformed
  }
}
