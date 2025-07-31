/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Base64,
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
import { DateFromISOString } from 'io-ts-types'
import { PathReporter } from 'io-ts/PathReporter'
import { v4 } from 'uuid'
import {
  EmailMessageDateRangeInput,
  OnEmailMessageCreatedSubscription,
  OnEmailMessageDeletedSubscription,
  OnEmailMessageUpdatedSubscription,
  Rfc822HeaderInput,
  S3EmailObjectInput,
  SealedEmailMessage,
  ListScheduledDraftMessagesForEmailAddressIdInput as ListScheduledDraftMessagesForEmailAddressIdRequest,
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
  MessageNotFoundError,
  MessageSizeLimitExceededError,
  UnsupportedKeyTypeError,
} from '../../../public/errors'
import { DraftEmailMessageEntity } from '../../domain/entities/message/draftEmailMessageEntity'
import { DraftEmailMessageMetadataEntity } from '../../domain/entities/message/draftEmailMessageMetadataEntity'
import { EmailMessageEntity } from '../../domain/entities/message/emailMessageEntity'
import {
  CancelScheduledDraftMessageInput,
  DeleteDraftsInput,
  DeleteEmailMessagesInput,
  EmailMessageService,
  EmailMessageServiceDeleteDraftsError,
  EmailMessageServiceSubscribeToEmailMessagesInput,
  EmailMessageServiceUnsubscribeFromEmailMessagesInput,
  GetDraftInput,
  GetEmailMessageInput,
  GetEmailMessageRfc822DataInput,
  GetEmailMessageWithBodyInput,
  ListDraftsMetadataForEmailAddressIdInput,
  ListEmailMessagesForEmailAddressIdInput,
  ListEmailMessagesForEmailAddressIdOutput,
  ListEmailMessagesForEmailFolderIdInput,
  ListEmailMessagesForEmailFolderIdOutput,
  ListEmailMessagesInput,
  ListEmailMessagesOutput,
  ListScheduledDraftMessagesForEmailAddressIdInput,
  ListScheduledDraftMessagesOutput,
  SaveDraftInput,
  ScheduleSendDraftMessageInput,
  SendEmailMessageOutput,
  SendEncryptedMessageInput,
  SendMessageInput,
  UpdateEmailMessagesInput,
  UpdateEmailMessagesOutput,
} from '../../domain/entities/message/emailMessageService'
import { EmailMessageWithBodyEntity } from '../../domain/entities/message/emailMessageWithBodyEntity'
import { SealedEmailMessageEntity } from '../../domain/entities/message/sealedEmailMessageEntity'
import { EmailCryptoService } from '../../domain/entities/secure/emailCryptoService'
import {
  LEGACY_BODY_CONTENT_ID,
  LEGACY_KEY_EXCHANGE_CONTENT_ID,
  SecureEmailAttachmentType,
} from '../../domain/entities/secure/secureEmailAttachmentType'
import { SecurePackage } from '../../domain/entities/secure/securePackage'
import { arrayBufferToString, stringToArrayBuffer } from '../../util/buffer'
import { Rfc822MessageDataProcessor } from '../../util/rfc822MessageDataProcessor'
import { gunzipAsync } from '../../util/zlibAsync'
import { ApiClient } from '../common/apiClient'
import { EmailServiceConfig } from '../common/config'
import { DeviceKeyWorker, KeyType } from '../common/deviceKeyWorker'
import {
  S3BulkDeleteError,
  S3Client,
  S3DownloadError,
  S3Error,
  S3GetHeadObjectDataError,
} from '../common/s3Client'
import {
  Subscribable,
  SubscriptionManager,
} from '../common/subscriptionManager'
import { FetchPolicyTransformer } from '../common/transformer/fetchPolicyTransformer'
import { SortOrderTransformer } from '../common/transformer/sortOrderTransformer'
// eslint-disable-next-line tree-shaking/no-side-effects-in-initialization
import { withDefault } from '../common/withDefault'
import { SealedEmailMessageEntityTransformer } from './transformer/sealedEmailMessageEntityTransformer'
import { SendEmailMessageResultTransformer } from './transformer/sendEmailMessageResultTransformer'
import { EmailAddressPublicInfoEntity } from '../../domain/entities/account/emailAddressPublicInfoEntity'
import { ScheduledDraftMessageEntity } from '../../domain/entities/message/scheduledDraftMessageEntity'
import { ScheduledDraftMessageTransformer } from './transformer/scheduledDraftMessageTransformer'
import { ScheduledDraftMessageFilterTransformer } from './transformer/scheduledDraftMessageFilterTransformer'

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
      date: DateFromISOString,
      inReplyTo: t.string,
      references: t.array(t.string),
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

  private readonly updateSubscriptionManager: SubscriptionManager<
    OnEmailMessageUpdatedSubscription,
    EmailMessageSubscriber
  >

  constructor(
    private readonly appSync: ApiClient,
    private readonly userClient: SudoUserClient,
    private readonly s3Client: S3Client,
    private readonly deviceKeyWorker: DeviceKeyWorker,
    private readonly emailServiceConfig: EmailServiceConfig,
    private readonly emailCryptoService: EmailCryptoService,
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

    this.updateSubscriptionManager = new SubscriptionManager<
      OnEmailMessageUpdatedSubscription,
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
    const keyPrefix =
      await this.constructS3KeyForEmailAddressId(senderEmailAddressId)
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
      emailAddressId: senderEmailAddressId,
      updatedAt: draft.lastModified,
    }
  }

  async deleteDrafts({
    ids,
    emailAddressId,
  }: DeleteDraftsInput): Promise<{ id: string; reason: string }[]> {
    const keyPrefix = await this.constructS3KeyForEmailAddressId(emailAddressId)
    const keys = ids.map((id) => `${keyPrefix}/draft/${id}`)
    try {
      const failedIds = await this.s3Client.bulkDelete({
        bucket: this.emailServiceConfig.bucket,
        region: this.emailServiceConfig.region,
        keys,
      })
      return failedIds.map((val) => ({
        id: val.key.substring(val.key.lastIndexOf('/') + 1),
        reason: val.reason,
      }))
    } catch (error) {
      if (error instanceof S3BulkDeleteError) {
        throw new EmailMessageServiceDeleteDraftsError(
          ids,
          error.msg ?? error.message ?? 'Unknown error',
        )
      }
      throw error
    }
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
      id,
      emailAddressId,
      updatedAt,
      rfc822Data: new TextEncoder().encode(unsealedData),
    }
  }

  async listDraftsMetadataForEmailAddressId({
    emailAddressId,
  }: ListDraftsMetadataForEmailAddressIdInput): Promise<
    DraftEmailMessageMetadataEntity[]
  > {
    const keyPrefix = await this.constructS3KeyForEmailAddressId(emailAddressId)
    const draftPrefix = `${keyPrefix}/draft/`
    const result = await this.s3Client.list({
      bucket: this.emailServiceConfig.bucket,
      region: this.emailServiceConfig.region,
      prefix: draftPrefix,
    })
    return result.map((r) => ({
      id: r.key.replace(draftPrefix, ''),
      emailAddressId,
      updatedAt: r.lastModified,
    }))
  }

  async scheduleSendDraftMessage({
    id,
    emailAddressId,
    sendAt,
  }: ScheduleSendDraftMessageInput): Promise<ScheduledDraftMessageEntity> {
    this.log.debug(this.scheduleSendDraftMessage.name, {
      id,
      emailAddressId,
      sendAt,
    })
    const keyPrefix = await this.constructS3KeyForEmailAddressId(emailAddressId)
    const key = `${keyPrefix}/draft/${id}`
    let keyId: string | undefined
    let algorithm: string | undefined

    try {
      const headObjectData = await this.s3Client.getHeadObjectData({
        bucket: this.emailServiceConfig.bucket,
        region: this.emailServiceConfig.region,
        key,
      })

      if (!headObjectData) {
        this.log.error('Draft message not found', { id, emailAddressId, key })
        throw new MessageNotFoundError(`Draft message not found ${id}`)
      }
      keyId = headObjectData.metadata?.[this.Defaults.Metadata.KeyIdName]
      algorithm =
        headObjectData.metadata?.[this.Defaults.Metadata.AlgorithmName]
    } catch (error: unknown) {
      const s3GetHeadObjectError = error as S3GetHeadObjectDataError
      if (s3GetHeadObjectError.code === S3Error.NoSuchKey) {
        this.log.error('Draft message not found', { id, emailAddressId, key })
        throw new MessageNotFoundError(`Draft message not found ${id}`)
      }
      this.log.error('Error getting draft message metadata', { error })
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

    if (keyType === KeyType.KeyPair) {
      throw new UnsupportedKeyTypeError(
        `Key Type not supported for schedule sending drafts ${keyType}`,
      )
    }
    const symmetricKey = await this.deviceKeyWorker.getKeyData(keyId, keyType)

    if (!symmetricKey) {
      throw new KeyNotFoundError(`Could not find symmetric key ${keyId}`)
    }

    const result = await this.appSync.scheduleSendDraftMessage({
      draftMessageKey: key,
      emailAddressId,
      sendAtEpochMs: sendAt.getTime(),
      symmetricKey: Base64.encode(symmetricKey),
    })
    return ScheduledDraftMessageTransformer.toEntity(result)
  }

  async cancelScheduledDraftMessage({
    id,
    emailAddressId,
  }: CancelScheduledDraftMessageInput): Promise<string> {
    this.log.debug(this.cancelScheduledDraftMessage.name, {
      id,
      emailAddressId,
    })
    const keyPrefix = await this.constructS3KeyForEmailAddressId(emailAddressId)
    const key = `${keyPrefix}/draft/${id}`

    const result = await this.appSync.cancelScheduledDraftMessage({
      draftMessageKey: key,
      emailAddressId,
    })
    return result.substring(result.lastIndexOf('/') + 1)
  }

  async listScheduledDraftMessagesForEmailAddressId({
    emailAddressId,
    filter,
    limit,
    nextToken,
    cachePolicy,
  }: ListScheduledDraftMessagesForEmailAddressIdInput): Promise<ListScheduledDraftMessagesOutput> {
    this.log.debug(this.listScheduledDraftMessagesForEmailAddressId.name, {
      emailAddressId,
      filter,
      limit,
      nextToken,
    })
    const fetchPolicy = cachePolicy
      ? FetchPolicyTransformer.transformCachePolicy(cachePolicy)
      : undefined

    const input: ListScheduledDraftMessagesForEmailAddressIdRequest = {
      emailAddressId,
      limit,
      nextToken,
    }
    if (filter) {
      input.filter = ScheduledDraftMessageFilterTransformer.toGraphQl(filter)
    }
    const result =
      await this.appSync.listScheduledDraftMessagesForEmailAddressId(
        input,
        fetchPolicy,
      )
    return {
      nextToken: result.nextToken ?? undefined,
      scheduledDraftMessages: result.items.map((s) =>
        ScheduledDraftMessageTransformer.toEntity(s),
      ),
    }
  }

  async sendMessage({
    message,
    senderEmailAddressId,
    emailMessageMaxOutboundMessageSize,
  }: SendMessageInput): Promise<SendEmailMessageOutput> {
    this.log.debug(this.sendMessage.name, {
      message,
      senderEmailAddressId,
      emailMessageMaxOutboundMessageSize,
    })

    const rfc822Data = Rfc822MessageDataProcessor.encodeToInternetMessageBuffer(
      {
        ...message,
        encryptionStatus: EncryptionStatus.UNENCRYPTED,
      },
    )
    if (rfc822Data.byteLength > emailMessageMaxOutboundMessageSize) {
      throw new MessageSizeLimitExceededError(
        `Email message size exceeded. Limit: ${emailMessageMaxOutboundMessageSize} bytes`,
      )
    }

    const s3MessageObject = await this.uploadDataToTransientBucket(
      senderEmailAddressId,
      rfc822Data,
    )

    const result = await this.appSync.sendEmailMessage({
      emailAddressId: senderEmailAddressId,
      message: s3MessageObject,
    })
    const resultTransformer = new SendEmailMessageResultTransformer()
    return resultTransformer.transformGraphQL(result)
  }

  async sendEncryptedMessage({
    message,
    emailAddressesPublicInfo,
    senderEmailAddressId,
    emailMessageMaxOutboundMessageSize,
  }: SendEncryptedMessageInput): Promise<SendEmailMessageOutput> {
    this.log.debug(this.sendEncryptedMessage.name, {
      message,
      emailAddressesPublicInfo,
      senderEmailAddressId,
    })

    const rfc822Data = Rfc822MessageDataProcessor.encodeToInternetMessageBuffer(
      message,
      { decodeEncodedFields: true },
    )

    const uniqueEmailAddressPublicInfo: EmailAddressPublicInfoEntity[] = []
    emailAddressesPublicInfo.forEach((info) => {
      if (!uniqueEmailAddressPublicInfo.some((v) => v.keyId === info.keyId)) {
        uniqueEmailAddressPublicInfo.push(info)
      }
    })

    const encryptedEmailMessage = await this.emailCryptoService.encrypt(
      rfc822Data,
      uniqueEmailAddressPublicInfo,
    )
    const secureAttachments = encryptedEmailMessage.toArray()

    const encryptedRfc822Data =
      Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
        ...message,
        attachments: secureAttachments,
        encryptionStatus: EncryptionStatus.ENCRYPTED,
      })

    if (encryptedRfc822Data.byteLength > emailMessageMaxOutboundMessageSize) {
      throw new MessageSizeLimitExceededError(
        `Email message size exceeded. Limit: ${emailMessageMaxOutboundMessageSize} bytes`,
      )
    }

    const s3MessageObject = await this.uploadDataToTransientBucket(
      senderEmailAddressId,
      encryptedRfc822Data,
    )

    const rfc822Header: Rfc822HeaderInput = {
      from: Rfc822MessageDataProcessor.emailAddressDetailToString(
        message.from[0],
      ),
      to:
        message.to?.map((a) =>
          Rfc822MessageDataProcessor.emailAddressDetailToString(a),
        ) ?? [],
      cc:
        message.cc?.map((a) =>
          Rfc822MessageDataProcessor.emailAddressDetailToString(a),
        ) ?? [],
      bcc:
        message.bcc?.map((a) =>
          Rfc822MessageDataProcessor.emailAddressDetailToString(a),
        ) ?? [],
      replyTo:
        message.replyTo?.map((a) =>
          Rfc822MessageDataProcessor.emailAddressDetailToString(a),
        ) ?? [],
      subject: message.subject,
      hasAttachments:
        (message.attachments ? message.attachments.length > 0 : false) ||
        (message.inlineAttachments
          ? message.inlineAttachments.length > 0
          : false),
      dateEpochMs: new Date().getTime(),
    }
    if (message.forwardMessageId) {
      rfc822Header.references = [message.forwardMessageId]
    }
    if (message.replyMessageId) {
      rfc822Header.inReplyTo = message.replyMessageId
    }

    const result = await this.appSync.sendEncryptedEmailMessage({
      emailAddressId: senderEmailAddressId,
      message: s3MessageObject,
      rfc822Header,
    })
    const resultTransformer = new SendEmailMessageResultTransformer()
    return resultTransformer.transformGraphQL(result)
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
      successMessages: result.successMessages?.map((m) => ({
        id: m.id,
        createdAt: new Date(m.createdAtEpochMs),
        updatedAt: new Date(m.updatedAtEpochMs),
      })),
      failureMessages: result.failedMessages ?? undefined,
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
      if (
        decodedString.includes(SecureEmailAttachmentType.BODY.contentId) ||
        decodedString.includes(LEGACY_BODY_CONTENT_ID)
      ) {
        const decodedEncryptedMessage =
          await Rfc822MessageDataProcessor.parseInternetMessageData(
            decodedString,
          )

        if (
          !decodedEncryptedMessage.attachments ||
          decodedEncryptedMessage.attachments.length === 0
        ) {
          throw new DecodeError('Error decoding encrypted mesage')
        }
        const keyAttachments = new Set(
          decodedEncryptedMessage.attachments?.filter(
            (att) =>
              att.contentId?.includes(
                SecureEmailAttachmentType.KEY_EXCHANGE.contentId,
              ) || att.contentId?.includes(LEGACY_KEY_EXCHANGE_CONTENT_ID),
          ),
        )
        if (keyAttachments.size === 0) {
          throw new DecodeError('Could not find key attachments')
        }
        const bodyAttachment = decodedEncryptedMessage.attachments.find(
          (att) =>
            att.contentId === SecureEmailAttachmentType.BODY.contentId ||
            att.contentId === LEGACY_BODY_CONTENT_ID,
        )
        if (!bodyAttachment) {
          throw new DecodeError('Could not find body attachment')
        }
        const securePackage = new SecurePackage(keyAttachments, bodyAttachment)
        const decodedUnencryptedMessage =
          await this.emailCryptoService.decrypt(securePackage)
        return decodedUnencryptedMessage
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
    const unsealedEmailMessage =
      await this.unsealEmailMessage(sealedEmailMessage)
    return unsealedEmailMessage
  }

  async listMessages({
    dateRange,
    cachePolicy,
    limit,
    sortOrder,
    nextToken,
    includeDeletedMessages,
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
      includeDeletedMessages,
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
    includeDeletedMessages,
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
      includeDeletedMessages,
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
    includeDeletedMessages,
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
      includeDeletedMessages,
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
    const keyForAddress =
      await this.constructS3KeyForEmailAddressId(emailAddressId)
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
      repliedTo: sealedEmailMessage.repliedTo,
      forwarded: sealedEmailMessage.forwarded,
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
      date: undefined,
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

    // Subscribe to email messages updated
    this.updateSubscriptionManager.subscribe(
      input.subscriptionId,
      input.subscriber,
    )
    // If subscription manager watcher and subscription hasn't been setup yet
    // create them and watch for email message changes per `owner`.
    if (!this.updateSubscriptionManager.getWatcher()) {
      this.updateSubscriptionManager.setWatcher(
        this.appSync.onEmailMessageUpdated(input.ownerId),
      )

      this.updateSubscriptionManager.setSubscription(
        this.setupEmailMessagesUpdatedSubscription(),
      )

      this.updateSubscriptionManager.connectionStatusChanged(
        ConnectionState.Connected,
      )
    }
  }

  unsubscribeFromEmailMessages(
    input: EmailMessageServiceUnsubscribeFromEmailMessagesInput,
  ): void {
    this.createSubscriptionManager.unsubscribe(input.subscriptionId)
    this.updateSubscriptionManager.unsubscribe(input.subscriptionId)
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

  private setupEmailMessagesUpdatedSubscription():
    | ZenObservable.Subscription
    | undefined {
    const subscription = this.updateSubscriptionManager
      .getWatcher()
      ?.subscribe({
        complete: () => {
          this.onSubscriptionCompleted(
            this.updateSubscriptionManager,
            'onEmailMessageUpdated',
          )
        },
        error: (error) => {
          this.onSubscriptionError(
            this.updateSubscriptionManager,
            'onEmailMessageUpdated',
            error,
          )
        },
        next: (result: FetchResult<OnEmailMessageUpdatedSubscription>) => {
          return void (async (
            result: FetchResult<OnEmailMessageUpdatedSubscription>,
          ): Promise<void> => {
            return this.onSubscriptionNext(
              'onEmailMessageUpdated',
              result,
              (data) => {
                return data.onEmailMessageUpdated
              },
              async (message) =>
                this.updateSubscriptionManager.emailMessageUpdated(message),
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
    const keyPrefix =
      await this.constructS3KeyForEmailAddressId(senderEmailAddressId)
    const id = v4()
    const key = `${keyPrefix}/${id}`
    const bucket = this.emailServiceConfig.transientBucket
    const region = this.emailServiceConfig.region
    const body = new TextDecoder().decode(data)
    await this.s3Client.upload({
      bucket,
      region,
      key,
      body,
    })
    return {
      bucket,
      key,
      region,
    }
  }
}
