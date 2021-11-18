import {
  CachePolicy,
  DecodeError,
  DefaultLogger,
  KeyNotFoundError,
} from '@sudoplatform/sudo-common'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { isLeft } from 'fp-ts/lib/Either'
import * as t from 'io-ts'
import { PathReporter } from 'io-ts/PathReporter'
import * as uuid from 'uuid'
import { InternalError } from '../../..'
import { DateRangeInput } from '../../../gen/graphqlTypes'
import { DraftEmailMessageEntity } from '../../domain/entities/message/draftEmailMessageEntity'
import { DraftEmailMessageMetadataEntity } from '../../domain/entities/message/draftEmailMessageMetadataEntity'
import { EmailMessageEntity } from '../../domain/entities/message/emailMessageEntity'
import {
  DeleteDraftInput,
  DeleteEmailMessagesInput,
  EmailMessageService,
  EmailMessageServiceDeleteDraftError,
  GetDraftInput,
  GetEmailMessageInput,
  GetEmailMessageRfc822DataInput,
  ListDraftsMetadataInput,
  ListEmailMessagesForEmailAddressIdInput,
  ListEmailMessagesForEmailAddressIdOutput,
  ListEmailMessagesForEmailFolderIdInput,
  ListEmailMessagesForEmailFolderIdOutput,
  SaveDraftInput,
  SendMessageInput,
  UpdateEmailMessagesInput,
  UpdateEmailMessagesOutput,
} from '../../domain/entities/message/emailMessageService'
import { SealedEmailMessageEntity } from '../../domain/entities/message/sealedEmailMessageEntity'
import { ApiClient } from '../common/apiClient'
import { EmailServiceConfig } from '../common/config'
import { DeviceKeyWorker, KeyType } from '../common/deviceKeyWorker'
import {
  S3Client,
  S3DeleteError,
  S3DownloadError,
  S3Error,
} from '../common/s3Client'
import { FetchPolicyTransformer } from '../common/transformer/fetchPolicyTransformer'
import { SortOrderTransformer } from '../common/transformer/sortOrderTransformer'
import { EmailMessageFilterTransformer } from './transformer/emailMessageFilterTransformer'
import { SealedEmailMessageEntityTransformer } from './transformer/sealedEmailMessageEntityTransformer'

const EmailAddressEntityCodec = t.intersection(
  [t.type({ emailAddress: t.string }), t.partial({ displayName: t.string })],
  'EmailAddressEntity',
)
const EmailHeaderDetailsCodec = t.intersection(
  [
    t.type({
      from: t.array(EmailAddressEntityCodec),
      to: t.array(EmailAddressEntityCodec),
      cc: t.array(EmailAddressEntityCodec),
      bcc: t.array(EmailAddressEntityCodec),
      replyTo: t.array(EmailAddressEntityCodec),
    }),
    t.partial({
      subject: t.string,
    }),
  ],
  'EmailHeaderDetails',
)
type EmailHeaderDetails = t.TypeOf<typeof EmailHeaderDetailsCodec>

export class DefaultEmailMessageService implements EmailMessageService {
  private readonly log = new DefaultLogger(this.constructor.name)

  constructor(
    private readonly appSync: ApiClient,
    private readonly userClient: SudoUserClient,
    private readonly s3Client: S3Client,
    private readonly deviceKeyWorker: DeviceKeyWorker,
    private readonly emailServiceConfig: EmailServiceConfig,
  ) {}

  private readonly Defaults = {
    IdentityIdClaimName: 'custom:identityId',
    Metadata: {
      KeyIdName: 'key-id',
      AlgorithmName: 'algorithm',
    },
    SymmetricKeyEncryptionAlgorithm: 'AES/CBC/PKCS7Padding',
  }

  async saveDraft({
    rfc822Data,
    senderEmailAddressId,
    id,
  }: SaveDraftInput): Promise<DraftEmailMessageMetadataEntity> {
    let keyId = await this.deviceKeyWorker.getCurrentSymmetricKeyId()
    if (!keyId) {
      keyId = await this.deviceKeyWorker.generateCurrentSymmetricKey()
    }
    const keyPrefix = await this.constructS3KeyForEmailAddressId(
      senderEmailAddressId,
    )
    const draftId = id ?? uuid.v4()
    const key = `${keyPrefix}/draft/${draftId}`
    const sealed = await this.deviceKeyWorker.sealString({
      keyType: KeyType.SymmetricKey,
      payload: rfc822Data,
      keyId,
    })
    this.log.debug(this.saveDraft.name, { sealed })
    // Metadata are automatically converted to lower case, so snake case should be used
    const metadata = {
      [this.Defaults.Metadata.KeyIdName]: keyId,
      [this.Defaults.Metadata.AlgorithmName]:
        this.Defaults.SymmetricKeyEncryptionAlgorithm,
    }
    this.log.debug(this.saveDraft.name, { metadata })
    const draft = await this.s3Client.upload({
      bucket: this.emailServiceConfig.bucket,
      region: this.emailServiceConfig.region,
      key,
      body: sealed,
      metadata,
    })

    return {
      id: draftId,
      updatedAt: draft.lastModified,
    }
  }

