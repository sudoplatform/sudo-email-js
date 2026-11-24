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
  GetEmailAliasByIdInput,
  ListEmailAliasesForOwnerInput,
  ListEmailAliasesForOwnerOutput,
  ListEmailAliasesInput,
  ListEmailAliasesOutput,
  ProvisionEmailAliasInput,
  UpdateEmailAliasInput,
  VerifyExternalEmailAddressInput,
} from '../../domain/entities/alias/emailAliasService'
import {
  ProvisionEmailMaskInput as ProvisionEmailAliasRequest,
  UpdateEmailMaskInput as UpdateEmailAliasRequest,
  ListEmailMasksForOwnerInput as ListEmailAliasesForOwnerRequest,
  ListEmailMasksInput as ListEmailAliasesRequest,
  SealedAttribute,
  KeyFormat as GraphQLKeyFormat,
} from '../../../gen/graphqlTypes'
import {
  EmailAliasEntity,
  EmailAliasListItemEntity,
} from '../../domain/entities/alias/emailAliasEntity'
import { ApiClient } from '../common/apiClient'
import {
  DeviceKeyWorker,
  DeviceKeyWorkerKeyFormat,
  KeyType,
} from '../common/deviceKeyWorker'
import { ProvisioningKeyProvider } from '../common/provisioningKeyProvider'
import { EmailAliasTransformer } from './transformer/emailAliasTransformer'
import { secondsSinceEpoch } from '../../util/date'
import { EmailAliasFilterTransformer } from './transformer/emailAliasFilterTransformer'
import { EmailAccountServiceConfig } from '../account/defaultEmailAccountService'
import { VerifyExternalEmailAddressResult } from '../../../public/typings/verifyExternalEmailAddress'
import { EmailAliasNotFoundError } from '../../../public'

export class DefaultEmailAliasService implements EmailAliasService {
  private readonly log: Logger
  private readonly transformer: EmailAliasTransformer
  private readonly keyProvider: ProvisioningKeyProvider

  constructor(
    private readonly appSync: ApiClient,
    private readonly deviceKeyWorker: DeviceKeyWorker,
    config?: EmailAccountServiceConfig,
  ) {
    this.keyProvider = new ProvisioningKeyProvider(deviceKeyWorker, config)
    this.log = new DefaultLogger(this.constructor.name)
    this.transformer = new EmailAliasTransformer(this.deviceKeyWorker, this.log)
  }

  async provisionEmailAlias({
    aliasAddress,
    realAddress,
    ownershipProofToken,
    metadata,
    expiresAt,
    keyId,
  }: ProvisionEmailAliasInput): Promise<EmailAliasEntity> {
    this.log.debug(this.provisionEmailAlias.name, {
      aliasAddress,
      realAddress,
      ownershipProofToken,
      metadata,
    })
    // Retrieve Public Key to provision the email alias with.
    const provisioningKey = await this.keyProvider.key(keyId)
    const key = provisioningKey.key
    const transformer = new EmailAliasTransformer(
      this.deviceKeyWorker,
      this.log,
    )

    const result = await this.keyProvider.withRejectionCleanup(
      provisioningKey,
      async () => {
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
          provisionEmailAliasInput.metadata = await this.sealMetadata(metadata)
        }

        if (expiresAt) {
          provisionEmailAliasInput.expiresAtEpochSec =
            secondsSinceEpoch(expiresAt)
        }
        return provisionEmailAliasInput
      },
      async (input) => await this.appSync.provisionEmailMask(input),
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
  ): Promise<ListEmailAliasesForOwnerOutput> {
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

  async listEmailAliases(
    input?: ListEmailAliasesInput,
  ): Promise<ListEmailAliasesOutput> {
    this.log.debug(this.listEmailAliases.name, { input })
    const listInput: ListEmailAliasesRequest = {
      limit: input?.limit ?? 10,
    }

    if (input?.sudoId) {
      listInput.sudoId = input.sudoId
    }

    if (input?.nextToken) {
      listInput.nextToken = input.nextToken
    }

    if (input?.filter) {
      listInput.filter = EmailAliasFilterTransformer.toGraphQL(input.filter)
    }

    const result = await this.appSync.listEmailMasks(listInput)
    let emailAliases: EmailAliasListItemEntity[] = []
    if (result.items) {
      emailAliases = await Promise.all(
        result.items.map(async (alias) => {
          return await this.transformer.graphQLListToEntityList(alias)
        }),
      )
    }

    return {
      emailAliases,
      nextToken: result.nextToken ?? undefined,
    }
  }

  async getEmailAliasById(
    input: GetEmailAliasByIdInput,
  ): Promise<EmailAliasEntity> {
    this.log.debug(this.getEmailAliasById.name, { input })

    const result = await this.appSync.getEmailAliasById(input.id)

    if (!result) {
      throw new EmailAliasNotFoundError()
    }

    return this.transformer.graphQLToEntity(result)
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
