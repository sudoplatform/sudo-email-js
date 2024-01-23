/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailFolderEntity } from '../../domain/entities/folder/emailFolderEntity'
import {
  CreateCustomEmailFolderForEmailAddressIdInput,
  EmailFolderService,
  ListEmailFoldersForEmailAddressIdInput,
  ListEmailFoldersForEmailAddressIdOutput,
} from '../../domain/entities/folder/emailFolderService'
import { ApiClient } from '../common/apiClient'
import {
  SealedAttributeInput,
  CreateCustomEmailFolderInput,
  SealedAttribute,
  EmailFolder,
} from '../../../gen/graphqlTypes'
import { FetchPolicyTransformer } from '../common/transformer/fetchPolicyTransformer'
import { EmailFolderEntityTransformer } from './transformer/emailFolderEntityTransformer'
import { DeviceKeyWorker, KeyType } from '../common/deviceKeyWorker'
import {
  EncryptionAlgorithm,
  KeyNotFoundError,
} from '@sudoplatform/sudo-common'

export class DefaultEmailFolderService implements EmailFolderService {
  private readonly transformer: EmailFolderEntityTransformer
  constructor(
    private readonly appSync: ApiClient,
    private readonly deviceKeyWorker: DeviceKeyWorker,
  ) {
    this.transformer = new EmailFolderEntityTransformer()
  }

  async listEmailFoldersForEmailAddressId({
    emailAddressId,
    cachePolicy,
    limit,
    nextToken,
  }: ListEmailFoldersForEmailAddressIdInput): Promise<ListEmailFoldersForEmailAddressIdOutput> {
    const fetchPolicy = cachePolicy
      ? FetchPolicyTransformer.transformCachePolicy(cachePolicy)
      : undefined
    const result = await this.appSync.listEmailFoldersForEmailAddressId(
      emailAddressId,
      fetchPolicy,
      limit,
      nextToken,
    )
    const folders: EmailFolderEntity[] = []
    if (result.items) {
      result.items.map((item) =>
        folders.push(this.transformer.transformGraphQL(item)),
      )
    }
    return {
      folders,
      nextToken: result.nextToken ?? undefined,
    }
  }

  async createCustomEmailFolderForEmailAddressId(
    input: CreateCustomEmailFolderForEmailAddressIdInput,
  ): Promise<EmailFolderEntity> {
    const symmetricKeyId =
      (await this.deviceKeyWorker.getCurrentSymmetricKeyId()) ??
      (await this.deviceKeyWorker.generateCurrentSymmetricKey())

    const sealedCustomFolderName = await this.deviceKeyWorker.sealString({
      payload: new TextEncoder().encode(input.customFolderName),
      keyId: symmetricKeyId,
      keyType: KeyType.SymmetricKey,
    })

    const sealedAttribute: SealedAttributeInput = {
      algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
      keyId: symmetricKeyId,
      plainTextType: 'string',
      base64EncodedSealedData: sealedCustomFolderName,
    }

    const createCustomEmailFolderInput: CreateCustomEmailFolderInput = {
      emailAddressId: input.emailAddressId,
      customFolderName: sealedAttribute,
    }

    const result = await this.appSync.createCustomEmailFolder(
      createCustomEmailFolderInput,
    )
    return await this.mapEmailFolder(result)
  }
  mapEmailFolder = async (
    emailFolder: EmailFolder,
  ): Promise<EmailFolderEntity> => {
    const transformed = this.transformer.transformGraphQL(emailFolder)
    if (emailFolder.customFolderName) {
      const symmetricKeyExists = await this.deviceKeyWorker.keyExists(
        emailFolder.customFolderName.keyId,
        KeyType.SymmetricKey,
      )
      if (symmetricKeyExists) {
        try {
          const unsealedCustomFolderName = await this.unsealCustomFolderName(
            emailFolder.customFolderName,
          )
          transformed.customFolderName = unsealedCustomFolderName
        } catch (error) {
          // Tolerate inability to unseal customFolderName. We have the correct
          // key so this is a decoding error
          transformed.customFolderName = ''
        }
      } else {
        transformed.status = {
          type: 'Failed',
          cause: new KeyNotFoundError(),
        }
      }
    }
    return transformed
  }

  unsealCustomFolderName = async (
    customFolderName: SealedAttribute,
  ): Promise<string> => {
    return this.deviceKeyWorker.unsealString({
      encrypted: customFolderName.base64EncodedSealedData,
      keyId: customFolderName.keyId,
      keyType: KeyType.SymmetricKey,
      algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
    })
  }
}
