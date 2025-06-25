/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EncryptionAlgorithm,
  KeyNotFoundError,
} from '@sudoplatform/sudo-common'
import { EmailAddress, SealedAttribute } from '../../../../gen/graphqlTypes'
import { EmailAccountEntity } from '../../../domain/entities/account/emailAccountEntity'
import { DeviceKeyWorker, KeyType } from '../../common/deviceKeyWorker'
import { EmailFolderEntityTransformer } from '../../folder/transformer/emailFolderEntityTransformer'
import { EmailAddressEntityTransformer } from './emailAddressEntityTransformer'

export class EmailAccountEntityTransformer {
  constructor(private readonly deviceKeyWorker: DeviceKeyWorker) {}

  async transformGraphQL(data: EmailAddress): Promise<EmailAccountEntity> {
    const emailAddressTransformer = new EmailAddressEntityTransformer()
    const emailFolderTransformer = new EmailFolderEntityTransformer(
      this.deviceKeyWorker,
    )
    const entity: EmailAccountEntity = {
      id: data.id,
      owner: data.owner,
      owners: data.owners.map(({ id, issuer }) => ({ id, issuer })),
      identityId: data.identityId,
      keyRingId: data.keyRingId,
      emailAddress: emailAddressTransformer.transform(data.emailAddress),
      size: data.size,
      numberOfEmailMessages: data.numberOfEmailMessages,
      version: data.version,
      createdAt: new Date(data.createdAtEpochMs),
      updatedAt: new Date(data.updatedAtEpochMs),
      lastReceivedAt:
        data.lastReceivedAtEpochMs === undefined ||
        data.lastReceivedAtEpochMs === null
          ? undefined
          : new Date(data.lastReceivedAtEpochMs),
      status: { type: 'Completed' },
      folders: [],
    }

    const folderResults = await Promise.allSettled(
      data.folders.map((folder) => {
        return emailFolderTransformer.transformGraphQL(folder)
      }),
    )
    folderResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        entity.folders.push(result.value)
      } else {
        entity.status = { type: 'Failed', cause: result.reason as Error }
      }
    })

    if (data.alias) {
      try {
        const alias = await this.unsealAlias(data.alias)
        entity.emailAddress.alias = alias
      } catch (e) {
        console.error({ e })
        entity.status = { type: 'Failed', cause: e as Error }
      }
    }

    return entity
  }

  async unsealAlias(sealedAlias: SealedAttribute): Promise<string> {
    const symmetricKeyExists = await this.deviceKeyWorker.keyExists(
      sealedAlias.keyId,
      KeyType.SymmetricKey,
    )
    if (symmetricKeyExists) {
      try {
        return await this.deviceKeyWorker.unsealString({
          encrypted: sealedAlias.base64EncodedSealedData,
          keyId: sealedAlias.keyId,
          keyType: KeyType.SymmetricKey,
          algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
        })
      } catch (e) {
        console.warn('Could not unseal', { e })
        // Tolerate inability to unseal alias. We have the correct
        // key so this is a decoding error
        return ''
      }
    } else {
      throw new KeyNotFoundError()
    }
  }
}
