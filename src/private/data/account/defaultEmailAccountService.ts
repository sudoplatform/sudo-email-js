/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DefaultLogger,
  EncryptionAlgorithm,
  KeyNotFoundError,
  Logger,
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
  DeleteEmailAccountResult,
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
import {
  KeyManagementConfig,
  ProvisioningKeyProvider,
} from '../common/provisioningKeyProvider'
import { EmailAccountEntityTransformer } from './transformer/emailAccountEntityTransformer'
import { EmailAddressEntityTransformer } from './transformer/emailAddressEntityTransformer'
import { EmailAddressPublicInfoEntityTransformer } from './transformer/emailAddressPublicInfoEntityTransformer'

export type EmailAccountServiceConfig = KeyManagementConfig

export class DefaultEmailAccountService implements EmailAccountService {
  private readonly log: Logger
  private readonly emailAccountTransformer: EmailAccountEntityTransformer
  private readonly emailAddressTransformer: EmailAddressEntityTransformer
  private readonly keyProvider: ProvisioningKeyProvider

  constructor(
    private readonly appSync: ApiClient,
    private readonly deviceKeyWorker: DeviceKeyWorker,
    private readonly config: EmailAccountServiceConfig,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
    this.keyProvider = new ProvisioningKeyProvider(deviceKeyWorker, config)
    this.emailAccountTransformer = new EmailAccountEntityTransformer(
      deviceKeyWorker,
    )
    this.emailAddressTransformer = new EmailAddressEntityTransformer()
  }

  async create({
    emailAddressEntity,
    ownershipProofToken,
    allowSymmetricKeyGeneration = true,
    keyId,
  }: CreateEmailAccountInput): Promise<EmailAccountEntity> {
    // Retrieve Public Key to create email account with.
    const provisioningKey = await this.keyProvider.key(keyId)
    const key = provisioningKey.key

    const result = await this.keyProvider.withRejectionCleanup(
      provisioningKey,
      async () => {
        let symmetricKeyId =
          await this.deviceKeyWorker.getCurrentSymmetricKeyId()

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

          provisionEmailAddressInput.alias = {
            algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
            keyId: symmetricKeyId,
            plainTextType: 'string',
            base64EncodedSealedData: sealedAlias,
          }
        }
        return provisionEmailAddressInput
      },
      async (input) => await this.appSync.provisionEmailAddress(input),
    )
    return await this.mapEmailAddress(result)
  }

  async delete(
    input: DeleteEmailAccountInput,
  ): Promise<DeleteEmailAccountResult> {
    const result = await this.appSync.deprovisionEmailAddress(input)

    const keyIdsNotRemoved = await this.removeUnusedKeyPairs(
      result.id,
      result.keyRingId,
      result.keyIds,
    )

    return {
      emailAccount: await this.emailAccountTransformer.transformGraphQL({
        ...result,
        folders: [],
      }),
      keyIdsNotRemoved,
    }
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

  /**
   * Removes a deprovisioned email account's key pairs from the key store,
   * unless another email address or email alias still uses them.
   *
   * Any doubt keeps a key pair: if the singleton or the service's key
   * registrations can't be read, nothing is removed.
   *
   * @returns Identifiers of key pairs that were due to be removed but couldn't be.
   */
  private async removeUnusedKeyPairs(
    emailAccountId: string,
    keyRingId: string,
    keyIds: string[],
  ): Promise<string[]> {
    if (
      this.config.allowCallerManagedKeys ||
      this.config.enforceSingletonPublicKey
    ) {
      return []
    }

    let candidateKeyIds: string[]
    try {
      const singletonKeyId = await this.deviceKeyWorker.getSingletonKeyId()
      candidateKeyIds = keyIds.filter((keyId) => keyId !== singletonKeyId)
    } catch (err) {
      this.log.warn('Keeping the key pairs of a deprovisioned email address', {
        emailAccountId,
        reason: 'reading the singleton key id failed',
        err,
      })
      return []
    }
    if (candidateKeyIds.length === 0) {
      return []
    }

    let keyIdsInUse: Set<string>
    try {
      // The deprovisioned account's own registrations may still be listed
      // until the service removes them.
      const registrations = await this.listPublicKeyRegistrations()
      keyIdsInUse = new Set(
        registrations
          .filter((registration) => registration.keyRingId !== keyRingId)
          .map((registration) => registration.keyId),
      )
    } catch (err) {
      this.log.warn('Keeping the key pairs of a deprovisioned email address', {
        emailAccountId,
        reason: 'listing key registrations failed',
        err,
      })
      return []
    }

    const keyIdsNotRemoved: string[] = []
    for (const keyId of candidateKeyIds) {
      if (keyIdsInUse.has(keyId)) {
        continue
      }
      try {
        await this.deviceKeyWorker.removeKey(keyId, KeyType.KeyPair)
      } catch (err) {
        this.log.error(
          'Removing key pair of a deprovisioned email address failed',
          { emailAccountId, keyId, err },
        )
        keyIdsNotRemoved.push(keyId)
      }
    }
    return keyIdsNotRemoved
  }

  /**
   * Lists every registration of the user's public keys, across all of the
   * user's email addresses and email aliases, in every key format. A key
   * registered for several addresses or aliases appears once for each.
   */
  private async listPublicKeyRegistrations(): Promise<
    { keyId: string; keyRingId: string }[]
  > {
    const registrations: { keyId: string; keyRingId: string }[] = []
    let nextToken: string | undefined
    // A page can be empty while more remain, so read until there's no next token.
    do {
      // An empty list asks for every key format; omitting it returns only
      // RSA_PUBLIC_KEY keys.
      const page = await this.appSync.getPublicKeys(undefined, nextToken, [])
      registrations.push(
        ...page.items.map(({ keyId, keyRingId }) => ({ keyId, keyRingId })),
      )
      nextToken = page.nextToken ?? undefined
    } while (nextToken)
    return registrations
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
