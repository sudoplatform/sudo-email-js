/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DefaultLogger,
  Logger,
  Buffer as BufferUtil,
  EncryptionAlgorithm,
} from '@sudoplatform/sudo-common'
import {
  DeprovisionEmailMaskInput,
  DisableEmailMaskInput,
  EmailMaskService,
  EnableEmailMaskInput,
  ListEmailMasksForOwnerInput,
  ListEmailMasksOutput,
  ProvisionEmailMaskInput,
  UpdateEmailMaskInput,
} from '../../domain/entities/mask/emailMaskService'
import {
  ProvisionEmailMaskInput as ProvisionEmailMaskRequest,
  UpdateEmailMaskInput as UpdateEmailMaskRequest,
  ListEmailMasksForOwnerInput as ListEmailMasksForOwnerRequest,
  SealedAttribute,
  KeyFormat as GraphQLKeyFormat,
} from '../../../gen/graphqlTypes'
import { EmailMaskEntity } from '../../domain/entities/mask/emailMaskEntity'
import { ApiClient } from '../common/apiClient'
import {
  DeviceKeyWorker,
  DeviceKeyWorkerKeyFormat,
  KeyType,
} from '../common/deviceKeyWorker'
import { EmailMaskTransformer } from './transformer/emailMaskTransformer'
import { secondsSinceEpoch } from '../../util/date'
import { EmailMaskFilterTransformer } from './transformer/emailMaskFilterTransformer'
import { EmailAccountServiceConfig } from '../account/defaultEmailAccountService'

export class DefaultEmailMaskService implements EmailMaskService {
  private readonly log: Logger
  private readonly transformer: EmailMaskTransformer

  constructor(
    private readonly appSync: ApiClient,
    private readonly deviceKeyWorker: DeviceKeyWorker,
    private readonly config?: EmailAccountServiceConfig,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
    this.transformer = new EmailMaskTransformer(this.deviceKeyWorker, this.log)
  }

  async provisionEmailMask({
    maskAddress,
    realAddress,
    ownershipProofToken,
    metadata,
    expiresAt,
  }: ProvisionEmailMaskInput): Promise<EmailMaskEntity> {
    this.log.debug(this.provisionEmailMask.name, {
      maskAddress,
      realAddress,
      ownershipProofToken,
      metadata,
    })
    // Retrieve Public Key to create email account with.
    const key = this.config?.enforceSingletonPublicKey
      ? await this.deviceKeyWorker.getSingletonKeyPair()
      : await this.deviceKeyWorker.generateKeyPair()
    const transformer = new EmailMaskTransformer(this.deviceKeyWorker, this.log)

    let keyFormat: GraphQLKeyFormat
    switch (key.format) {
      case DeviceKeyWorkerKeyFormat.RsaPublicKey:
        keyFormat = GraphQLKeyFormat.RsaPublicKey
        break
      case DeviceKeyWorkerKeyFormat.Spki:
        keyFormat = GraphQLKeyFormat.Spki
        break
    }

    const provisionEmailMaskInput: ProvisionEmailMaskRequest = {
      maskAddress: maskAddress,
      realAddress: realAddress,
      ownershipProofTokens: [ownershipProofToken],
      key: {
        keyId: key.id,
        algorithm: key.algorithm,
        keyFormat,
        publicKey: key.data,
      },
    }

    if (metadata) {
      const sealedMetadata = await this.sealMetadata(metadata)
      provisionEmailMaskInput.metadata = sealedMetadata
    }

    if (expiresAt) {
      provisionEmailMaskInput.expiresAtEpochSec = secondsSinceEpoch(expiresAt)
    }

    const result = await this.appSync.provisionEmailMask(
      provisionEmailMaskInput,
    )

    return await transformer.graphQLToEntity(result)
  }

  async deprovisionEmailMask(
    input: DeprovisionEmailMaskInput,
  ): Promise<EmailMaskEntity> {
    this.log.debug(this.deprovisionEmailMask.name, { input })
    const result = await this.appSync.deprovisionEmailMask(input)
    return await this.transformer.graphQLToEntity(result)
  }

  async updateEmailMask({
    emailMaskId,
    metadata,
    expiresAt,
  }: UpdateEmailMaskInput): Promise<EmailMaskEntity> {
    this.log.debug(this.updateEmailMask.name, {
      emailMaskId,
      metadata,
      expiresAt,
    })
    const updateEmailMaskInput: UpdateEmailMaskRequest = {
      id: emailMaskId,
    }

    if (metadata === null || (metadata && Object.keys(metadata).length === 0)) {
      updateEmailMaskInput.metadata = null
    } else if (metadata !== undefined) {
      const sealedMetadata = await this.sealMetadata(metadata)
      updateEmailMaskInput.metadata = sealedMetadata
    }

    if (expiresAt === null || (expiresAt && expiresAt.getTime() === 0)) {
      updateEmailMaskInput.expiresAtEpochSec = null
    } else if (expiresAt !== undefined) {
      updateEmailMaskInput.expiresAtEpochSec = secondsSinceEpoch(expiresAt)
    }

    const result = await this.appSync.updateEmailMask(updateEmailMaskInput)

    return await this.transformer.graphQLToEntity(result)
  }

  async enableEmailMask(input: EnableEmailMaskInput): Promise<EmailMaskEntity> {
    this.log.debug(this.enableEmailMask.name, { input })
    const result = await this.appSync.enableEmailMask(input)
    return await this.transformer.graphQLToEntity(result)
  }

  async disableEmailMask(
    input: DisableEmailMaskInput,
  ): Promise<EmailMaskEntity> {
    this.log.debug(this.disableEmailMask.name, { input })
    const result = await this.appSync.disableEmailMask(input)
    return await this.transformer.graphQLToEntity(result)
  }

  async listEmailMasksForOwner(
    input?: ListEmailMasksForOwnerInput,
  ): Promise<ListEmailMasksOutput> {
    this.log.debug(this.listEmailMasksForOwner.name, { input })
    const listInput: ListEmailMasksForOwnerRequest = {
      limit: input?.limit ?? 10,
    }

    if (input?.nextToken) {
      listInput.nextToken = input.nextToken
    }

    if (input?.filter) {
      listInput.filter = EmailMaskFilterTransformer.toGraphQL(input.filter)
    }

    const result = await this.appSync.listEmailMasksForOwner(listInput)
    let emailMasks: EmailMaskEntity[] = []
    if (result.items) {
      emailMasks = await Promise.all(
        result.items.map(async (mask) => {
          return await this.transformer.graphQLToEntity(mask)
        }),
      )
    }

    return {
      emailMasks,
      nextToken: result.nextToken ?? undefined,
    }
  }

  private async sealMetadata(
    metadata: Record<string, any>,
  ): Promise<SealedAttribute> {
    let symmetricKeyId = await this.deviceKeyWorker.getCurrentSymmetricKeyId()

    if (!symmetricKeyId) {
      symmetricKeyId = await this.deviceKeyWorker.generateCurrentSymmetricKey()
    }

    const sealedData = await this.deviceKeyWorker.sealString({
      payload: BufferUtil.fromString(JSON.stringify(metadata)),
      keyId: symmetricKeyId,
      keyType: KeyType.SymmetricKey,
    })

    return {
      keyId: symmetricKeyId,
      base64EncodedSealedData: sealedData,
      plainTextType: 'json-string',
      algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
    }
  }
}
