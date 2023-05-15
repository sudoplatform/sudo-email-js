/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailFolder } from '../../../../gen/graphqlTypes'
import { EmailFolderEntity } from '../../../domain/entities/folder/emailFolderEntity'

export class EmailFolderEntityTransformer {
  transformGraphQL(data: EmailFolder): EmailFolderEntity {
    return {
      id: data.id,
      owner: data.owner,
      owners: data.owners.map(({ id, issuer }) => ({
        id,
        issuer,
      })),
      emailAddressId: data.emailAddressId,
      folderName: data.folderName,
      size: data.size,
      unseenCount: data.unseenCount,
      ttl: data.ttl ?? undefined,
      version: data.version,
      createdAt: new Date(data.createdAtEpochMs),
      updatedAt: new Date(data.updatedAtEpochMs),
    }
  }
}
