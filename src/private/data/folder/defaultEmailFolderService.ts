/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailFolderEntity } from '../../domain/entities/folder/emailFolderEntity'
import {
  CreateCustomEmailFolderForEmailAddressIdInput,
  DeleteCustomEmailFolderForEmailAddressIdInput,
  EmailFolderService,
  ListEmailFoldersForEmailAddressIdInput,
  ListEmailFoldersForEmailAddressIdOutput,
} from '../../domain/entities/folder/emailFolderService'
import { ApiClient } from '../common/apiClient'
import {
  SealedAttributeInput,
  CreateCustomEmailFolderInput,
  DeleteCustomEmailFolderInput,
} from '../../../gen/graphqlTypes'
import { FetchPolicyTransformer } from '../common/transformer/fetchPolicyTransformer'
import { EmailFolderEntityTransformer } from './transformer/emailFolderEntityTransformer'
import { DeviceKeyWorker, KeyType } from '../common/deviceKeyWorker'
import { EncryptionAlgorithm } from '@sudoplatform/sudo-common'

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
}
