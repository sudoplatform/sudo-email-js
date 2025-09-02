/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailFolderEntity } from '../../domain/entities/folder/emailFolderEntity'
import {
  CreateCustomEmailFolderForEmailAddressIdInput,
  DeleteCustomEmailFolderForEmailAddressIdInput,
  DeleteMessagesByFolderIdInput,
  EmailFolderService,
  ListEmailFoldersForEmailAddressIdInput,
  ListEmailFoldersForEmailAddressIdOutput,
  UpdateCustomEmailFolderForEmailAddressIdInput,
} from '../../domain/entities/folder/emailFolderService'
import { ApiClient } from '../common/apiClient'
import {
  SealedAttributeInput,
  CreateCustomEmailFolderInput,
  DeleteCustomEmailFolderInput,
  UpdateCustomEmailFolderInput,
  DeleteMessagesByFolderIdInput as DeleteMessagesByFolderIdRequest,
} from '../../../gen/graphqlTypes'
import { FetchPolicyTransformer } from '../common/transformer/fetchPolicyTransformer'
import { EmailFolderEntityTransformer } from './transformer/emailFolderEntityTransformer'
import { DeviceKeyWorker, KeyType } from '../common/deviceKeyWorker'
import {
  EncryptionAlgorithm,
  Buffer as BufferUtil,
} from '@sudoplatform/sudo-common'
import { KeyNotFoundError } from '@sudoplatform/sudo-web-crypto-provider'

export class DefaultEmailFolderService implements EmailFolderService {
  private readonly transformer: EmailFolderEntityTransformer
  constructor(
    private readonly appSync: ApiClient,
    private readonly deviceKeyWorker: DeviceKeyWorker,
  ) {
    this.transformer = new EmailFolderEntityTransformer(deviceKeyWorker)
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

    const folderResults = await Promise.allSettled(
      result.items.map((folder) => {
        return this.transformer.transformGraphQL(folder)
      }),
    )
    folderResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        folders.push(result.value)
      } else {
        console.error({ error: result.reason }, 'Error transforming folder')
      }
    })
    return {
      folders,
      nextToken: result.nextToken ?? undefined,
    }
  }

  async createCustomEmailFolderForEmailAddressId({
    customFolderName,
    emailAddressId,
    allowSymmetricKeyGeneration = true,
  }: CreateCustomEmailFolderForEmailAddressIdInput): Promise<EmailFolderEntity> {
    let symmetricKeyId = await this.deviceKeyWorker.getCurrentSymmetricKeyId()

    if (!symmetricKeyId) {
      if (allowSymmetricKeyGeneration) {
        symmetricKeyId =
          await this.deviceKeyWorker.generateCurrentSymmetricKey()
      } else {
        throw new KeyNotFoundError()
      }
    }

    const sealedCustomFolderName = await this.deviceKeyWorker.sealString({
      payload: BufferUtil.fromString(customFolderName),
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
      emailAddressId: emailAddressId,
      customFolderName: sealedAttribute,
    }

    const result = await this.appSync.createCustomEmailFolder(
      createCustomEmailFolderInput,
    )
    return await this.transformer.transformGraphQL(result)
  }

  async deleteCustomEmailFolderForEmailAddressId(
    input: DeleteCustomEmailFolderForEmailAddressIdInput,
  ): Promise<EmailFolderEntity | undefined> {
    const deleteCustomEmailFolderInput: DeleteCustomEmailFolderInput = {
      emailFolderId: input.emailFolderId,
      emailAddressId: input.emailAddressId,
    }

    const result = await this.appSync.deleteCustomEmailFolder(
      deleteCustomEmailFolderInput,
    )
    return result ? await this.transformer.transformGraphQL(result) : result
  }

  async updateCustomEmailFolderForEmailAddressId({
    emailAddressId,
    emailFolderId,
    values,
    allowSymmetricKeyGeneration = true,
  }: UpdateCustomEmailFolderForEmailAddressIdInput): Promise<EmailFolderEntity> {
    const updateInput: Record<string, SealedAttributeInput> = {}
    if (values.customFolderName) {
      let symmetricKeyId = await this.deviceKeyWorker.getCurrentSymmetricKeyId()

      if (!symmetricKeyId) {
        if (allowSymmetricKeyGeneration) {
          symmetricKeyId =
            await this.deviceKeyWorker.generateCurrentSymmetricKey()
        } else {
          throw new KeyNotFoundError()
        }
      }

      const sealedCustomFolderName = await this.deviceKeyWorker.sealString({
        payload: BufferUtil.fromString(values.customFolderName),
        keyId: symmetricKeyId,
        keyType: KeyType.SymmetricKey,
      })

      updateInput.customFolderName = {
        algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
        keyId: symmetricKeyId,
        plainTextType: 'string',
        base64EncodedSealedData: sealedCustomFolderName,
      }
    }
    const updateCustomEmailFolderInput: UpdateCustomEmailFolderInput = {
      emailAddressId: emailAddressId,
      emailFolderId: emailFolderId,
      values: updateInput,
    }

    const result = await this.appSync.updateCustomEmailFolder(
      updateCustomEmailFolderInput,
    )
    return await this.transformer.transformGraphQL(result)
  }

  async deleteMessagesByFolderId(
    input: DeleteMessagesByFolderIdInput,
  ): Promise<string> {
    const deleteMessagesByFolderIdRequest: DeleteMessagesByFolderIdRequest = {
      folderId: input.emailFolderId,
      emailAddressId: input.emailAddressId,
      hardDelete: input.hardDelete,
    }

    return await this.appSync.deleteMessagesByFolderId(
      deleteMessagesByFolderIdRequest,
    )
  }
}
