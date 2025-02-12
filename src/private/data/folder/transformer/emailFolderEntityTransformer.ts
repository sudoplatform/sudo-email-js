/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EncryptionAlgorithm,
  KeyNotFoundError,
} from '@sudoplatform/sudo-common'
import { EmailFolder, SealedAttribute } from '../../../../gen/graphqlTypes'
import { EmailFolderEntity } from '../../../domain/entities/folder/emailFolderEntity'
import { DeviceKeyWorker, KeyType } from '../../common/deviceKeyWorker'

export class EmailFolderEntityTransformer {
  constructor(private readonly deviceKeyWorker: DeviceKeyWorker) {}

  async transformGraphQL(data: EmailFolder): Promise<EmailFolderEntity> {
    const entity: EmailFolderEntity = {
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
      status: { type: 'Completed' },
      createdAt: new Date(data.createdAtEpochMs),
      updatedAt: new Date(data.updatedAtEpochMs),
    }

    if (data.customFolderName) {
      try {
        entity.customFolderName = await this.unsealCustomFolderName(
          data.customFolderName,
        )
      } catch (e) {
        entity.status = { type: 'Failed', cause: e as Error }
      }
    }

    return entity
  }

  private async unsealCustomFolderName(
    sealedCustomFolderName: SealedAttribute,
  ): Promise<string> {
    const symmetricKeyExists = await this.deviceKeyWorker.keyExists(
      sealedCustomFolderName.keyId,
      KeyType.SymmetricKey,
    )
    if (symmetricKeyExists) {
      try {
        return await this.deviceKeyWorker.unsealString({
          encrypted: sealedCustomFolderName.base64EncodedSealedData,
          keyId: sealedCustomFolderName.keyId,
          keyType: KeyType.SymmetricKey,
          algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
        })
      } catch {
        // Tolerate inability to unseal customFolderName. We have the correct
        // key so this is a decoding error
        return ''
      }
    } else {
      throw new KeyNotFoundError()
    }
  }
}
