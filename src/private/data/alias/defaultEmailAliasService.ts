/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
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
  DeprovisionEmailAliasInput,
  DisableEmailAliasInput,
  EmailAliasService,
  EnableEmailAliasInput,
  ListEmailAliasesForOwnerInput,
  ListEmailAliasesOutput,
  ProvisionEmailAliasInput,
  UpdateEmailAliasInput,
  VerifyExternalEmailAddressInput,
} from '../../domain/entities/alias/emailAliasService'
import {
  ProvisionEmailMaskInput as ProvisionEmailAliasRequest,
  UpdateEmailMaskInput as UpdateEmailAliasRequest,
  ListEmailMasksForOwnerInput as ListEmailAliasesForOwnerRequest,
  SealedAttribute,
  KeyFormat as GraphQLKeyFormat,
} from '../../../gen/graphqlTypes'
import { EmailAliasEntity } from '../../domain/entities/alias/emailAliasEntity'
import { ApiClient } from '../common/apiClient'
import {
  DeviceKeyWorker,
  DeviceKeyWorkerKeyFormat,
  KeyType,
} from '../common/deviceKeyWorker'
import { EmailAliasTransformer } from './transformer/emailAliasTransformer'
import { secondsSinceEpoch } from '../../util/date'
import { EmailAliasFilterTransformer } from './transformer/emailAliasFilterTransformer'
import { EmailAccountServiceConfig } from '../account/defaultEmailAccountService'
import { VerifyExternalEmailAddressResult } from '../../../public/typings/verifyExternalEmailAddress'

export class DefaultEmailAliasService implements EmailAliasService {
  private readonly log: Logger
  private readonly transformer: EmailAliasTransformer

  constructor(
    private readonly appSync: ApiClient,
    private readonly deviceKeyWorker: DeviceKeyWorker,
    private readonly config?: EmailAccountServiceConfig,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
    this.transformer = new EmailAliasTransformer(this.deviceKeyWorker, this.log)
  }

  async provisionEmailAlias({
    aliasAddress,
    realAddress,
    ownershipProofToken,
    metadata,
    expiresAt,
  }: ProvisionEmailAliasInput): Promise<EmailAliasEntity> {
    this.log.debug(this.provisionEmailAlias.name, {
      aliasAddress,
      realAddress,
      ownershipProofToken,
      metadata,
    })
    // Retrieve Public Key to create email account with.
    const key = this.config?.enforceSingletonPublicKey
      ? await this.deviceKeyWorker.getSingletonKeyPair()
      : await this.deviceKeyWorker.generateKeyPair()
    const transformer = new EmailAliasTransformer(
      this.deviceKeyWorker,
      this.log,
    )

    let keyFormat: GraphQLKeyFormat
    switch (key.format) {
      case DeviceKeyWorkerKeyFormat.RsaPublicKey:
        keyFormat = GraphQLKeyFormat.RsaPublicKey
        break
      case DeviceKeyWorkerKeyFormat.Spki:
        keyFormat = GraphQLKeyFormat.Spki
        break
    }

    const provisionEmailAliasInput: ProvisionEmailAliasRequest = {
      maskAddress: aliasAddress,
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
      provisionEmailAliasInput.metadata = sealedMetadata
    }

    if (expiresAt) {
      provisionEmailAliasInput.expiresAtEpochSec = secondsSinceEpoch(expiresAt)
    }

    const result = await this.appSync.provisionEmailMask(
      provisionEmailAliasInput,
    )

    return await transformer.graphQLToEntity(result)
  }

  async deprovisionEmailAlias(
    input: DeprovisionEmailAliasInput,
  ): Promise<EmailAliasEntity> {
    this.log.debug(this.deprovisionEmailAlias.name, { input })
    const result = await this.appSync.deprovisionEmailMask({
      emailMaskId: input.emailAliasId,
    })
    return await this.transformer.graphQLToEntity(result)
  }

  async updateEmailAlias({
    emailAliasId,
    metadata,
    expiresAt,
    realAddress,
  }: UpdateEmailAliasInput): Promise<EmailAliasEntity> {
    this.log.debug(this.updateEmailAlias.name, {
      emailAliasId,
      metadata,
      expiresAt,
      realAddress,
    })
    const updateEmailAliasInput: UpdateEmailAliasRequest = {
      id: emailAliasId,
    }

    if (metadata === null || (metadata && Object.keys(metadata).length === 0)) {
      updateEmailAliasInput.metadata = null
    } else if (metadata !== undefined) {
      const sealedMetadata = await this.sealMetadata(metadata)
      updateEmailAliasInput.metadata = sealedMetadata
    }

    if (expiresAt === null || (expiresAt && expiresAt.getTime() === 0)) {
      updateEmailAliasInput.expiresAtEpochSec = null
    } else if (expiresAt !== undefined) {
      updateEmailAliasInput.expiresAtEpochSec = secondsSinceEpoch(expiresAt)
    }

    if (realAddress !== undefined) {
      updateEmailAliasInput.realAddress = realAddress
    }

    const result = await this.appSync.updateEmailMask(updateEmailAliasInput)

    return await this.transformer.graphQLToEntity(result)
  }

  async enableEmailAlias(
    input: EnableEmailAliasInput,
  ): Promise<EmailAliasEntity> {
    this.log.debug(this.enableEmailAlias.name, { input })
    const result = await this.appSync.enableEmailMask({
      emailMaskId: input.emailAliasId,
    })
    return await this.transformer.graphQLToEntity(result)
  }

  async disableEmailAlias(
    input: DisableEmailAliasInput,
  ): Promise<EmailAliasEntity> {
    this.log.debug(this.disableEmailAlias.name, { input })
    const result = await this.appSync.disableEmailMask({
      emailMaskId: input.emailAliasId,
    })
    return await this.transformer.graphQLToEntity(result)
  }

  async listEmailAliasesForOwner(
    input?: ListEmailAliasesForOwnerInput,
  ): Promise<ListEmailAliasesOutput> {
    this.log.debug(this.listEmailAliasesForOwner.name, { input })
    const listInput: ListEmailAliasesForOwnerRequest = {
      limit: input?.limit ?? 10,
    }

    if (input?.nextToken) {
      listInput.nextToken = input.nextToken
    }

    if (input?.filter) {
      listInput.filter = EmailAliasFilterTransformer.toGraphQL(input.filter)
    }

    const result = await this.appSync.listEmailMasksForOwner(listInput)
    let emailAliases: EmailAliasEntity[] = []
    if (result.items) {
      emailAliases = await Promise.all(
        result.items.map(async (alias) => {
          return await this.transformer.graphQLToEntity(alias)
        }),
      )
    }

    return {
      emailAliases,
      nextToken: result.nextToken ?? undefined,
    }
  }

  async verifyExternalEmailAddress(
    input: VerifyExternalEmailAddressInput,
  ): Promise<VerifyExternalEmailAddressResult | undefined> {
    this.log.debug(this.verifyExternalEmailAddress.name, { input })
    const result = await this.appSync.verifyExternalEmailAddress({
      emailAddress: input.emailAddress,
      emailMaskId: input.emailAliasId,
      verificationCode: input.verificationCode,
    })
    return result
      ? {
          isVerified: result!.isVerified,
          reason: result!.reason ?? undefined,
        }
      : result
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
