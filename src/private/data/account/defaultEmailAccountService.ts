/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EncryptionAlgorithm,
  KeyNotFoundError,
  Buffer as BufferUtil,
} from '@sudoplatform/sudo-common'
import {
  EmailAddress,
  KeyFormat as GraphQLKeyFormat,
  ProvisionEmailAddressInput,
  SealedAttributeInput,
  UpdateEmailAddressMetadataInput,
} from '../../../gen/graphqlTypes'
import { EmailAccountEntity } from '../../domain/entities/account/emailAccountEntity'
import {
  CheckEmailAddressAvailabilityInput,
  CreateEmailAccountInput,
  DeleteEmailAccountInput,
  EmailAccountService,
  GetEmailAccountInput,
  ListEmailAccountsForSudoIdInput,
  ListEmailAccountsInput,
  ListEmailAccountsOutput,
  LookupEmailAddressesPublicInfoInput,
  UpdateEmailAccountMetadataInput,
} from '../../domain/entities/account/emailAccountService'
import { EmailAddressEntity } from '../../domain/entities/account/emailAddressEntity'
import { EmailAddressPublicInfoEntity } from '../../domain/entities/account/emailAddressPublicInfoEntity'
import { ApiClient } from '../common/apiClient'
import {
  DeviceKeyWorker,
  DeviceKeyWorkerKeyFormat,
  KeyType,
} from '../common/deviceKeyWorker'
import { EmailAccountEntityTransformer } from './transformer/emailAccountEntityTransformer'
import { EmailAddressEntityTransformer } from './transformer/emailAddressEntityTransformer'
import { EmailAddressPublicInfoEntityTransformer } from './transformer/emailAddressPublicInfoEntityTransformer'

export type EmailAccountServiceConfig = {
  enforceSingletonPublicKey?: boolean
}

export class DefaultEmailAccountService implements EmailAccountService {
  private readonly emailAccountTransformer: EmailAccountEntityTransformer
  private readonly emailAddressTransformer: EmailAddressEntityTransformer

  constructor(
    private readonly appSync: ApiClient,
    private readonly deviceKeyWorker: DeviceKeyWorker,
    private readonly config?: EmailAccountServiceConfig,
  ) {
    this.emailAccountTransformer = new EmailAccountEntityTransformer(
      deviceKeyWorker,
    )
    this.emailAddressTransformer = new EmailAddressEntityTransformer()
  }

  async create({
    emailAddressEntity,
    ownershipProofToken,
    allowSymmetricKeyGeneration = true,
  }: CreateEmailAccountInput): Promise<EmailAccountEntity> {
    // Retrieve Public Key to create email account with.
    const key = this.config?.enforceSingletonPublicKey
      ? await this.deviceKeyWorker.getSingletonKeyPair()
      : await this.deviceKeyWorker.generateKeyPair()

    let symmetricKeyId = await this.deviceKeyWorker.getCurrentSymmetricKeyId()

    if (!symmetricKeyId) {
      if (allowSymmetricKeyGeneration) {
        symmetricKeyId =
          await this.deviceKeyWorker.generateCurrentSymmetricKey()
      } else {
        throw new KeyNotFoundError()
      }
    }

    let keyFormat: GraphQLKeyFormat | undefined
    switch (key.format) {
      case DeviceKeyWorkerKeyFormat.RsaPublicKey:
        keyFormat = GraphQLKeyFormat.RsaPublicKey
        break
      case DeviceKeyWorkerKeyFormat.Spki:
        keyFormat = GraphQLKeyFormat.Spki
        break
    }

    const provisionEmailAddressInput: ProvisionEmailAddressInput = {
      emailAddress: emailAddressEntity.emailAddress,
      ownershipProofTokens: [ownershipProofToken],
      key: {
        keyId: key.id,
        algorithm: key.algorithm,
        keyFormat,
        publicKey: key.data,
      },
    }

    if (emailAddressEntity.alias) {
      const sealedAlias = await this.deviceKeyWorker.sealString({
        payload: BufferUtil.fromString(emailAddressEntity.alias),
        keyId: symmetricKeyId,
        keyType: KeyType.SymmetricKey,
      })

      const sealedAttribute = {
        algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
        keyId: symmetricKeyId,
        plainTextType: 'string',
        base64EncodedSealedData: sealedAlias,
      }

      provisionEmailAddressInput.alias = sealedAttribute
    }

    const result = await this.appSync.provisionEmailAddress(
      provisionEmailAddressInput,
    )
    return await this.mapEmailAddress(result)
  }

