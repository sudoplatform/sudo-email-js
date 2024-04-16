/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DecodeError,
  DefaultLogger,
  FatalError,
  KeyNotFoundError,
  Logger,
} from '@sudoplatform/sudo-common'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { FetchResult } from 'apollo-link'
import { isLeft } from 'fp-ts/lib/Either'
import * as t from 'io-ts'
import { PathReporter } from 'io-ts/PathReporter'
import { v4 } from 'uuid'
import {
  EmailMessageDateRangeInput,
  OnEmailMessageCreatedSubscription,
  OnEmailMessageDeletedSubscription,
  Rfc822HeaderInput,
  S3EmailObjectInput,
  SealedEmailMessage,
} from '../../../gen/graphqlTypes'
import {
  ConnectionState,
  EmailMessage,
  EmailMessageDateRange,
  EmailMessageSubscriber,
  EncryptionStatus,
} from '../../../public'
import {
  InternalError,
  MessageSizeLimitExceededError,
} from '../../../public/errors'
import { DraftEmailMessageEntity } from '../../domain/entities/message/draftEmailMessageEntity'
import { DraftEmailMessageMetadataEntity } from '../../domain/entities/message/draftEmailMessageMetadataEntity'
import { EmailMessageEntity } from '../../domain/entities/message/emailMessageEntity'
import {
  DeleteDraftInput,
  DeleteEmailMessagesInput,
  EmailMessageService,
  EmailMessageServiceDeleteDraftError,
  EmailMessageServiceSubscribeToEmailMessagesInput,
  EmailMessageServiceUnsubscribeFromEmailMessagesInput,
  GetDraftInput,
  GetEmailMessageInput,
  GetEmailMessageRfc822DataInput,
  GetEmailMessageWithBodyInput,
  ListDraftsMetadataInput,
  ListEmailMessagesForEmailAddressIdInput,
  ListEmailMessagesForEmailAddressIdOutput,
  ListEmailMessagesForEmailFolderIdInput,
  ListEmailMessagesForEmailFolderIdOutput,
  ListEmailMessagesInput,
  ListEmailMessagesOutput,
  SaveDraftInput,
  SendEncryptedMessageInput,
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
import {
  Subscribable,
  SubscriptionManager,
} from '../common/subscriptionManager'
import { FetchPolicyTransformer } from '../common/transformer/fetchPolicyTransformer'
import { SortOrderTransformer } from '../common/transformer/sortOrderTransformer'
import { gunzipAsync } from '../../util/zlibAsync'
// eslint-disable-next-line tree-shaking/no-side-effects-in-initialization
import { withDefault } from '../common/withDefault'
import { SealedEmailMessageEntityTransformer } from './transformer/sealedEmailMessageEntityTransformer'
import { Rfc822MessageDataProcessor } from '../../util/rfc822MessageDataProcessor'
import { SecureEmailAttachmentType } from '../../domain/entities/secure/secureEmailAttachmentType'
import { SecurePackage } from '../../domain/entities/secure/securePackage'
import { arrayBufferToString, stringToArrayBuffer } from '../../util/buffer'
import { EmailMessageCryptoService } from '../../domain/entities/secure/emailMessageCryptoService'
import { EmailMessageWithBodyEntity } from '../../domain/entities/message/emailMessageWithBodyEntity'

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

      // Messages processed prior to support for hasAttachments
      // will not have this property in their sealed data so we
      // need to allow for this possibility. We do this simply
      // by defaulting to false and not exposing the possibility
      // of this being undefined outside the SDK.
      hasAttachments: withDefault(t.boolean, false),
    }),
    t.partial({
      subject: t.string,
    }),
  ],
  'EmailHeaderDetails',
)
type EmailHeaderDetails = t.TypeOf<typeof EmailHeaderDetailsCodec>

export class DefaultEmailMessageService implements EmailMessageService {
  private readonly log: Logger

  private readonly createSubscriptionManager: SubscriptionManager<
    OnEmailMessageCreatedSubscription,
    EmailMessageSubscriber
  >

  private readonly deleteSubscriptionManager: SubscriptionManager<
    OnEmailMessageDeletedSubscription,
    EmailMessageSubscriber
  >