  async deleteDraft({ id, emailAddressId }: DeleteDraftInput): Promise<string> {
    const keyPrefix = await this.constructS3KeyForEmailAddressId(emailAddressId)
    const key = `${keyPrefix}/draft/${id}`
    try {
      await this.s3Client.delete({
        bucket: this.emailServiceConfig.bucket,
        region: this.emailServiceConfig.region,
        key,
      })
    } catch (error) {
      if (error instanceof S3DeleteError) {
        throw new EmailMessageServiceDeleteDraftError(error.key)
      }
      throw error
    }
    return id
  }

  async getDraft({
    id,
    emailAddressId,
  }: GetDraftInput): Promise<DraftEmailMessageEntity | undefined> {
    const keyPrefix = await this.constructS3KeyForEmailAddressId(emailAddressId)
    const key = `${keyPrefix}/draft/${id}`
    let sealedString: string
    let keyId: string | undefined
    let algorithm: string | undefined
    let updatedAt: Date

    try {
      const result = await this.s3Client.download({
        bucket: this.emailServiceConfig.bucket,
        region: this.emailServiceConfig.region,
        key,
      })
      updatedAt = result.lastModified
      sealedString = result.body
      // Metadata are stored as lower case, so snake case is used.
      keyId = result.metadata?.[this.Defaults.Metadata.KeyIdName]
      algorithm = result.metadata?.[this.Defaults.Metadata.AlgorithmName]
    } catch (error: unknown) {
      const s3DownloadError = error as S3DownloadError
      if (s3DownloadError.code === S3Error.NoSuchKey) {
        return undefined
      }
      throw error
    }
    if (!keyId) {
      throw new InternalError('No sealed keyId associated with s3 object')
    }
    if (!algorithm) {
      throw new InternalError('No sealed algorithm associated with s3 object')
    }
    const keyType =
      algorithm === this.Defaults.SymmetricKeyEncryptionAlgorithm
        ? KeyType.SymmetricKey
        : KeyType.KeyPair
    const unsealedData = await this.deviceKeyWorker.unsealString({
      keyType,
      keyId,
      encrypted: sealedString,
    })
    return {
      id: id,
      updatedAt,
      rfc822Data: new TextEncoder().encode(unsealedData),
    }
  }

  async listDraftsMetadata({
    emailAddressId,
  }: ListDraftsMetadataInput): Promise<DraftEmailMessageMetadataEntity[]> {
    const keyPrefix = await this.constructS3KeyForEmailAddressId(emailAddressId)
    const draftPrefix = `${keyPrefix}/draft/`
    const result = await this.s3Client.list({
      bucket: this.emailServiceConfig.bucket,
      region: this.emailServiceConfig.region,
      prefix: draftPrefix,
    })
    return result.map((r) => ({
      id: r.key.replace(draftPrefix, ''),
      updatedAt: r.lastModified,
    }))
  }

  async sendMessage({
    rfc822Data,
    senderEmailAddressId,
  }: SendMessageInput): Promise<string> {
    this.log.debug(this.sendMessage.name, {
      rfc822Data,
      senderEmailAddressId,
      byteLength: rfc822Data.byteLength,
    })
    const keyPrefix = await this.constructS3KeyForEmailAddressId(
      senderEmailAddressId,
    )
    const id = uuid.v4()
    const key = `${keyPrefix}/${id}`
    const bucket = this.emailServiceConfig.transientBucket
    const region = this.emailServiceConfig.region
    let binary = ''
    const bytes = new Uint8Array(rfc822Data)
    for (const byte of bytes) {
      binary += String.fromCharCode(byte)
    }
    await this.s3Client.upload({
      bucket,
      region,
      key,
      body: binary,
    })
    return await this.appSync.sendEmailMessage({
      emailAddressId: senderEmailAddressId,
      message: {
        key,
        bucket,
        region,
      },
    })
  }

  async updateMessages({
    ids,
    values,
  }: UpdateEmailMessagesInput): Promise<UpdateEmailMessagesOutput> {
    const result = await this.appSync.updateEmailMessages({
      messageIds: ids,
      values,
    })
    return {
      status: result.status,
      successIds: result.successMessageIds ?? undefined,
      failureIds: result.failedMessageIds ?? undefined,
    }
  }

  async deleteMessages({ ids }: DeleteEmailMessagesInput): Promise<string[]> {
    const result = await this.appSync.deleteEmailMessages({ messageIds: ids })
    return result
  }