  async delete(input: DeleteEmailAccountInput): Promise<EmailAccountEntity> {
    const result = await this.appSync.deprovisionEmailAddress(input)

    if (!this.config?.enforceSingletonPublicKey) {
      for (const keyId of result.keyIds) {
        await this.deviceKeyWorker.removeKey(keyId, KeyType.KeyPair)
      }
    }

    return this.emailAccountTransformer.transformGraphQL({
      ...result,
      folders: [],
    })
  }

  async get(
    input: GetEmailAccountInput,
  ): Promise<EmailAccountEntity | undefined> {
    const result = await this.appSync.getEmailAddress(input.id)
    return result ? await this.mapEmailAddress(result) : undefined
  }

  async list({
    limit,
    nextToken,
  }: ListEmailAccountsInput): Promise<ListEmailAccountsOutput> {
    const result = await this.appSync.listEmailAddresses(limit, nextToken)
    let emailAccounts: EmailAccountEntity[] = []
    if (result.items) {
      emailAccounts = await Promise.all(
        result.items.map(async (emailAddress): Promise<EmailAccountEntity> => {
          return await this.mapEmailAddress(emailAddress)
        }),
      )
    }
    return {
      emailAccounts,
      nextToken: result.nextToken ?? undefined,
    }
  }

  async listForSudoId({
    sudoId,
    limit,
    nextToken,
  }: ListEmailAccountsForSudoIdInput): Promise<ListEmailAccountsOutput> {
    const result = await this.appSync.listEmailAddressesForSudoId(
      sudoId,
      limit,
      nextToken,
    )
    let emailAccounts: EmailAccountEntity[] = []
    if (result.items) {
      emailAccounts = await Promise.all(
        result.items.map(async (emailAddress): Promise<EmailAccountEntity> => {
          return await this.mapEmailAddress(emailAddress)
        }),
      )
    }
    return {
      emailAccounts,
      nextToken: result.nextToken ?? undefined,
    }
  }

  async lookupPublicInfo({
    emailAddresses,
  }: LookupEmailAddressesPublicInfoInput): Promise<
    EmailAddressPublicInfoEntity[]
  > {
    const result =
      await this.appSync.lookupEmailAddressesPublicInfo(emailAddresses)

    return result.items.map((publicInfo) =>
      EmailAddressPublicInfoEntityTransformer.transformGraphQL(publicInfo),
    )
  }

  async checkAvailability(
    input: CheckEmailAddressAvailabilityInput,
  ): Promise<EmailAddressEntity[]> {
    let domains: string[] | undefined
    if (input.domains) {
      domains = input.domains.map((item) => item.domain)
    }
    const result = await this.appSync.checkEmailAddressAvailability({
      localParts: input.localParts,
      domains,
    })
    return result.addresses.map((address) =>
      this.emailAddressTransformer.transform(address),
    )
  }

  async updateMetadata(
    input: UpdateEmailAccountMetadataInput,
  ): Promise<string> {
    const symmetricKeyId = await this.deviceKeyWorker.getCurrentSymmetricKeyId()

    if (!symmetricKeyId) {
      throw new KeyNotFoundError('Symmetric key not found')
    }

    const updateEmailAddressMetadataInput: UpdateEmailAddressMetadataInput = {
      id: input.id,
      values: {},
    }

    if (input.values.alias === null || input.values.alias === '') {
      updateEmailAddressMetadataInput.values.alias = null
    }

    if (input.values.alias) {
      const sealedAlias = await this.deviceKeyWorker.sealString({
        payload: BufferUtil.fromString(input.values.alias),
        keyId: symmetricKeyId,
        keyType: KeyType.SymmetricKey,
      })

      const sealedAttribute: SealedAttributeInput = {
        algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
        keyId: symmetricKeyId,
        plainTextType: 'string',
        base64EncodedSealedData: sealedAlias,
      }

      updateEmailAddressMetadataInput.values.alias = sealedAttribute
    }

    return await this.appSync.updateEmailAddressMetadata(
      updateEmailAddressMetadataInput,
    )
  }

  mapEmailAddress = async (
    emailAddress: EmailAddress,
  ): Promise<EmailAccountEntity> => {
    const transformed =
      await this.emailAccountTransformer.transformGraphQL(emailAddress)

    for (const keyId of emailAddress.keyIds) {
      const status = await this.deviceKeyWorker.keyExists(
        keyId,
        KeyType.KeyPair,
      )
      if (!status) {
        transformed.status = {
          type: 'Failed',
          cause: new KeyNotFoundError(),
        }
        break
      }
    }

    return transformed
  }
}
