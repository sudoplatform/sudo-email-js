import {
  EncryptionAlgorithm,
  KeyNotFoundError,
} from '@sudoplatform/sudo-common'
import { Buffer as BufferUtil } from '@sudoplatform/sudo-common/lib/utils/buffer'
import {
  EmailAddress,
  KeyFormat as GraphQLKeyFormat,
  ProvisionEmailAddressInput,
  SealedAttribute,
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
  GetSupportedEmailDomainsInput,
  ListEmailAccountsForSudoIdInput,
  ListEmailAccountsInput,
  ListEmailAccountsOutput,
  UpdateEmailAccountMetadataInput,
} from '../../domain/entities/account/emailAccountService'
import { EmailAddressEntity } from '../../domain/entities/account/emailAddressEntity'
import { EmailDomainEntity } from '../../domain/entities/account/emailDomainEntity'
import { ApiClient } from '../common/apiClient'
import {
  DeviceKeyWorker,
  DeviceKeyWorkerKeyFormat,
  KeyType,
} from '../common/deviceKeyWorker'
import { FetchPolicyTransformer } from '../common/transformer/fetchPolicyTransformer'
import { EmailAccountEntityTransformer } from './transformer/emailAccountEntityTransformer'
import { EmailAddressEntityTransformer } from './transformer/emailAddressEntityTransformer'
import { EmailDomainEntityTransformer } from './transformer/emailDomainEntityTransformer'

export class DefaultEmailAccountService implements EmailAccountService {
  private readonly emailAccountTransformer: EmailAccountEntityTransformer
  private readonly emailAddressTransformer: EmailAddressEntityTransformer

  constructor(
    private readonly appSync: ApiClient,
    private readonly deviceKeyWorker: DeviceKeyWorker,
  ) {
    this.emailAccountTransformer = new EmailAccountEntityTransformer()
    this.emailAddressTransformer = new EmailAddressEntityTransformer()
  }

  async create(input: CreateEmailAccountInput): Promise<EmailAccountEntity> {
    const key = await this.deviceKeyWorker.generateKeyPair()
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
      emailAddress: input.emailAddressEntity.emailAddress,
      ownershipProofTokens: [input.ownershipProofToken],
      key: {
        keyId: key.id,
        algorithm: key.algorithm,
        keyFormat,
        publicKey: key.data,
      },
    }

    if (input.emailAddressEntity.alias) {
      const symmetricKeyId =
        (await this.deviceKeyWorker.getCurrentSymmetricKeyId()) ??
        (await this.deviceKeyWorker.generateCurrentSymmetricKey())

      const sealedAlias = await this.deviceKeyWorker.sealString({
        payload: BufferUtil.fromString(input.emailAddressEntity.alias),
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
    for (const keyId of result.keyIds) {
      await this.deviceKeyWorker.removeKey(keyId, KeyType.KeyPair)
    }
    return this.emailAccountTransformer.transformGraphQL({
      ...result,
      folders: [],
    })
  }

  async get(
    input: GetEmailAccountInput,
  ): Promise<EmailAccountEntity | undefined> {
    const fetchPolicy = input.cachePolicy
      ? FetchPolicyTransformer.transformCachePolicy(input.cachePolicy)
      : undefined
    const result = await this.appSync.getEmailAddress(input.id, fetchPolicy)
    return result ? await this.mapEmailAddress(result) : undefined
  }

  async list({
    cachePolicy,
    limit,
    nextToken,
  }: ListEmailAccountsInput): Promise<ListEmailAccountsOutput> {
    const fetchPolicy = cachePolicy
      ? FetchPolicyTransformer.transformCachePolicy(cachePolicy)
      : undefined
    const result = await this.appSync.listEmailAddresses(
      fetchPolicy,
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

  async listForSudoId({
    sudoId,
    cachePolicy,
    limit,
    nextToken,
  }: ListEmailAccountsForSudoIdInput): Promise<ListEmailAccountsOutput> {
    const fetchPolicy = cachePolicy
      ? FetchPolicyTransformer.transformCachePolicy(cachePolicy)
      : undefined
    const result = await this.appSync.listEmailAddressesForSudoId(
      sudoId,
      fetchPolicy,
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

  async getSupportedEmailDomains({
    cachePolicy,
  }: GetSupportedEmailDomainsInput): Promise<EmailDomainEntity[]> {
    const fetchPolicy = cachePolicy
      ? FetchPolicyTransformer.transformCachePolicy(cachePolicy)
      : undefined
    const result = await this.appSync.getSupportedEmailDomains(fetchPolicy)
    const transformer = new EmailDomainEntityTransformer()
    return result.domains.map((domain) => transformer.transformGraphQL(domain))
  }

  async updateMetadata(
    input: UpdateEmailAccountMetadataInput,
  ): Promise<string> {
    const symmetricKeyId =
      (await this.deviceKeyWorker.getCurrentSymmetricKeyId()) ??
      (await this.deviceKeyWorker.generateCurrentSymmetricKey())

    const updateEmailAddressMetadataInput: UpdateEmailAddressMetadataInput = {
      id: input.id,
      values: {},
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
      this.emailAccountTransformer.transformGraphQL(emailAddress)
    if (emailAddress.alias) {
      const status = await this.deviceKeyWorker.keyExists(
        emailAddress.alias.keyId,
        KeyType.SymmetricKey,
      )
      if (status) {
        try {
          const unsealedAlias = await this.unsealAlias(emailAddress.alias)
          transformed.emailAddress.alias = unsealedAlias
        } catch (error) {
          transformed.status = {
            type: 'Failed',
            cause: error as Error,
          }
        }
      } else {
        transformed.status = {
          type: 'Failed',
          cause: new KeyNotFoundError(),
        }
      }
    }

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

  unsealAlias = async (alias: SealedAttribute): Promise<string> => {
    return this.deviceKeyWorker.unsealString({
      encrypted: alias.base64EncodedSealedData,
      keyId: alias.keyId,
      keyType: KeyType.SymmetricKey,
      algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
    })
  }
}