  async getEmailMessageRfc822Data({
    id,
    emailAddressId,
  }: GetEmailMessageRfc822DataInput): Promise<ArrayBuffer | undefined> {
    const fetchPolicyTransformer = new FetchPolicyTransformer()
    const fetchPolicy = fetchPolicyTransformer.transformCachePolicy(
      CachePolicy.RemoteOnly,
    )
    const sealedEmailMessage = await this.appSync.getEmailMessage(
      id,
      fetchPolicy,
    )
    if (!sealedEmailMessage) {
      return undefined
    }
    const s3Key = await this.constructS3KeyForEmailMessage(
      emailAddressId,
      id,
      sealedEmailMessage.rfc822Header.keyId,
    )
    this.log.debug('s3 key', { key: s3Key })
    let sealedString: string
    try {
      const result = await this.s3Client.download({
        bucket: this.emailServiceConfig.bucket,
        region: this.emailServiceConfig.region,
        key: s3Key,
      })
      sealedString = result.body
      this.log.debug('sealedString', { sealedString })
    } catch (error: unknown) {
      const s3DownloadError = error as S3DownloadError
      if (s3DownloadError.code === S3Error.NoSuchKey) {
        return undefined
      }
      throw error
    }
    const unsealedData = await this.deviceKeyWorker.unsealString({
      keyType: KeyType.KeyPair,
      keyId: sealedEmailMessage.rfc822Header.keyId,
      encrypted: sealedString,
    })
    return new TextEncoder().encode(unsealedData)
  }

  async getMessage(
    input: GetEmailMessageInput,
  ): Promise<EmailMessageEntity | undefined> {
    const fetchPolicyTransformer = new FetchPolicyTransformer()
    const fetchPolicy = fetchPolicyTransformer.transformCachePolicy(
      input.cachePolicy,
    )
    const result = await this.appSync.getEmailMessage(input.id, fetchPolicy)
    if (!result) {
      return undefined
    }
    const transformer = new SealedEmailMessageEntityTransformer()
    const sealedEmailMessage = transformer.transformGraphQL(result)
    const unsealedEmailMessage = await this.unsealEmailMessage(
      sealedEmailMessage,
    )
    return unsealedEmailMessage
  }

  async listMessagesForEmailAddressId({
    emailAddressId,
    cachePolicy,
    dateRange,
    filter,
    limit,
    sortOrder,
    nextToken,
  }: ListEmailMessagesForEmailAddressIdInput): Promise<ListEmailMessagesForEmailAddressIdOutput> {
    const fetchPolicyTransformer = new FetchPolicyTransformer()
    const fetchPolicy = fetchPolicyTransformer.transformCachePolicy(cachePolicy)
    const sortOrderTransformer = new SortOrderTransformer()
    const sortOrderInput = sortOrder
      ? sortOrderTransformer.fromAPItoGraphQL(sortOrder)
      : undefined
    const filterTransformer = new EmailMessageFilterTransformer()
    const inputFilter = filterTransformer.transformAPI(filter)
    let inputDateRange: DateRangeInput | undefined = undefined
    inputDateRange = dateRange
      ? (inputDateRange = {
          startDateEpochMs: dateRange?.startDate.getTime(),
          endDateEpochMs: dateRange?.endDate.getTime(),
        })
      : undefined
    const response = await this.appSync.listEmailMessagesForEmailAddressId(
      emailAddressId,
      fetchPolicy,
      inputDateRange,
      inputFilter,
      limit,
      sortOrderInput,
      nextToken,
    )
    let sealedEmailMessages: SealedEmailMessageEntity[] = []
    if (response.items) {
      const transformer = new SealedEmailMessageEntityTransformer()
      sealedEmailMessages = response.items.map((item) =>
        transformer.transformGraphQL(item),
      )
    }
    const unsealedEmailMessages = await Promise.all(
      sealedEmailMessages.map(async (message) => {
        return await this.unsealEmailMessage(message)
      }),
    )
    return {
      emailMessages: unsealedEmailMessages,
      nextToken: response.nextToken ?? undefined,
    }
  }

