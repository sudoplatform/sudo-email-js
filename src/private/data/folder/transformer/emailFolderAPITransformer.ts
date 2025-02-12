/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailFolder } from '../../../../public/typings/emailFolder'
import { EmailFolderEntity } from '../../../domain/entities/folder/emailFolderEntity'

export class EmailFolderAPITransformer {
  transformEntity(entity: EmailFolderEntity): EmailFolder {
    const transformed: EmailFolder = {
      id: entity.id,
      owner: entity.owner,
      owners: entity.owners.map(({ id, issuer }) => ({ id, issuer })),
      emailAddressId: entity.emailAddressId,
      size: entity.size,
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      folderName: entity.folderName,
      unseenCount: entity.unseenCount,
      ttl: entity.ttl,
    }

    if (entity.customFolderName) {
      transformed.customFolderName = entity.customFolderName
    }
    return transformed
  }
}