  constructor(
    private readonly appSync: ApiClient,
    private readonly userClient: SudoUserClient,
    private readonly s3Client: S3Client,
    private readonly deviceKeyWorker: DeviceKeyWorker,
    private readonly emailServiceConfig: EmailServiceConfig,
    private readonly emailMessageCryptoService: EmailMessageCryptoService,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
    this.createSubscriptionManager = new SubscriptionManager<
      OnEmailMessageCreatedSubscription,
      EmailMessageSubscriber
    >()

    this.deleteSubscriptionManager = new SubscriptionManager<
      OnEmailMessageDeletedSubscription,
      EmailMessageSubscriber
    >()
  }

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
    const keyId = await this.deviceKeyWorker.getCurrentSymmetricKeyId()
    if (!keyId) {
      throw new KeyNotFoundError('Symmetric key not found')
    }
    const keyPrefix = await this.constructS3KeyForEmailAddressId(
      senderEmailAddressId,
    )
    const draftId = id ?? v4()
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

    const message = await this.uploadDataToTransientBucket(
      senderEmailAddressId,
      rfc822Data,
    )

    return await this.appSync.sendEmailMessage({
      emailAddressId: senderEmailAddressId,
      message,
    })
  }

  async sendEncryptedMessage({
    message,
    recipientsPublicInfo,
    senderEmailAddressId,
    emailMessageMaxOutboundMessageSize,
  }: SendEncryptedMessageInput): Promise<string> {
    this.log.debug(this.sendEncryptedMessage.name, {
      message,
      recipientsPublicInfo,
      senderEmailAddressId,
    })
    const rfc822Data =
      Rfc822MessageDataProcessor.encodeToInternetMessageBuffer(message)
    const keyIds: string[] = []

    recipientsPublicInfo.forEach((recip) => {
      if (!keyIds.some((v) => v === recip.keyId)) {
        keyIds.push(recip.keyId)
      }
    })

    const securePackage = await this.emailMessageCryptoService.encrypt(
      rfc822Data,
      keyIds,
    )

    const encryptedRfc822Data =
      Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
        ...message,
        attachments: securePackage.toArray(),
        encryptionStatus: EncryptionStatus.ENCRYPTED,
      })

    if (encryptedRfc822Data.byteLength > emailMessageMaxOutboundMessageSize) {
      throw new MessageSizeLimitExceededError(
        `Email message size exceeded. Limit: ${emailMessageMaxOutboundMessageSize} bytes`,
      )
    }

    const s3EmailObjectInput = await this.uploadDataToTransientBucket(
      senderEmailAddressId,
      encryptedRfc822Data,
    )

    const rfc822Header: Rfc822HeaderInput = {
      from: message.from[0].emailAddress,
      to: message.to?.map((a) => a.emailAddress) ?? [],
      cc: message.cc?.map((a) => a.emailAddress) ?? [],
      bcc: message.bcc?.map((a) => a.emailAddress) ?? [],
      replyTo: message.replyTo?.map((a) => a.emailAddress) ?? [],
      subject: message.subject,
      hasAttachments:
        (message.attachments ? message.attachments.length > 0 : false) ||
        (message.inlineAttachments
          ? message.inlineAttachments.length > 0
          : false),
    }

    return await this.appSync.sendEncryptedEmailMessage({
      emailAddressId: senderEmailAddressId,
      message: s3EmailObjectInput,
      rfc822Header,
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

  async getEmailMessageWithBody({
    id,
    emailAddressId,
  }: GetEmailMessageWithBodyInput): Promise<
    EmailMessageWithBodyEntity | undefined
  > {
    this.log.debug(this.getEmailMessageWithBody.name, { id, emailAddressId })
    const data = await this.getEmailMessageRfc822Data({ id, emailAddressId })
    if (!data) {
      return undefined
    }

    const message = await Rfc822MessageDataProcessor.parseInternetMessageData(
      arrayBufferToString(data),
    )
    return {
      id,
      body: message.body ?? '',
      attachments: message.attachments ?? [],
      inlineAttachments: message.inlineAttachments ?? [],
    }
  }

  async getEmailMessageRfc822Data({
    id,
    emailAddressId,
  }: GetEmailMessageRfc822DataInput): Promise<ArrayBuffer | undefined> {
    const sealedEmailMessage = await this.appSync.getEmailMessage(id)
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

      const contentEncodingValues = (
        result.contentEncoding?.split(',') ?? [
          'sudoplatform-crypto',
          'sudoplatform-binary-data',
        ]
      ).reverse()
      let decodedString = sealedString
      for (const encodingValue of contentEncodingValues) {
        switch (encodingValue.trim().toLowerCase()) {
          case 'sudoplatform-compression':
            const decompressed = await gunzipAsync(
              Buffer.from(decodedString, 'base64'),
            )
            decodedString = new TextDecoder().decode(decompressed)
            break
          case 'sudoplatform-crypto':
            decodedString = await this.deviceKeyWorker.unsealString({
              keyType: KeyType.KeyPair,
              keyId: sealedEmailMessage.rfc822Header.keyId,
              encrypted: decodedString,
            })
            break
          case 'sudoplatform-binary-data': //no-op
            break
          default:
            throw new DecodeError(
              `Invalid Content-Encoding value: ${encodingValue}`,
            )
        }
      }

      // Check for encrypted body attachment
      if (decodedString.includes(SecureEmailAttachmentType.BODY.contentId)) {
        const decodedEncrypedMessage =
          await Rfc822MessageDataProcessor.parseInternetMessageData(
            decodedString,
          )
        if (
          !decodedEncrypedMessage.attachments ||
          decodedEncrypedMessage.attachments.length === 0
        ) {
          throw new DecodeError('Error decoding encrypted mesage')
        }
        const keyAttachments = new Set(
          decodedEncrypedMessage.attachments?.filter(
            (att) =>
              att.contentId ===
              SecureEmailAttachmentType.KEY_EXCHANGE.contentId,
          ),
        )
        if (keyAttachments.size === 0) {
          throw new DecodeError('Could not find key attachments')
        }
        const bodyAttachment = decodedEncrypedMessage.attachments.find(
          (att) => att.contentId === SecureEmailAttachmentType.BODY.contentId,
        )
        if (!bodyAttachment) {
          throw new DecodeError('Could not find body attachment')
        }
        const securePackage = new SecurePackage(keyAttachments, bodyAttachment)
        const decodedUnencrypedMessage =
          await this.emailMessageCryptoService.decrypt(securePackage)
        return decodedUnencrypedMessage
      }
      return stringToArrayBuffer(decodedString)
    } catch (error: unknown) {
      this.log.error('Error getting RFC822 data', { error })
      const s3DownloadError = error as S3DownloadError
      if (s3DownloadError.code === S3Error.NoSuchKey) {
        return undefined
      }
      throw error
    }
  }

  async getMessage(
    input: GetEmailMessageInput,
  ): Promise<EmailMessageEntity | undefined> {
    const fetchPolicy = input.cachePolicy
      ? FetchPolicyTransformer.transformCachePolicy(input.cachePolicy)
      : undefined
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

  async listMessages({
    dateRange,
    cachePolicy,
    limit,
    sortOrder,
    nextToken,
  }: ListEmailMessagesInput): Promise<ListEmailMessagesOutput> {
    const fetchPolicy = cachePolicy
      ? FetchPolicyTransformer.transformCachePolicy(cachePolicy)
      : undefined
    const sortOrderTransformer = new SortOrderTransformer()
    const sortOrderInput = sortOrder
      ? sortOrderTransformer.fromAPItoGraphQL(sortOrder)
      : undefined
    const inputDateRange = dateRange
      ? this.validateDateRange(dateRange)
      : undefined

    const response = await this.appSync.listEmailMessages(
      fetchPolicy,
      inputDateRange,
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

  async listMessagesForEmailAddressId({
    emailAddressId,
    dateRange,
    cachePolicy,
    limit,
    sortOrder,
    nextToken,
  }: ListEmailMessagesForEmailAddressIdInput): Promise<ListEmailMessagesForEmailAddressIdOutput> {
    const fetchPolicy = cachePolicy
      ? FetchPolicyTransformer.transformCachePolicy(cachePolicy)
      : undefined
    const sortOrderTransformer = new SortOrderTransformer()
    const sortOrderInput = sortOrder
      ? sortOrderTransformer.fromAPItoGraphQL(sortOrder)
      : undefined
    const inputDateRange = dateRange
      ? this.validateDateRange(dateRange)
      : undefined

    const response = await this.appSync.listEmailMessagesForEmailAddressId(
      emailAddressId,
      fetchPolicy,
      inputDateRange,
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
    dateRange,
    cachePolicy,
    limit,
    sortOrder,
    nextToken,
  }: ListEmailMessagesForEmailFolderIdInput): Promise<ListEmailMessagesForEmailFolderIdOutput> {
    const fetchPolicy = cachePolicy
      ? FetchPolicyTransformer.transformCachePolicy(cachePolicy)
      : undefined
    const sortOrderTransformer = new SortOrderTransformer()
    const sortOrderInput = sortOrder
      ? sortOrderTransformer.fromAPItoGraphQL(sortOrder)
      : undefined
    const inputDateRange = dateRange
      ? this.validateDateRange(dateRange)
      : undefined

    const response = await this.appSync.listEmailMessagesForEmailFolderId(
      folderId,
      fetchPolicy,
      inputDateRange,
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
      previousFolderId: sealedEmailMessage.previousFolderId,
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
      hasAttachments: false,
      status: { type: 'Completed' },
      size: sealedEmailMessage.size,
      encryptionStatus: sealedEmailMessage.encryptionStatus,
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

  subscribeToEmailMessages(
    input: EmailMessageServiceSubscribeToEmailMessagesInput,
  ): void {
    // subscribe to email messages created
    this.createSubscriptionManager.subscribe(
      input.subscriptionId,
      input.subscriber,
    )
    // If subscription manager watcher and subscription hasn't been setup yet
    // create them and watch for email message changes per `owner`.
    if (!this.createSubscriptionManager.getWatcher()) {
      this.createSubscriptionManager.setWatcher(
        this.appSync.onEmailMessageCreated(input.ownerId),
      )

      this.createSubscriptionManager.setSubscription(
        this.setupEmailMessagesCreatedSubscription(),
      )

      this.createSubscriptionManager.connectionStatusChanged(
        ConnectionState.Connected,
      )
    }

    // Subscribe to email messages deleted
    this.deleteSubscriptionManager.subscribe(
      input.subscriptionId,
      input.subscriber,
    )
    // If subscription manager watcher and subscription hasn't been setup yet
    // create them and watch for email message changes per `owner`.
    if (!this.deleteSubscriptionManager.getWatcher()) {
      this.deleteSubscriptionManager.setWatcher(
        this.appSync.onEmailMessageDeleted(input.ownerId),
      )

      this.deleteSubscriptionManager.setSubscription(
        this.setupEmailMessagesDeletedSubscription(),
      )

      this.deleteSubscriptionManager.connectionStatusChanged(
        ConnectionState.Connected,
      )
    }
  }

  unsubscribeFromEmailMessages(
    input: EmailMessageServiceUnsubscribeFromEmailMessagesInput,
  ): void {
    this.createSubscriptionManager.unsubscribe(input.subscriptionId)
    this.deleteSubscriptionManager.unsubscribe(input.subscriptionId)
  }

  private validateDateRange(
    dateRange: EmailMessageDateRange,
  ): EmailMessageDateRangeInput {
    return {
      ...('sortDate' in dateRange && {
        sortDateEpochMs: {
          startDateEpochMs: dateRange.sortDate.startDate.getTime(),
          endDateEpochMs: dateRange.sortDate.endDate.getTime(),
        },
      }),
      ...('updatedAt' in dateRange && {
        updatedAtEpochMs: {
          startDateEpochMs: dateRange.updatedAt.startDate.getTime(),
          endDateEpochMs: dateRange.updatedAt.endDate.getTime(),
        },
      }),
    }
  }

  private onSubscriptionCompleted<
    SubscriptionManagerType extends SubscriptionManager<
      Subscribable,
      EmailMessageSubscriber
    >,
  >(subscriptionManager: SubscriptionManagerType, subscriptionName: string) {
    this.log.info(`completed ${subscriptionName} subscription`)

    subscriptionManager.connectionStatusChanged(ConnectionState.Disconnected)
  }

  private onSubscriptionError<
    SubscriptionManagerType extends SubscriptionManager<
      Subscribable,
      EmailMessageSubscriber
    >,
  >(
    subscriptionManager: SubscriptionManagerType,
    subscriptionName: string,
    error: any,
  ) {
    this.log.info(`failed to update ${subscriptionName} subscription`, {
      error,
    })
    subscriptionManager.connectionStatusChanged(ConnectionState.Disconnected)
  }

  private async onSubscriptionNext<
    SubscriptionType =
      | OnEmailMessageDeletedSubscription
      | OnEmailMessageCreatedSubscription,
  >(
    subscriptionName: string,
    result: FetchResult<SubscriptionType>,
    getData: (data: SubscriptionType) => SealedEmailMessage,
    callback: (emailMessage: EmailMessage) => Promise<void>,
  ) {
    return void (async (
      result: FetchResult<SubscriptionType>,
    ): Promise<void> => {
      this.log.info(`executing ${subscriptionName} subscription`, {
        result,
      })
      if (result.data) {
        const data = getData(result.data)
        if (!data) {
          throw new FatalError(
            `${subscriptionName} subscription response contained error`,
          )
        } else {
          this.log.info(`${subscriptionName} subscription successful`, {
            data,
          })

          const sealedEmailMessageEntity =
            new SealedEmailMessageEntityTransformer().transformGraphQL(data)
          const unsealedEmailMessageEntity = await this.unsealEmailMessage(
            sealedEmailMessageEntity,
          )
          await callback(unsealedEmailMessageEntity)
        }
      }
    })(result)
  }

  private setupEmailMessagesCreatedSubscription():
    | ZenObservable.Subscription
    | undefined {
    const subscription = this.createSubscriptionManager
      .getWatcher()
      ?.subscribe({
        complete: () => {
          this.onSubscriptionCompleted(
            this.createSubscriptionManager,
            'onEmailMessageCreated',
          )
        },
        error: (error) => {
          this.onSubscriptionError(
            this.createSubscriptionManager,
            'onEmailMessageCreated',
            error,
          )
        },
        next: (result: FetchResult<OnEmailMessageCreatedSubscription>) => {
          return void (async (
            result: FetchResult<OnEmailMessageCreatedSubscription>,
          ): Promise<void> => {
            return this.onSubscriptionNext(
              'onEmailMessageCreated',
              result,
              (data) => {
                return data.onEmailMessageCreated
              },
              async (message) =>
                this.createSubscriptionManager.emailMessageCreated(message),
            )
          })(result)
        },
      })
    return subscription
  }

  private setupEmailMessagesDeletedSubscription():
    | ZenObservable.Subscription
    | undefined {
    const subscription = this.deleteSubscriptionManager
      .getWatcher()
      ?.subscribe({
        complete: () => {
          this.onSubscriptionCompleted(
            this.deleteSubscriptionManager,
            'onEmailMessageDeleted',
          )
        },
        error: (error) => {
          this.onSubscriptionError(
            this.deleteSubscriptionManager,
            'onEmailMessageDeleted',
            error,
          )
        },
        next: (result: FetchResult<OnEmailMessageDeletedSubscription>) => {
          return void (async (
            result: FetchResult<OnEmailMessageDeletedSubscription>,
          ): Promise<void> => {
            return this.onSubscriptionNext(
              'onEmailMessageDeleted',
              result,
              (data) => {
                return data.onEmailMessageDeleted
              },
              async (message) =>
                this.deleteSubscriptionManager.emailMessageDeleted(message),
            )
          })(result)
        },
      })
    return subscription
  }

  private async uploadDataToTransientBucket(
    senderEmailAddressId: string,
    data: ArrayBuffer,
  ): Promise<S3EmailObjectInput> {
    const keyPrefix = await this.constructS3KeyForEmailAddressId(
      senderEmailAddressId,
    )
    const id = v4()
    const key = `${keyPrefix}/${id}`
    const bucket = this.emailServiceConfig.transientBucket
    const region = this.emailServiceConfig.region
    let binary = ''
    const bytes = new Uint8Array(data)
    for (const byte of bytes) {
      binary += String.fromCharCode(byte)
    }
    await this.s3Client.upload({
      bucket,
      region,
      key,
      body: binary,
    })
    return {
      bucket,
      key,
      region,
    }
  }
}