  async listMessagesForEmailFolderId({
    folderId,
    cachePolicy,
    dateRange,
    filter,
    limit,
    sortOrder,
    nextToken,
  }: ListEmailMessagesForEmailFolderIdInput): Promise<ListEmailMessagesForEmailFolderIdOutput> {
    const fetchPolicyTransformer = new FetchPolicyTransformer()
    const fetchPolicy = fetchPolicyTransformer.transformCachePolicy(cachePolicy)
    const sortOrderTransformer = new SortOrderTransformer()
    const sortOrderInput = sortOrder
      ? sortOrderTransformer.fromAPItoGraphQL(sortOrder)
      : undefined
    const filterTransformer = new EmailMessageFilterTransformer()
    const inputFilter = filterTransformer.transformAPI(filter)
    let inputDateRange: DateRangeInput | undefined = undefined
    inputDateRange = dateRange
      ? (inputDateRange = {
          startDateEpochMs: dateRange?.startDate.getTime(),
          endDateEpochMs: dateRange?.endDate.getTime(),
        })
      : undefined
    const response = await this.appSync.listEmailMessagesForEmailFolderId(
      folderId,
      fetchPolicy,
      inputDateRange,
      inputFilter,
      limit,
      sortOrderInput,
      nextToken,
    )
    let sealedEmailMessages: SealedEmailMessageEntity[] = []
    if (response.items) {
      const transformer = new SealedEmailMessageEntityTransformer()
      sealedEmailMessages = response.items.map((item) =>
        transformer.transformGraphQL(item),
      )
    }
    const unsealedEmailMessages = await Promise.all(
      sealedEmailMessages.map(async (message) => {
        return await this.unsealEmailMessage(message)
      }),
    )
    return {
      emailMessages: unsealedEmailMessages,
      nextToken: response.nextToken ?? undefined,
    }
  }

  private async constructS3KeyForEmailAddressId(
    emailAddressId: string,
  ): Promise<string> {
    const idToken = await this.userClient.getIdToken()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const identityId = await this.userClient.getUserClaim(
      this.Defaults.IdentityIdClaimName,
    )
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.log.debug('ID info', { idToken, identityId })

    if (typeof identityId !== 'string' || !identityId.length) {
      throw new InternalError('Unable to find identity id')
    }
    return `${identityId}/email/${emailAddressId}`
  }

  private async constructS3KeyForEmailMessage(
    emailAddressId: string,
    emailMessageId: string,
    publicKeyId: string,
  ): Promise<string> {
    const keyForAddress = await this.constructS3KeyForEmailAddressId(
      emailAddressId,
    )
    return `${keyForAddress}/${emailMessageId}-${publicKeyId}`
  }

  // Visible for testing
  public async unsealEmailMessage(
    sealedEmailMessage: SealedEmailMessageEntity,
  ): Promise<EmailMessageEntity> {
    const emailMessageEntity: EmailMessageEntity = {
      id: sealedEmailMessage.id,
      owner: sealedEmailMessage.owner,
      owners: sealedEmailMessage.owners,
      emailAddressId: sealedEmailMessage.emailAddressId,
      keyId: sealedEmailMessage.keyId,
      algorithm: sealedEmailMessage.algorithm,
      folderId: sealedEmailMessage.folderId,
      seen: sealedEmailMessage.seen,
      direction: sealedEmailMessage.direction,
      state: sealedEmailMessage.state,
      clientRefId: sealedEmailMessage.clientRefId,
      version: sealedEmailMessage.version,
      sortDate: sealedEmailMessage.sortDate,
      createdAt: sealedEmailMessage.createdAt,
      updatedAt: sealedEmailMessage.updatedAt,
      from: [],
      to: [],
      cc: [],
      bcc: [],
      replyTo: [],
      status: { type: 'Completed' },
      size: sealedEmailMessage.size,
    }

    const status = await this.deviceKeyWorker.keyExists(
      emailMessageEntity.keyId,
      KeyType.KeyPair,
    )

    if (!status) {
      emailMessageEntity.status = {
        type: 'Failed',
        cause: new KeyNotFoundError(),
      }
      return emailMessageEntity
    }

    let json: string
    try {
      const unsealedRFC822Header = await this.deviceKeyWorker.unsealString({
        keyType: KeyType.KeyPair,
        encrypted: sealedEmailMessage.rfc822Header,
        keyId: sealedEmailMessage.keyId,
      })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      json = JSON.parse(unsealedRFC822Header)
    } catch (err: unknown) {
      const error = err as Error
      this.log.error(
        `Unable to parse unsealed RFC822 header details as JSON: ${error.message}`,
      )
      emailMessageEntity.status = {
        type: 'Failed',
        cause: error,
      }
      return emailMessageEntity
    }

    const decoded = EmailHeaderDetailsCodec.decode(json)
    if (isLeft(decoded)) {
      this.log.error(
        `Unable to parse unsealed RFC822 header as header details: ${PathReporter.report(
          decoded,
        ).join(', ')}`,
      )
      emailMessageEntity.status = {
        type: 'Failed',
        cause: new DecodeError(
          'RFC822 header unable to be parsed as header details',
        ),
      }
      return emailMessageEntity
    }

    const parsedRFC822Header: EmailHeaderDetails = decoded.right
    return {
      ...emailMessageEntity,
      ...parsedRFC822Header,
    }
  }
}
