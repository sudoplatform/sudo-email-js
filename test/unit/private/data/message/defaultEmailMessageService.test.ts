/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Base64,
  CachePolicy,
  DecodeError,
  KeyNotFoundError,
  PublicKeyFormat,
  Buffer as BufferUtil,
} from '@sudoplatform/sudo-common'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import {
  anything,
  capture,
  instance,
  mock,
  reset,
  verify,
  when,
} from 'ts-mockito'
import { v4 } from 'uuid'
import {
  ConnectionState,
  EmailAttachment,
  EmailMessage,
  EmailMessageSubscriber,
  EncryptionStatus,
  ScheduledDraftMessageState,
} from '../../../../../src'
import {
  OnEmailMessageDeletedSubscription,
  UpdateEmailMessagesStatus,
  ScheduledDraftMessageState as ScheduledDraftMessageStateGql,
} from '../../../../../src/gen/graphqlTypes'
import { ApiClient } from '../../../../../src/private/data/common/apiClient'
import {
  DeviceKeyWorker,
  KeyType,
} from '../../../../../src/private/data/common/deviceKeyWorker'
import {
  S3BulkDeleteError,
  S3Client,
  S3ClientListOutput,
  S3DownloadError,
  S3Error,
  S3GetHeadObjectDataError,
} from '../../../../../src/private/data/common/s3Client'
import { SubscriptionManager } from '../../../../../src/private/data/common/subscriptionManager'
import { DefaultEmailMessageService } from '../../../../../src/private/data/message/defaultEmailMessageService'
import { DraftEmailMessageEntity } from '../../../../../src/private/domain/entities/message/draftEmailMessageEntity'
import { DraftEmailMessageMetadataEntity } from '../../../../../src/private/domain/entities/message/draftEmailMessageMetadataEntity'
import { EmailMessageServiceDeleteDraftsError } from '../../../../../src/private/domain/entities/message/emailMessageService'
import {
  InternalError,
  MessageNotFoundError,
  MessageSizeLimitExceededError,
  UnsupportedKeyTypeError,
} from '../../../../../src/public/errors'
import { UpdateEmailMessagesInput } from '../../../../../src/public/sudoEmailClient'
import { SortOrder } from '../../../../../src/public/typings/sortOrder'
import {
  arrayBufferToString,
  stringToArrayBuffer,
} from '../../../../../src/private/util/buffer'
import { DraftEmailMessageDataFactory } from '../../../data-factory/draftEmailMessage'
import { EmailMessageRfc822DataFactory } from '../../../data-factory/emailMessageRfc822Data'
import { EntityDataFactory } from '../../../data-factory/entity'
import { GraphQLDataFactory } from '../../../data-factory/graphQL'
import * as zlibAsync from '../../../../../src/private/util/zlibAsync'
import {
  EmailMessageDetails,
  Rfc822MessageDataProcessor,
} from '../../../../../src/private/util/rfc822MessageDataProcessor'
import { EmailAddressPublicInfoEntity } from '../../../../../src/private/domain/entities/account/emailAddressPublicInfoEntity'
import { SecurePackage } from '../../../../../src/private/domain/entities/secure/securePackage'
import { SecureEmailAttachmentType } from '../../../../../src/private/domain/entities/secure/secureEmailAttachmentType'
import { EmailCryptoService } from '../../../../../src/private/domain/entities/secure/emailCryptoService'
import { DateTime } from 'luxon'
import { SecurePackageDataFactory } from '../../../data-factory/securePackage'

const identityServiceConfig = DraftEmailMessageDataFactory.identityServiceConfig

const unsealedHeaderDetailsHasAttachmentsUnsetString =
  '{"bcc":[],"to":[{"emailAddress":"testie@unittest.org"}],"from":[{"emailAddress":"testie@unittest.org"}],"cc":[],"replyTo":[],"subject":"testSubject","date":"1970-01-01T00:00:00.002Z"}'
const unsealedHeaderDetailsHasAttachmentsTrueString =
  '{"bcc":[],"to":[{"emailAddress":"testie@unittest.org"}],"from":[{"emailAddress":"testie@unittest.org"}],"cc":[],"replyTo":[],"subject":"testSubject","date":"1970-01-01T00:00:00.002Z","hasAttachments":true}'
const unsealedHeaderDetailsString =
  '{"bcc":[],"to":[{"emailAddress":"testie@unittest.org"}],"from":[{"emailAddress":"testie@unittest.org"}],"cc":[],"replyTo":[],"subject":"testSubject","date":"1970-01-01T00:00:00.002Z","hasAttachments":false}'
const unsealedHeaderDetailsNoDateString =
  '{"bcc":[],"to":[{"emailAddress":"testie@unittest.org"}],"from":[{"emailAddress":"testie@unittest.org"}],"cc":[],"replyTo":[],"subject":"testSubject","hasAttachments":false}'

jest.mock('../../../../../src/private/data/common/subscriptionManager')
const JestMockSubscriptionManager = SubscriptionManager as jest.MockedClass<
  typeof SubscriptionManager
>
jest.mock('../../../../../src/private/data/secure/defaultEmailCryptoService')

describe('DefaultEmailMessageService Test Suite', () => {
  const mockAppSync = mock<ApiClient>()
  const mockUserClient = mock<SudoUserClient>()
  const mockDeviceKeyWorker = mock<DeviceKeyWorker>()
  const mockS3Client = mock<S3Client>()
  const mockEmailCryptoService = mock<EmailCryptoService>()
  const mockSubscriptionManager =
    mock<
      SubscriptionManager<
        OnEmailMessageDeletedSubscription,
        EmailMessageSubscriber
      >
    >()
  const gunzipSpy = jest.spyOn(zlibAsync, 'gunzipAsync')
  const parseInternetMessageDataSpy = jest.spyOn(
    Rfc822MessageDataProcessor,
    'parseInternetMessageData',
  )
  let instanceUnderTest: DefaultEmailMessageService
  let timestamp: Date
  let mockMessageId: string

  beforeEach(() => {
    reset(mockAppSync)
    reset(mockUserClient)
    reset(mockDeviceKeyWorker)
    reset(mockS3Client)
    reset(mockDeviceKeyWorker)
    reset(mockEmailCryptoService)
    reset(mockSubscriptionManager)
    timestamp = new Date(1)
    mockMessageId = v4()
    instanceUnderTest = new DefaultEmailMessageService(
      instance(mockAppSync),
      instance(mockUserClient),
      instance(mockS3Client),
      instance(mockDeviceKeyWorker),
      identityServiceConfig,
      instance(mockEmailCryptoService),
    )
    when(mockUserClient.getUserClaim(anything())).thenResolve('identityId')
    when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve(
      'symmetricKeyId',
    )
    when(mockDeviceKeyWorker.sealString(anything())).thenResolve('')
    when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
      true,
    )
    when(mockAppSync.sendEmailMessage(anything())).thenResolve({
      id: mockMessageId,
      createdAtEpochMs: timestamp.getMilliseconds(),
    })
    JestMockSubscriptionManager.mockImplementation(() =>
      instance(mockSubscriptionManager),
    )
  })

  describe('sendMessage', () => {
    const emailMessageMaxOutboundMessageSize = 9999999
    const encodedOriginalMessage = stringToArrayBuffer(v4())
    const encodeToInternetMessageBufferSpy = jest.spyOn(
      Rfc822MessageDataProcessor,
      'encodeToInternetMessageBuffer',
    )
    encodeToInternetMessageBufferSpy.mockReturnValueOnce(encodedOriginalMessage)
    let message: EmailMessageDetails
    beforeEach(() => {
      when(mockS3Client.upload(anything())).thenResolve({
        key: v4(),
        lastModified: new Date(),
      })
      message = {
        from: [{ emailAddress: `from-${v4()}@example.com` }],
      }
    })

    it('calls s3 upload', async () => {
      const senderEmailAddressId = v4()
      await instanceUnderTest.sendMessage({
        message,
        senderEmailAddressId,
        emailMessageMaxOutboundMessageSize,
      })

      verify(mockS3Client.upload(anything())).once()
      const [s3Inputs] = capture(mockS3Client.upload).first()
      expect(s3Inputs).toStrictEqual<typeof s3Inputs>({
        bucket: identityServiceConfig.transientBucket,
        region: identityServiceConfig.region,
        key: expect.stringMatching(
          new RegExp(`^identityId\/email\/${senderEmailAddressId}\/.+`),
        ),
        body: arrayBufferToString(encodedOriginalMessage),
      })
    })

    it('calls appsync', async () => {
      const senderEmailAddressId = v4()
      await instanceUnderTest.sendMessage({
        message,
        senderEmailAddressId,
        emailMessageMaxOutboundMessageSize,
      })
      verify(mockAppSync.sendEmailMessage(anything())).once()
      const [appSyncInput] = capture(mockAppSync.sendEmailMessage).first()
      expect(appSyncInput).toStrictEqual<typeof appSyncInput>({
        emailAddressId: senderEmailAddressId,
        message: {
          key: expect.stringMatching(
            new RegExp(`identityId/email/${senderEmailAddressId}/.+`),
          ),
          bucket: identityServiceConfig.transientBucket,
          region: identityServiceConfig.region,
        },
      })
    })

    it('returns result of appsync', async () => {
      const resultId = v4()
      when(mockAppSync.sendEmailMessage(anything())).thenResolve({
        id: resultId,
        createdAtEpochMs: timestamp.getMilliseconds(),
      })
      await expect(
        instanceUnderTest.sendMessage({
          message,
          senderEmailAddressId: '',
          emailMessageMaxOutboundMessageSize,
        }),
      ).resolves.toStrictEqual({ id: resultId, createdAt: timestamp })
    })

    it('respects outgoing message size limit', async () => {
      const limit = 10485769 // 10mb
      encodeToInternetMessageBufferSpy
        .mockReset()
        .mockReturnValueOnce(Buffer.alloc(limit + 1).buffer)

      await expect(
        instanceUnderTest.sendMessage({
          message,
          senderEmailAddressId: v4(),
          emailMessageMaxOutboundMessageSize: limit,
        }),
      ).rejects.toThrow(MessageSizeLimitExceededError)
    })
  })

  describe('sendEncryptedMessage', () => {
    const emailMessageMaxOutboundMessageSize = 9999999
    const encodeToInternetMessageBufferSpy = jest.spyOn(
      Rfc822MessageDataProcessor,
      'encodeToInternetMessageBuffer',
    )
    let message: EmailMessageDetails
    let emailAddressesPublicInfo: EmailAddressPublicInfoEntity[]
    let senderEmailAddressId: string
    let resultId: string
    let securePackage: SecurePackage
    let encodedOriginalMessage: ArrayBuffer
    let encodedEncryptedMessage: ArrayBuffer
    beforeEach(() => {
      encodedOriginalMessage = stringToArrayBuffer(v4())
      encodedEncryptedMessage = stringToArrayBuffer(v4())
      securePackage = new SecurePackage(
        new Set<EmailAttachment>().add({
          filename: 'encryptedKey',
          data: v4(),
          inlineAttachment: false,
          contentTransferEncoding: 'base64',
          mimeType: 'mimeType',
        }),
        {
          filename: 'encryptedBody',
          data: v4(),
          inlineAttachment: false,
          contentTransferEncoding: 'base64',
          mimeType: 'mimeType',
        },
      )
      encodeToInternetMessageBufferSpy
        .mockReturnValueOnce(encodedOriginalMessage) // First call
        .mockReturnValue(encodedEncryptedMessage) // Second call
      when(mockEmailCryptoService.encrypt(anything(), anything())).thenResolve(
        securePackage,
      )
      when(mockS3Client.upload(anything())).thenResolve({
        key: v4(),
        lastModified: new Date(),
      })
      resultId = v4()
      when(mockAppSync.sendEncryptedEmailMessage(anything())).thenResolve({
        id: resultId,
        createdAtEpochMs: timestamp.getMilliseconds(),
      })
      message = {
        from: [{ emailAddress: `from-${v4()}@example.com` }],
      }
      emailAddressesPublicInfo = [
        {
          emailAddress: `to-${v4()}`,
          keyId: `keyID-${v4()}`,
          publicKeyDetails: {
            publicKey: `keyData-${v4()}`,
            keyFormat: PublicKeyFormat.RSAPublicKey,
            algorithm: 'testAlgorithm',
          },
        },
      ]
      senderEmailAddressId = v4()
    })

    it('encodes the original message data', async () => {
      await instanceUnderTest.sendEncryptedMessage({
        message: message,
        senderEmailAddressId: senderEmailAddressId,
        emailAddressesPublicInfo,
        emailMessageMaxOutboundMessageSize,
      })

      // It'll get called twice but we are just checking the first call here
      expect(encodeToInternetMessageBufferSpy).toHaveBeenCalledTimes(2)
      expect(encodeToInternetMessageBufferSpy).toHaveBeenNthCalledWith(
        1,
        message,
        { decodeEncodedFields: true },
      )
    })

    it('encrypts the encoded message data', async () => {
      await instanceUnderTest.sendEncryptedMessage({
        message: message,
        senderEmailAddressId: senderEmailAddressId,
        emailAddressesPublicInfo,
        emailMessageMaxOutboundMessageSize,
      })

      verify(mockEmailCryptoService.encrypt(anything(), anything())).once()
      const [rfc822DataArg, recipientsAndSenderPublicInfoArg] = capture(
        mockEmailCryptoService.encrypt,
      ).first()
      expect(rfc822DataArg).toEqual(encodedOriginalMessage)
      expect(recipientsAndSenderPublicInfoArg).toStrictEqual(
        emailAddressesPublicInfo,
      )
    })

    it('filters out duplicate public keys', async () => {
      const recipientsAndSenderPublicInfoWithDupKey: EmailAddressPublicInfoEntity[] =
        [...emailAddressesPublicInfo, emailAddressesPublicInfo[0]]
      await instanceUnderTest.sendEncryptedMessage({
        message: message,
        senderEmailAddressId: senderEmailAddressId,
        emailAddressesPublicInfo: recipientsAndSenderPublicInfoWithDupKey,
        emailMessageMaxOutboundMessageSize,
      })

      verify(mockEmailCryptoService.encrypt(anything(), anything())).once()
      const [rfc822DataArg, recipientsAndSenderPublicInfoArg] = capture(
        mockEmailCryptoService.encrypt,
      ).first()
      expect(rfc822DataArg).toEqual(encodedOriginalMessage)
      expect(recipientsAndSenderPublicInfoArg).toStrictEqual(
        emailAddressesPublicInfo,
      )
    })

    it('encodes the encrypted message', async () => {
      await instanceUnderTest.sendEncryptedMessage({
        message: message,
        senderEmailAddressId: senderEmailAddressId,
        emailAddressesPublicInfo,
        emailMessageMaxOutboundMessageSize,
      })

      // Here we will check the second call to this
      expect(encodeToInternetMessageBufferSpy).toHaveBeenCalledTimes(2)
      expect(encodeToInternetMessageBufferSpy).toHaveBeenNthCalledWith(2, {
        ...message,
        attachments: securePackage.toArray(),
        encryptionStatus: EncryptionStatus.ENCRYPTED,
      })
    })

    it('uploads the encrypted message to s3', async () => {
      await instanceUnderTest.sendEncryptedMessage({
        message: message,
        senderEmailAddressId: senderEmailAddressId,
        emailAddressesPublicInfo,
        emailMessageMaxOutboundMessageSize,
      })

      verify(mockS3Client.upload(anything())).once()
      const [s3Inputs] = capture(mockS3Client.upload).first()
      expect(s3Inputs).toStrictEqual<typeof s3Inputs>({
        bucket: identityServiceConfig.transientBucket,
        region: identityServiceConfig.region,
        key: expect.stringMatching(
          new RegExp(`^identityId\/email\/${senderEmailAddressId}\/.+`),
        ),
        body: arrayBufferToString(encodedEncryptedMessage),
      })
    })

    it('calls appSync to send the encrypted message', async () => {
      await instanceUnderTest.sendEncryptedMessage({
        message: message,
        senderEmailAddressId: senderEmailAddressId,
        emailAddressesPublicInfo,
        emailMessageMaxOutboundMessageSize,
      })

      verify(mockAppSync.sendEncryptedEmailMessage(anything())).once()
      const [appSyncInput] = capture(
        mockAppSync.sendEncryptedEmailMessage,
      ).first()
      expect(appSyncInput).toStrictEqual<typeof appSyncInput>({
        emailAddressId: senderEmailAddressId,
        message: {
          key: expect.stringMatching(
            new RegExp(`identityId/email/${senderEmailAddressId}/.+`),
          ),
          bucket: identityServiceConfig.transientBucket,
          region: identityServiceConfig.region,
        },
        rfc822Header: {
          from: message.from[0].emailAddress,
          to: message.to?.map((a) => a.emailAddress) ?? [],
          cc: message.cc?.map((a) => a.emailAddress) ?? [],
          bcc: message.bcc?.map((a) => a.emailAddress) ?? [],
          replyTo: message.replyTo?.map((a) => a.emailAddress) ?? [],
          subject: message.subject,
          hasAttachments: false,
          dateEpochMs: expect.any(Number),
        },
      })
    })

    it('returns the result of the appSync call', async () => {
      await expect(
        instanceUnderTest.sendEncryptedMessage({
          message: message,
          senderEmailAddressId: senderEmailAddressId,
          emailAddressesPublicInfo,
          emailMessageMaxOutboundMessageSize,
        }),
      ).resolves.toStrictEqual({ id: resultId, createdAt: timestamp })
    })

    it('respects outgoing message size limit', async () => {
      const limit = 10485769 // 10mb
      encodeToInternetMessageBufferSpy
        .mockReset()
        .mockReturnValueOnce(encodedOriginalMessage) // First call
        .mockReturnValueOnce(Buffer.alloc(limit + 1).buffer) // Second call

      await expect(
        instanceUnderTest.sendEncryptedMessage({
          message,
          senderEmailAddressId: senderEmailAddressId,
          emailAddressesPublicInfo,
          emailMessageMaxOutboundMessageSize: limit,
        }),
      ).rejects.toThrow(MessageSizeLimitExceededError)
    })
  })

  describe('updateMessages', () => {
    it('calls appSync correctly for a single message to update', async () => {
      const ids = [v4()]
      const folderId = v4()
      when(mockAppSync.updateEmailMessages(anything())).thenResolve({
        status: UpdateEmailMessagesStatus.Success,
      })
      const input: UpdateEmailMessagesInput = {
        ids,
        values: { folderId, seen: true },
      }
      const updateEmailMessages = await instanceUnderTest.updateMessages(input)
      expect(updateEmailMessages).toStrictEqual({
        status: UpdateEmailMessagesStatus.Success,
        successMessages: undefined,
        failureMessages: undefined,
      })
      const [inputArgs] = capture(mockAppSync.updateEmailMessages).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        messageIds: ids,
        values: { folderId, seen: true },
      })
      verify(mockAppSync.updateEmailMessages(anything())).once()
    })

    it('calls appSync correctly for multiple messages to update', async () => {
      const ids = [v4(), v4(), v4()]
      const folderId = v4()
      when(mockAppSync.updateEmailMessages(anything())).thenResolve({
        status: UpdateEmailMessagesStatus.Success,
      })
      const input: UpdateEmailMessagesInput = {
        ids,
        values: { folderId, seen: true },
      }
      const updateEmailMessages = await instanceUnderTest.updateMessages(input)
      expect(updateEmailMessages).toStrictEqual({
        status: UpdateEmailMessagesStatus.Success,
        successMessages: undefined,
        failureMessages: undefined,
      })
      const [inputArgs] = capture(mockAppSync.updateEmailMessages).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        messageIds: ids,
        values: { folderId, seen: true },
      })
      verify(mockAppSync.updateEmailMessages(anything())).once()
    })
  })

  describe('getMessages', () => {
    beforeEach(() => {
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        unsealedHeaderDetailsString,
      )
    })

    it('calls appsync correctly', async () => {
      when(mockAppSync.getEmailMessage(anything(), anything())).thenResolve(
        GraphQLDataFactory.sealedEmailMessage,
      )
      const id = v4()
      const result = await instanceUnderTest.getMessage({
        id,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(mockAppSync.getEmailMessage(anything(), anything())).once()
      const [idArg, policyArg] = capture(mockAppSync.getEmailMessage).first()
      expect(idArg).toStrictEqual<typeof idArg>(id)
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(result).toEqual(EntityDataFactory.emailMessage)
    })

    it.each`
      json                                              | name       | expected
      ${unsealedHeaderDetailsHasAttachmentsTrueString}  | ${'true'}  | ${true}
      ${unsealedHeaderDetailsString}                    | ${'false'} | ${false}
      ${unsealedHeaderDetailsHasAttachmentsUnsetString} | ${'unset'} | ${false}
    `(
      'unseals correctly when hasAttachments is $name',
      async ({ json, expected }) => {
        when(mockAppSync.getEmailMessage(anything(), anything())).thenResolve(
          GraphQLDataFactory.sealedEmailMessage,
        )
        when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(json)
        const id = v4()
        const result = await instanceUnderTest.getMessage({
          id,
          cachePolicy: CachePolicy.CacheOnly,
        })
        verify(mockAppSync.getEmailMessage(anything(), anything())).once()
        const [idArg, policyArg] = capture(mockAppSync.getEmailMessage).first()
        expect(idArg).toStrictEqual<typeof idArg>(id)
        expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
        expect(result).toEqual({
          ...EntityDataFactory.emailMessage,
          hasAttachments: expected,
        })
      },
    )

    it.each`
      json                                 | name       | expected
      ${unsealedHeaderDetailsString}       | ${'set'}   | ${new Date(2.0)}
      ${unsealedHeaderDetailsNoDateString} | ${'unset'} | ${undefined}
    `('unseals correctly when date is $name', async ({ json, expected }) => {
      when(mockAppSync.getEmailMessage(anything(), anything())).thenResolve(
        GraphQLDataFactory.sealedEmailMessage,
      )
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(json)
      const id = v4()
      const result = await instanceUnderTest.getMessage({
        id,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(mockAppSync.getEmailMessage(anything(), anything())).once()
      const [idArg, policyArg] = capture(mockAppSync.getEmailMessage).first()
      expect(idArg).toStrictEqual<typeof idArg>(id)
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(result).toEqual({
        ...EntityDataFactory.emailMessage,
        date: expected,
      })
    })

    it('calls appsync correctly with undefined result', async () => {
      when(mockAppSync.getEmailMessage(anything(), anything())).thenResolve(
        undefined,
      )
      const id = v4()
      const result = await instanceUnderTest.getMessage({
        id,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(mockAppSync.getEmailMessage(anything(), anything())).once()
      const [idArg, policyArg] = capture(mockAppSync.getEmailMessage).first()
      expect(idArg).toStrictEqual<typeof idArg>(id)
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(result).toEqual(undefined)
    })

    it.each`
      cachePolicy               | test
      ${CachePolicy.CacheOnly}  | ${'cache'}
      ${CachePolicy.RemoteOnly} | ${'remote'}
    `(
      'returns transformed result when calling $test',
      async ({ cachePolicy }) => {
        when(mockAppSync.getEmailMessage(anything(), anything())).thenResolve(
          GraphQLDataFactory.sealedEmailMessage,
        )
        const id = v4()
        await expect(
          instanceUnderTest.getMessage({
            id,
            cachePolicy,
          }),
        ).resolves.toEqual(EntityDataFactory.emailMessage)
        verify(mockAppSync.getEmailMessage(anything(), anything())).once()
      },
    )
  })

  describe('listMessages', () => {
    beforeEach(() => {
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        unsealedHeaderDetailsString,
      )
    })

    it('calls appsync correctly', async () => {
      when(
        mockAppSync.listEmailMessages(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailMessageConnection)
      const result = await instanceUnderTest.listMessages({
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(
        mockAppSync.listEmailMessages(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
      const [policyArg] = capture(mockAppSync.listEmailMessages).first()
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(result).toStrictEqual({
        emailMessages: [EntityDataFactory.emailMessage],
        nextToken: undefined,
      })
    })

    it.each`
      json                                              | name       | expected
      ${unsealedHeaderDetailsHasAttachmentsTrueString}  | ${'true'}  | ${true}
      ${unsealedHeaderDetailsString}                    | ${'false'} | ${false}
      ${unsealedHeaderDetailsHasAttachmentsUnsetString} | ${'unset'} | ${false}
    `(
      'unseals correctly when hasAttachments is $name',
      async ({ json, expected }) => {
        when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(json)
        when(
          mockAppSync.listEmailMessages(
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
          ),
        ).thenResolve(GraphQLDataFactory.emailMessageConnection)
        const result = await instanceUnderTest.listMessages({
          cachePolicy: CachePolicy.CacheOnly,
        })
        verify(
          mockAppSync.listEmailMessages(
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
          ),
        ).once()
        const [policyArg] = capture(mockAppSync.listEmailMessages).first()
        expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
        expect(result).toStrictEqual({
          emailMessages: [
            {
              ...EntityDataFactory.emailMessage,
              hasAttachments: expected,
            },
          ],
          nextToken: undefined,
        })
      },
    )

    it.each`
      json                                 | name       | expected
      ${unsealedHeaderDetailsString}       | ${'set'}   | ${new Date(2.0)}
      ${unsealedHeaderDetailsNoDateString} | ${'unset'} | ${undefined}
    `('unseals correctly when date is $name', async ({ json, expected }) => {
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(json)
      when(
        mockAppSync.listEmailMessages(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailMessageConnection)
      const result = await instanceUnderTest.listMessages({
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(
        mockAppSync.listEmailMessages(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
      const [policyArg] = capture(mockAppSync.listEmailMessages).first()
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(result).toStrictEqual({
        emailMessages: [
          {
            ...EntityDataFactory.emailMessage,
            date: expected,
          },
        ],
        nextToken: undefined,
      })
    })

    it.each`
      cachePolicy               | test
      ${CachePolicy.CacheOnly}  | ${'cache'}
      ${CachePolicy.RemoteOnly} | ${'remote'}
    `(
      'returns transformed result when calling $test',
      async ({ cachePolicy }) => {
        when(
          mockAppSync.listEmailMessages(
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
          ),
        ).thenResolve(GraphQLDataFactory.emailMessageConnection)
        await expect(
          instanceUnderTest.listMessages({
            cachePolicy,
          }),
        ).resolves.toStrictEqual({
          emailMessages: [EntityDataFactory.emailMessage],
          nextToken: undefined,
        })
        verify(
          mockAppSync.listEmailMessages(
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
          ),
        ).once()
      },
    )

    it.each`
      sortOrder         | test
      ${SortOrder.Asc}  | ${'ascending'}
      ${SortOrder.Desc} | ${'descending'}
    `('returns transformed result ordered $test', async ({ sortOrder }) => {
      when(
        mockAppSync.listEmailMessages(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailMessageConnection)
      await expect(
        instanceUnderTest.listMessages({
          cachePolicy: CachePolicy.CacheOnly,
          sortOrder,
        }),
      ).resolves.toStrictEqual({
        emailMessages: [EntityDataFactory.emailMessage],
        nextToken: undefined,
      })
      verify(
        mockAppSync.listEmailMessages(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
    })

    it('returns result for sortDate date range successfully', async () => {
      when(
        mockAppSync.listEmailMessages(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailMessageConnection)
      const result = await instanceUnderTest.listMessages({
        cachePolicy: CachePolicy.CacheOnly,
        dateRange: {
          sortDate: {
            startDate: new Date(1),
            endDate: new Date(2),
          },
        },
      })
      const [policyArg, dateRangeArg] = capture(
        mockAppSync.listEmailMessages,
      ).first()
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(dateRangeArg).toStrictEqual(<typeof dateRangeArg>{
        sortDateEpochMs: {
          endDateEpochMs: 2,
          startDateEpochMs: 1,
        },
      })
      expect(result).toStrictEqual({
        emailMessages: [EntityDataFactory.emailMessage],
        nextToken: undefined,
      })
      verify(
        mockAppSync.listEmailMessages(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
    })

    it('returns result for updatedAt date range successfully', async () => {
      when(
        mockAppSync.listEmailMessages(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailMessageConnection)
      const result = await instanceUnderTest.listMessages({
        cachePolicy: CachePolicy.CacheOnly,
        dateRange: {
          updatedAt: {
            startDate: new Date(1),
            endDate: new Date(2),
          },
        },
      })
      const [policyArg, dateRangeArg] = capture(
        mockAppSync.listEmailMessages,
      ).first()
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(dateRangeArg).toStrictEqual(<typeof dateRangeArg>{
        updatedAtEpochMs: {
          endDateEpochMs: 2,
          startDateEpochMs: 1,
        },
      })
      verify(
        mockAppSync.listEmailMessages(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
    })

    it('returns result for includeDeletedMessages successfully', async () => {
      when(
        mockAppSync.listEmailMessages(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailMessageConnection)
      const result = await instanceUnderTest.listMessages({
        cachePolicy: CachePolicy.CacheOnly,
        includeDeletedMessages: true,
      })
      const [
        policyArg,
        dateRangeArg,
        limitArg,
        sortOrderArg,
        nextTokenArg,
        includeDeletedMessagesArg,
      ] = capture(mockAppSync.listEmailMessages).first()
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(includeDeletedMessagesArg).toStrictEqual(true)
      verify(
        mockAppSync.listEmailMessages(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
    })
  })

  describe('listMessagesForEmailAddressId', () => {
    beforeEach(() => {
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        unsealedHeaderDetailsString,
      )
    })

    it('calls appsync correctly', async () => {
      when(
        mockAppSync.listEmailMessagesForEmailAddressId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailMessageConnection)
      const emailAddressId = v4()
      const result = await instanceUnderTest.listMessagesForEmailAddressId({
        emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(
        mockAppSync.listEmailMessagesForEmailAddressId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
      const [inputArg, policyArg] = capture(
        mockAppSync.listEmailMessagesForEmailAddressId,
      ).first()
      expect(inputArg).toStrictEqual<typeof inputArg>(emailAddressId)
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(result).toStrictEqual({
        emailMessages: [EntityDataFactory.emailMessage],
        nextToken: undefined,
      })
    })

    it.each`
      json                                              | name       | expected
      ${unsealedHeaderDetailsHasAttachmentsTrueString}  | ${'true'}  | ${true}
      ${unsealedHeaderDetailsString}                    | ${'false'} | ${false}
      ${unsealedHeaderDetailsHasAttachmentsUnsetString} | ${'unset'} | ${false}
    `(
      'unseals correctly when hasAttachments is $name',
      async ({ json, expected }) => {
        when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(json)
        when(
          mockAppSync.listEmailMessagesForEmailAddressId(
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
          ),
        ).thenResolve(GraphQLDataFactory.emailMessageConnection)
        const emailAddressId = v4()
        const result = await instanceUnderTest.listMessagesForEmailAddressId({
          emailAddressId,
          cachePolicy: CachePolicy.CacheOnly,
        })
        verify(
          mockAppSync.listEmailMessagesForEmailAddressId(
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
          ),
        ).once()
        const [inputArg, policyArg] = capture(
          mockAppSync.listEmailMessagesForEmailAddressId,
        ).first()
        expect(inputArg).toStrictEqual<typeof inputArg>(emailAddressId)
        expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
        expect(result).toStrictEqual({
          emailMessages: [
            {
              ...EntityDataFactory.emailMessage,
              hasAttachments: expected,
            },
          ],
          nextToken: undefined,
        })
      },
    )

    it.each`
      json                                 | name       | expected
      ${unsealedHeaderDetailsString}       | ${'set'}   | ${new Date(2.0)}
      ${unsealedHeaderDetailsNoDateString} | ${'unset'} | ${undefined}
    `('unseals correctly when date is $name', async ({ json, expected }) => {
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(json)
      when(
        mockAppSync.listEmailMessagesForEmailAddressId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailMessageConnection)
      const emailAddressId = v4()
      const result = await instanceUnderTest.listMessagesForEmailAddressId({
        emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(
        mockAppSync.listEmailMessagesForEmailAddressId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
      const [inputArg, policyArg] = capture(
        mockAppSync.listEmailMessagesForEmailAddressId,
      ).first()
      expect(inputArg).toStrictEqual<typeof inputArg>(emailAddressId)
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(result).toStrictEqual({
        emailMessages: [
          {
            ...EntityDataFactory.emailMessage,
            date: expected,
          },
        ],
        nextToken: undefined,
      })
    })

    it.each`
      cachePolicy               | test
      ${CachePolicy.CacheOnly}  | ${'cache'}
      ${CachePolicy.RemoteOnly} | ${'remote'}
    `(
      'returns transformed result when calling $test',
      async ({ cachePolicy }) => {
        when(
          mockAppSync.listEmailMessagesForEmailAddressId(
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
          ),
        ).thenResolve(GraphQLDataFactory.emailMessageConnection)
        const emailAddressId = v4()
        await expect(
          instanceUnderTest.listMessagesForEmailAddressId({
            emailAddressId,
            cachePolicy,
          }),
        ).resolves.toStrictEqual({
          emailMessages: [EntityDataFactory.emailMessage],
          nextToken: undefined,
        })
        verify(
          mockAppSync.listEmailMessagesForEmailAddressId(
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
          ),
        ).once()
      },
    )

    it.each`
      sortOrder         | test
      ${SortOrder.Asc}  | ${'ascending'}
      ${SortOrder.Desc} | ${'descending'}
    `('returns transformed result ordered $test', async ({ sortOrder }) => {
      when(
        mockAppSync.listEmailMessagesForEmailAddressId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailMessageConnection)
      const emailAddressId = v4()
      await expect(
        instanceUnderTest.listMessagesForEmailAddressId({
          emailAddressId,
          cachePolicy: CachePolicy.CacheOnly,
          sortOrder,
        }),
      ).resolves.toStrictEqual({
        emailMessages: [EntityDataFactory.emailMessage],
        nextToken: undefined,
      })
      verify(
        mockAppSync.listEmailMessagesForEmailAddressId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
    })

    it('returns result for sortDate date range successfully', async () => {
      when(
        mockAppSync.listEmailMessagesForEmailAddressId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailMessageConnection)
      const emailAddressId = v4()
      const result = await instanceUnderTest.listMessagesForEmailAddressId({
        emailAddressId,
        dateRange: {
          sortDate: {
            startDate: new Date(1),
            endDate: new Date(2),
          },
        },
        cachePolicy: CachePolicy.CacheOnly,
      })
      const [idArg, policyArg, dateRangeArg] = capture(
        mockAppSync.listEmailMessagesForEmailAddressId,
      ).first()
      expect(idArg).toStrictEqual<typeof idArg>(emailAddressId)
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(dateRangeArg).toStrictEqual(<typeof dateRangeArg>{
        sortDateEpochMs: {
          endDateEpochMs: 2,
          startDateEpochMs: 1,
        },
      })
      expect(result).toStrictEqual({
        emailMessages: [EntityDataFactory.emailMessage],
        nextToken: undefined,
      })
      verify(
        mockAppSync.listEmailMessagesForEmailAddressId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
    })

    it('returns result for updatedAt date range successfully', async () => {
      when(
        mockAppSync.listEmailMessagesForEmailAddressId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailMessageConnection)
      const emailAddressId = v4()
      const result = await instanceUnderTest.listMessagesForEmailAddressId({
        emailAddressId,
        dateRange: {
          updatedAt: {
            startDate: new Date(1),
            endDate: new Date(2),
          },
        },
        cachePolicy: CachePolicy.CacheOnly,
      })
      const [idArg, policyArg, dateRangeArg] = capture(
        mockAppSync.listEmailMessagesForEmailAddressId,
      ).first()
      expect(idArg).toStrictEqual<typeof idArg>(emailAddressId)
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(dateRangeArg).toStrictEqual(<typeof dateRangeArg>{
        updatedAtEpochMs: {
          endDateEpochMs: 2,
          startDateEpochMs: 1,
        },
      })
      expect(result).toStrictEqual({
        emailMessages: [EntityDataFactory.emailMessage],
        nextToken: undefined,
      })
      verify(
        mockAppSync.listEmailMessagesForEmailAddressId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
    })

    it('returns result for includeDeletedMessages successfully', async () => {
      when(
        mockAppSync.listEmailMessagesForEmailAddressId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailMessageConnection)
      const emailAddressId = v4()
      const result = await instanceUnderTest.listMessagesForEmailAddressId({
        emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
        includeDeletedMessages: true,
      })
      const [
        idArg,
        policyArg,
        dateRangeArg,
        limitArg,
        sortOrderArg,
        nextTokenArg,
        includeDeletedMessagesArg,
      ] = capture(mockAppSync.listEmailMessagesForEmailAddressId).first()
      expect(idArg).toStrictEqual<typeof idArg>(emailAddressId)
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(includeDeletedMessagesArg).toStrictEqual(true)
      expect(result).toStrictEqual({
        emailMessages: [EntityDataFactory.emailMessage],
        nextToken: undefined,
      })
      verify(
        mockAppSync.listEmailMessagesForEmailAddressId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
    })
  })

  describe('listMessagesForEmailFolderId', () => {
    beforeEach(() => {
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        unsealedHeaderDetailsString,
      )
    })

    it('calls appsync correctly', async () => {
      when(
        mockAppSync.listEmailMessagesForEmailFolderId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailMessageConnection)
      const folderId = v4()
      const result = await instanceUnderTest.listMessagesForEmailFolderId({
        folderId,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(
        mockAppSync.listEmailMessagesForEmailFolderId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
      const [inputArg, policyArg] = capture(
        mockAppSync.listEmailMessagesForEmailFolderId,
      ).first()
      expect(inputArg).toStrictEqual<typeof inputArg>(folderId)
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(result).toStrictEqual({
        emailMessages: [EntityDataFactory.emailMessage],
        nextToken: undefined,
      })
    })

    it.each`
      json                                              | name       | expected
      ${unsealedHeaderDetailsHasAttachmentsTrueString}  | ${'true'}  | ${true}
      ${unsealedHeaderDetailsString}                    | ${'false'} | ${false}
      ${unsealedHeaderDetailsHasAttachmentsUnsetString} | ${'unset'} | ${false}
    `(
      'unseals correctly when hasAttachments is $name',
      async ({ json, expected }) => {
        when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(json)
        when(
          mockAppSync.listEmailMessagesForEmailFolderId(
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
          ),
        ).thenResolve(GraphQLDataFactory.emailMessageConnection)
        const folderId = v4()
        const result = await instanceUnderTest.listMessagesForEmailFolderId({
          folderId,
          cachePolicy: CachePolicy.CacheOnly,
        })
        verify(
          mockAppSync.listEmailMessagesForEmailFolderId(
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
          ),
        ).once()
        const [inputArg, policyArg] = capture(
          mockAppSync.listEmailMessagesForEmailFolderId,
        ).first()
        expect(inputArg).toStrictEqual<typeof inputArg>(folderId)
        expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
        expect(result).toStrictEqual({
          emailMessages: [
            {
              ...EntityDataFactory.emailMessage,
              hasAttachments: expected,
            },
          ],
          nextToken: undefined,
        })
      },
    )

    it.each`
      json                                 | name       | expected
      ${unsealedHeaderDetailsString}       | ${'set'}   | ${new Date(2.0)}
      ${unsealedHeaderDetailsNoDateString} | ${'unset'} | ${undefined}
    `('unseals correctly when date is $name', async ({ json, expected }) => {
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(json)
      when(
        mockAppSync.listEmailMessagesForEmailFolderId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailMessageConnection)
      const folderId = v4()
      const result = await instanceUnderTest.listMessagesForEmailFolderId({
        folderId,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(
        mockAppSync.listEmailMessagesForEmailFolderId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
      const [inputArg, policyArg] = capture(
        mockAppSync.listEmailMessagesForEmailFolderId,
      ).first()
      expect(inputArg).toStrictEqual<typeof inputArg>(folderId)
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(result).toStrictEqual({
        emailMessages: [
          {
            ...EntityDataFactory.emailMessage,
            date: expected,
          },
        ],
        nextToken: undefined,
      })
    })

    it.each`
      cachePolicy               | test
      ${CachePolicy.CacheOnly}  | ${'cache'}
      ${CachePolicy.RemoteOnly} | ${'remote'}
    `(
      'returns transformed result when calling $test',
      async ({ cachePolicy }) => {
        when(
          mockAppSync.listEmailMessagesForEmailFolderId(
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
          ),
        ).thenResolve(GraphQLDataFactory.emailMessageConnection)
        const folderId = v4()
        await expect(
          instanceUnderTest.listMessagesForEmailFolderId({
            folderId,
            cachePolicy,
          }),
        ).resolves.toStrictEqual({
          emailMessages: [EntityDataFactory.emailMessage],
          nextToken: undefined,
        })
        verify(
          mockAppSync.listEmailMessagesForEmailFolderId(
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
          ),
        ).once()
      },
    )

    it.each`
      sortOrder         | test
      ${SortOrder.Asc}  | ${'ascending'}
      ${SortOrder.Desc} | ${'descending'}
    `('returns transformed result ordered $test', async ({ sortOrder }) => {
      when(
        mockAppSync.listEmailMessagesForEmailFolderId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailMessageConnection)
      const folderId = v4()
      await expect(
        instanceUnderTest.listMessagesForEmailFolderId({
          folderId,
          cachePolicy: CachePolicy.CacheOnly,
          sortOrder,
        }),
      ).resolves.toStrictEqual({
        emailMessages: [EntityDataFactory.emailMessage],
        nextToken: undefined,
      })
      verify(
        mockAppSync.listEmailMessagesForEmailFolderId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
    })

    it('returns result for sortDate date range successfully', async () => {
      when(
        mockAppSync.listEmailMessagesForEmailFolderId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailMessageConnection)
      const folderId = v4()
      const result = await instanceUnderTest.listMessagesForEmailFolderId({
        folderId,
        dateRange: {
          sortDate: {
            startDate: new Date(1),
            endDate: new Date(2),
          },
        },
        cachePolicy: CachePolicy.CacheOnly,
      })
      const [idArg, policyArg, dateRangeArg] = capture(
        mockAppSync.listEmailMessagesForEmailFolderId,
      ).first()
      expect(idArg).toStrictEqual<typeof idArg>(folderId)
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(dateRangeArg).toStrictEqual(<typeof dateRangeArg>{
        sortDateEpochMs: {
          endDateEpochMs: 2,
          startDateEpochMs: 1,
        },
      })
      expect(result).toStrictEqual({
        emailMessages: [EntityDataFactory.emailMessage],
        nextToken: undefined,
      })
      verify(
        mockAppSync.listEmailMessagesForEmailFolderId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
    })

    it('returns result for updatedAt date range successfully', async () => {
      when(
        mockAppSync.listEmailMessagesForEmailFolderId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailMessageConnection)
      const folderId = v4()
      const result = await instanceUnderTest.listMessagesForEmailFolderId({
        folderId,
        dateRange: {
          updatedAt: {
            startDate: new Date(1),
            endDate: new Date(2),
          },
        },
        cachePolicy: CachePolicy.CacheOnly,
      })
      const [idArg, policyArg, dateRangeArg] = capture(
        mockAppSync.listEmailMessagesForEmailFolderId,
      ).first()
      expect(idArg).toStrictEqual<typeof idArg>(folderId)
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(dateRangeArg).toStrictEqual(<typeof dateRangeArg>{
        updatedAtEpochMs: {
          endDateEpochMs: 2,
          startDateEpochMs: 1,
        },
      })
      verify(
        mockAppSync.listEmailMessagesForEmailFolderId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
    })

    it('returns result for includeDeletedMessages successfully', async () => {
      when(
        mockAppSync.listEmailMessagesForEmailFolderId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailMessageConnection)
      const folderId = v4()
      const result = await instanceUnderTest.listMessagesForEmailFolderId({
        folderId,
        cachePolicy: CachePolicy.CacheOnly,
        includeDeletedMessages: true,
      })
      const [
        idArg,
        policyArg,
        dateRangeArg,
        limitArg,
        sortOrderArg,
        nextTokenArg,
        includeDeletedMessagesArg,
      ] = capture(mockAppSync.listEmailMessagesForEmailFolderId).first()
      expect(idArg).toStrictEqual<typeof idArg>(folderId)
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(includeDeletedMessagesArg).toStrictEqual(true)
      expect(result).toStrictEqual({
        emailMessages: [EntityDataFactory.emailMessage],
        nextToken: undefined,
      })
      verify(
        mockAppSync.listEmailMessagesForEmailFolderId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
    })
  })

  describe('saveDraft', () => {
    it('throws error if symmetric key does not exist', async () => {
      when(mockS3Client.upload(anything())).thenResolve({
        key: '',
        lastModified: new Date(),
      })
      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve(
        undefined,
      )
      await expect(
        instanceUnderTest.saveDraft({
          rfc822Data: stringToArrayBuffer(''),
          senderEmailAddressId: '',
        }),
      ).rejects.toThrow(new KeyNotFoundError('Symmetric key not found'))
      verify(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).once()
    })

    it.each`
      claim        | testName
      ${undefined} | ${'not found'}
      ${1}         | ${'not a string'}
      ${''}        | ${'is empty string'}
    `('throws an error if identity id claim $testName', async ({ claim }) => {
      when(mockUserClient.getUserClaim(anything())).thenResolve(claim)
      await expect(
        instanceUnderTest.saveDraft({
          rfc822Data: stringToArrayBuffer(''),
          senderEmailAddressId: '',
        }),
      ).rejects.toThrow(new InternalError('Unable to find identity id'))
    })

    it('calls the deviceKeyWorker to seal the input rfc with current key', async () => {
      when(mockS3Client.upload(anything())).thenResolve({
        key: '',
        lastModified: new Date(),
      })
      const rfc822Data = stringToArrayBuffer(v4())
      const senderEmailAddressId = v4()
      await instanceUnderTest.saveDraft({
        rfc822Data,
        senderEmailAddressId,
      })
      verify(mockDeviceKeyWorker.sealString(anything())).once()
      const [args] = capture(mockDeviceKeyWorker.sealString).first()
      expect(args).toStrictEqual<typeof args>({
        payload: rfc822Data,
        keyType: KeyType.SymmetricKey,
        keyId: 'symmetricKeyId',
      })
    })

    it('uses the non-transient bucket to upload to s3', async () => {
      when(mockS3Client.upload(anything())).thenResolve({
        key: '',
        lastModified: new Date(),
      })
      const rfc822Data = stringToArrayBuffer(v4())
      const senderEmailAddressId = v4()
      await instanceUnderTest.saveDraft({
        rfc822Data,
        senderEmailAddressId,
      })
      const [uploadArgs] = capture(mockS3Client.upload).first()
      verify(mockS3Client.upload(anything())).once()
      expect(uploadArgs.body).toStrictEqual('')
    })
  })

  describe('deleteEmailMessages', () => {
    it('deletes a single message successfully', async () => {
      when(mockAppSync.deleteEmailMessages(anything())).thenResolve([])
      await expect(
        instanceUnderTest.deleteMessages({ ids: ['1'] }),
      ).resolves.toStrictEqual<string[]>([])
    })

    it('deletes multiple messages successfully', async () => {
      when(mockAppSync.deleteEmailMessages(anything())).thenResolve([])
      await expect(
        instanceUnderTest.deleteMessages({ ids: ['1', '2', '3', '4'] }),
      ).resolves.toStrictEqual<string[]>([])
    })
  })

  describe('getDraft', () => {
    it('gets draft successfully', async () => {
      when(mockS3Client.download(anything())).thenResolve(
        DraftEmailMessageDataFactory.s3ClientDownloadOutput,
      )
      const unsealedDraft = 'unsealedDraft'
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        unsealedDraft,
      )
      await expect(
        instanceUnderTest.getDraft(DraftEmailMessageDataFactory.getDraftInput),
      ).resolves.toEqual<DraftEmailMessageEntity>({
        id: DraftEmailMessageDataFactory.getDraftInput.id,
        emailAddressId:
          DraftEmailMessageDataFactory.getDraftInput.emailAddressId,
        updatedAt:
          DraftEmailMessageDataFactory.s3ClientDownloadOutput.lastModified,
        rfc822Data: BufferUtil.fromString(unsealedDraft),
      })

      verify(mockS3Client.download(anything())).once()
      verify(mockDeviceKeyWorker.unsealString(anything())).once()
      expect(parseInternetMessageDataSpy).toHaveBeenCalledTimes(0)
      verify(mockEmailCryptoService.decrypt(anything())).never()
    })

    it('returns undefined if s3 download throws NoSuchKey', async () => {
      when(mockS3Client.download(anything())).thenThrow(
        new S3DownloadError({
          key: 'testKey',
          msg: 'test error',
          code: S3Error.NoSuchKey,
        }),
      )
      await expect(
        instanceUnderTest.getDraft(DraftEmailMessageDataFactory.getDraftInput),
      ).resolves.toBeUndefined()

      verify(mockS3Client.download(anything())).once()
      verify(mockDeviceKeyWorker.unsealString(anything())).never()
      expect(parseInternetMessageDataSpy).toHaveBeenCalledTimes(0)
      verify(mockEmailCryptoService.decrypt(anything())).never()
    })

    it('throws error if s3 download throws error other than NoSuchKey', async () => {
      when(mockS3Client.download(anything())).thenThrow(
        new S3DownloadError({
          key: 'testKey',
          msg: 'test error',
          code: S3Error.NoSuchKey + 1,
        }),
      )
      await expect(
        instanceUnderTest.getDraft(DraftEmailMessageDataFactory.getDraftInput),
      ).rejects.toThrow('test error')

      verify(mockS3Client.download(anything())).once()
      verify(mockDeviceKeyWorker.unsealString(anything())).never()
      expect(parseInternetMessageDataSpy).toHaveBeenCalledTimes(0)
      verify(mockEmailCryptoService.decrypt(anything())).never()
    })

    it('throws error if no s3 keyId in metadata', async () => {
      when(mockS3Client.download(anything())).thenResolve({
        lastModified: new Date(),
        body: DraftEmailMessageDataFactory.s3ClientDownloadOutput.body,
      })
      await expect(
        instanceUnderTest.getDraft(DraftEmailMessageDataFactory.getDraftInput),
      ).rejects.toThrow(
        new InternalError('No sealed keyId associated with s3 object'),
      )

      verify(mockS3Client.download(anything())).once()
      verify(mockDeviceKeyWorker.unsealString(anything())).never()
      expect(parseInternetMessageDataSpy).toHaveBeenCalledTimes(0)
      verify(mockEmailCryptoService.decrypt(anything())).never()
    })

    it('throws error if no algorithm in metadata', async () => {
      when(mockS3Client.download(anything())).thenResolve({
        lastModified: new Date(),
        body: DraftEmailMessageDataFactory.s3ClientDownloadOutput.body,
        metadata: { 'key-id': 'testKeyId' },
      })
      await expect(
        instanceUnderTest.getDraft(DraftEmailMessageDataFactory.getDraftInput),
      ).rejects.toThrow(
        new InternalError('No sealed algorithm associated with s3 object'),
      )

      verify(mockS3Client.download(anything())).once()
      verify(mockDeviceKeyWorker.unsealString(anything())).never()
      expect(parseInternetMessageDataSpy).toHaveBeenCalledTimes(0)
      verify(mockEmailCryptoService.decrypt(anything())).never()
    })

    describe('E2EE path', () => {
      const dummyUnsealedWithBodyContentId = `content_${SecureEmailAttachmentType.BODY.contentId}`
      const unsealedDraft = 'unsealedDraft'
      beforeEach(() => {
        when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
          dummyUnsealedWithBodyContentId,
        )
        parseInternetMessageDataSpy.mockResolvedValue(
          EmailMessageRfc822DataFactory.emailMessageDetails({
            attachments: SecurePackageDataFactory.securePackage().toArray(),
          }),
        )
        when(mockEmailCryptoService.decrypt(anything())).thenResolve(
          stringToArrayBuffer(unsealedDraft),
        )
      })

      it('gets draft successfully', async () => {
        when(mockS3Client.download(anything())).thenResolve(
          DraftEmailMessageDataFactory.s3ClientDownloadOutput,
        )
        await expect(
          instanceUnderTest.getDraft(
            DraftEmailMessageDataFactory.getDraftInput,
          ),
        ).resolves.toEqual<DraftEmailMessageEntity>({
          id: DraftEmailMessageDataFactory.getDraftInput.id,
          emailAddressId:
            DraftEmailMessageDataFactory.getDraftInput.emailAddressId,
          updatedAt:
            DraftEmailMessageDataFactory.s3ClientDownloadOutput.lastModified,
          rfc822Data: BufferUtil.fromString(unsealedDraft),
        })

        verify(mockS3Client.download(anything())).once()
        verify(mockDeviceKeyWorker.unsealString(anything())).once()
        expect(parseInternetMessageDataSpy).toHaveBeenCalledTimes(1)
        verify(mockEmailCryptoService.decrypt(anything())).once()
      })

      it('throws DecodeError if no attachments found', async () => {
        when(mockS3Client.download(anything())).thenResolve(
          DraftEmailMessageDataFactory.s3ClientDownloadOutput,
        )
        parseInternetMessageDataSpy.mockResolvedValue(
          EmailMessageRfc822DataFactory.emailMessageDetails(),
        )

        await expect(
          instanceUnderTest.getDraft(
            DraftEmailMessageDataFactory.getDraftInput,
          ),
        ).rejects.toBeInstanceOf(DecodeError)

        verify(mockS3Client.download(anything())).once()
        verify(mockDeviceKeyWorker.unsealString(anything())).once()
        expect(parseInternetMessageDataSpy).toHaveBeenCalledTimes(1)
        verify(mockEmailCryptoService.decrypt(anything())).never()
      })

      it('throws DecodeError if keyAttachments not found', async () => {
        when(mockS3Client.download(anything())).thenResolve(
          DraftEmailMessageDataFactory.s3ClientDownloadOutput,
        )
        parseInternetMessageDataSpy.mockResolvedValue(
          EmailMessageRfc822DataFactory.emailMessageDetails({
            attachments: [
              SecurePackageDataFactory.securePackage().getBodyAttachment(),
            ],
          }),
        )

        await expect(
          instanceUnderTest.getDraft(
            DraftEmailMessageDataFactory.getDraftInput,
          ),
        ).rejects.toBeInstanceOf(DecodeError)

        verify(mockS3Client.download(anything())).once()
        verify(mockDeviceKeyWorker.unsealString(anything())).once()
        expect(parseInternetMessageDataSpy).toHaveBeenCalledTimes(1)
        verify(mockEmailCryptoService.decrypt(anything())).never()
      })

      it('throws DecodeError if body attachment not found', async () => {
        when(mockS3Client.download(anything())).thenResolve(
          DraftEmailMessageDataFactory.s3ClientDownloadOutput,
        )
        parseInternetMessageDataSpy.mockResolvedValue(
          EmailMessageRfc822DataFactory.emailMessageDetails({
            attachments:
              SecurePackageDataFactory.securePackage().getKeyAttachments(),
          }),
        )

        await expect(
          instanceUnderTest.getDraft(
            DraftEmailMessageDataFactory.getDraftInput,
          ),
        ).rejects.toBeInstanceOf(DecodeError)

        verify(mockS3Client.download(anything())).once()
        verify(mockDeviceKeyWorker.unsealString(anything())).once()
        expect(parseInternetMessageDataSpy).toHaveBeenCalledTimes(1)
        verify(mockEmailCryptoService.decrypt(anything())).never()
      })
    })
  })

  describe('listDraftsMetadataForEmailAddressId', () => {
    it('lists drafts successfully', async () => {
      const emailAddressId = 'emailAddressId'
      const drafts: S3ClientListOutput[] = [
        { key: 'draft1', lastModified: new Date(1) },
        { key: 'draft2', lastModified: new Date(2) },
        { key: 'draft3', lastModified: new Date(3) },
      ]
      when(mockS3Client.list(anything())).thenResolve(drafts)
      await expect(
        instanceUnderTest.listDraftsMetadataForEmailAddressId({
          emailAddressId,
        }),
      ).resolves.toEqual<DraftEmailMessageMetadataEntity[]>(
        drafts.map((s3) => ({
          id: s3.key,
          emailAddressId,
          updatedAt: s3.lastModified,
        })),
      )
    })

    it('removes key prefix correctly', async () => {
      const draftEmailMessage = 'draftEmailMessage'
      const drafts = DraftEmailMessageDataFactory.listDraftsWithPrefix(
        'identityId',
        'emailAddressId',
        draftEmailMessage,
        3,
      )
      when(mockS3Client.list(anything())).thenResolve(drafts)
      const listOfDrafts =
        await instanceUnderTest.listDraftsMetadataForEmailAddressId({
          emailAddressId: 'emailAddressId',
        })

      listOfDrafts.forEach((draft, i) => {
        expect(draft.id).toStrictEqual(`${draftEmailMessage}${i}`)
      })
    })
  })

  describe('deleteDrafts', () => {
    it('deletes draft successfully', async () => {
      const draftIdToDelete = 'draftIdToDelete'
      when(mockS3Client.bulkDelete(anything())).thenResolve([])
      await expect(
        instanceUnderTest.deleteDrafts({
          ids: [draftIdToDelete],
          emailAddressId: 'emailAddressId',
        }),
      ).resolves.toStrictEqual([])
    })

    it('deletes multiple drafts successfully', async () => {
      const draftIdsToDelete = [v4(), v4()]
      when(mockS3Client.bulkDelete(anything())).thenResolve([])
      await expect(
        instanceUnderTest.deleteDrafts({
          ids: draftIdsToDelete,
          emailAddressId: 'emailAddressId',
        }),
      ).resolves.toStrictEqual([])
    })

    it('throws EmailMessageServiceDeleteDraftsError if s3 delete throws S3BulkDeleteError', async () => {
      when(mockS3Client.bulkDelete(anything())).thenThrow(
        new S3BulkDeleteError({ keys: ['deleteKey'] }),
      )
      await expect(
        instanceUnderTest.deleteDrafts({
          ids: ['draftIdToDelete'],
          emailAddressId: 'emailAddressId',
        }),
      ).rejects.toThrow(
        new EmailMessageServiceDeleteDraftsError(
          ['deleteKey'],
          'Failed to delete Keys: deleteKey',
        ),
      )
    })

    it('rethrows error if s3 delete throws other than S3DeleteError', async () => {
      when(mockS3Client.bulkDelete(anything())).thenThrow(
        new InternalError('delete error'),
      )
      await expect(
        instanceUnderTest.deleteDrafts({
          ids: ['draftIdToDelete'],
          emailAddressId: 'emailAddressId',
        }),
      ).rejects.toThrow(new InternalError('delete error'))
    })
  })

  describe('scheduleSendDraftMessage', () => {
    let sendAt: Date
    let mockSymmetricKey: ArrayBuffer

    beforeEach(() => {
      sendAt = DateTime.now().plus({ day: 1 }).toJSDate()
      mockSymmetricKey = stringToArrayBuffer(v4())

      when(mockS3Client.getHeadObjectData(anything())).thenResolve(
        DraftEmailMessageDataFactory.s3ClientDownloadOutput,
      )
      when(mockDeviceKeyWorker.getKeyData(anything(), anything())).thenResolve(
        mockSymmetricKey,
      )
      when(mockAppSync.scheduleSendDraftMessage(anything())).thenResolve(
        GraphQLDataFactory.scheduledDraftMessage,
      )
    })

    it('throws MessageNotFoundError is getHeadObjectData returns nothing', async () => {
      when(mockS3Client.getHeadObjectData(anything())).thenResolve(undefined)

      await expect(
        instanceUnderTest.scheduleSendDraftMessage({
          id: EntityDataFactory.scheduledDraftMessage.id,
          emailAddressId:
            EntityDataFactory.scheduledDraftMessage.emailAddressId,
          sendAt,
        }),
      ).rejects.toThrow(MessageNotFoundError)

      verify(mockS3Client.getHeadObjectData(anything())).once()
      verify(mockDeviceKeyWorker.getKeyData(anything(), anything())).never()
      verify(mockAppSync.scheduleSendDraftMessage(anything())).never()
    })

    it('throws MessageNotFoundError if getHeadObjectData throws NoSuchKey error', async () => {
      when(mockS3Client.getHeadObjectData(anything())).thenReject(
        new S3GetHeadObjectDataError({
          code: S3Error.NoSuchKey,
          key: 'key',
        }),
      )

      await expect(
        instanceUnderTest.scheduleSendDraftMessage({
          id: EntityDataFactory.scheduledDraftMessage.id,
          emailAddressId:
            EntityDataFactory.scheduledDraftMessage.emailAddressId,
          sendAt,
        }),
      ).rejects.toThrow(MessageNotFoundError)

      verify(mockS3Client.getHeadObjectData(anything())).once()
      verify(mockDeviceKeyWorker.getKeyData(anything(), anything())).never()
      verify(mockAppSync.scheduleSendDraftMessage(anything())).never()
    })

    it('passes on other S3GetHeadObjetDataError if thrown', async () => {
      when(mockS3Client.getHeadObjectData(anything())).thenReject(
        new S3GetHeadObjectDataError({
          key: 'key',
        }),
      )

      await expect(
        instanceUnderTest.scheduleSendDraftMessage({
          id: EntityDataFactory.scheduledDraftMessage.id,
          emailAddressId:
            EntityDataFactory.scheduledDraftMessage.emailAddressId,
          sendAt,
        }),
      ).rejects.toThrow(S3GetHeadObjectDataError)

      verify(mockS3Client.getHeadObjectData(anything())).once()
      verify(mockDeviceKeyWorker.getKeyData(anything(), anything())).never()
      verify(mockAppSync.scheduleSendDraftMessage(anything())).never()
    })

    it('throws InternalError if no keyId found', async () => {
      when(mockS3Client.getHeadObjectData(anything())).thenResolve({
        ...DraftEmailMessageDataFactory.s3ClientDownloadOutput,
        metadata: {
          algorithm: 'AES/CBC/PKCS7Padding',
        },
      })

      await expect(
        instanceUnderTest.scheduleSendDraftMessage({
          id: EntityDataFactory.scheduledDraftMessage.id,
          emailAddressId:
            EntityDataFactory.scheduledDraftMessage.emailAddressId,
          sendAt,
        }),
      ).rejects.toThrow(InternalError)

      verify(mockS3Client.getHeadObjectData(anything())).once()
      verify(mockDeviceKeyWorker.getKeyData(anything(), anything())).never()
      verify(mockAppSync.scheduleSendDraftMessage(anything())).never()
    })

    it('throws InternalError if no algorithm found', async () => {
      when(mockS3Client.getHeadObjectData(anything())).thenResolve({
        ...DraftEmailMessageDataFactory.s3ClientDownloadOutput,
        metadata: {
          'key-id': 'testKeyId',
        },
      })

      await expect(
        instanceUnderTest.scheduleSendDraftMessage({
          id: EntityDataFactory.scheduledDraftMessage.id,
          emailAddressId:
            EntityDataFactory.scheduledDraftMessage.emailAddressId,
          sendAt,
        }),
      ).rejects.toThrow(InternalError)

      verify(mockS3Client.getHeadObjectData(anything())).once()
      verify(mockDeviceKeyWorker.getKeyData(anything(), anything())).never()
      verify(mockAppSync.scheduleSendDraftMessage(anything())).never()
    })

    it('throws UnsupportedKeyTypeError if key is not symmetric', async () => {
      when(mockS3Client.getHeadObjectData(anything())).thenResolve({
        ...DraftEmailMessageDataFactory.s3ClientDownloadOutput,
        metadata: {
          'key-id': 'testKeyId',
          algorithm: 'otherAlgorithm',
        },
      })

      await expect(
        instanceUnderTest.scheduleSendDraftMessage({
          id: EntityDataFactory.scheduledDraftMessage.id,
          emailAddressId:
            EntityDataFactory.scheduledDraftMessage.emailAddressId,
          sendAt,
        }),
      ).rejects.toThrow(UnsupportedKeyTypeError)

      verify(mockS3Client.getHeadObjectData(anything())).once()
      verify(mockDeviceKeyWorker.getKeyData(anything(), anything())).never()
      verify(mockAppSync.scheduleSendDraftMessage(anything())).never()
    })

    it('throws KeyNotFoundError if symmetric key not found', async () => {
      when(mockDeviceKeyWorker.getKeyData(anything(), anything())).thenResolve(
        undefined,
      )

      await expect(
        instanceUnderTest.scheduleSendDraftMessage({
          id: EntityDataFactory.scheduledDraftMessage.id,
          emailAddressId:
            EntityDataFactory.scheduledDraftMessage.emailAddressId,
          sendAt,
        }),
      ).rejects.toThrow(KeyNotFoundError)

      verify(mockS3Client.getHeadObjectData(anything())).once()
      verify(mockDeviceKeyWorker.getKeyData(anything(), anything())).once()
      verify(mockAppSync.scheduleSendDraftMessage(anything())).never()
    })

    it('returns expected result on success', async () => {
      const result = await instanceUnderTest.scheduleSendDraftMessage({
        id: EntityDataFactory.scheduledDraftMessage.id,
        emailAddressId: EntityDataFactory.scheduledDraftMessage.emailAddressId,
        sendAt,
      })

      expect(result).toBeDefined()
      expect(result).toStrictEqual(EntityDataFactory.scheduledDraftMessage)

      verify(mockS3Client.getHeadObjectData(anything())).once()
      verify(mockDeviceKeyWorker.getKeyData(anything(), anything())).once()
      verify(mockAppSync.scheduleSendDraftMessage(anything())).once()
    })

    it('passes correct arguments to appSync', async () => {
      const { id, emailAddressId } = EntityDataFactory.scheduledDraftMessage
      await instanceUnderTest.scheduleSendDraftMessage({
        id,
        emailAddressId,
        sendAt,
      })

      verify(mockS3Client.getHeadObjectData(anything())).once()
      verify(mockDeviceKeyWorker.getKeyData(anything(), anything())).once()
      verify(mockAppSync.scheduleSendDraftMessage(anything())).once()
      const [scheduleArgs] = capture(
        mockAppSync.scheduleSendDraftMessage,
      ).first()
      expect(scheduleArgs).toStrictEqual<typeof scheduleArgs>({
        draftMessageKey: `identityId/email/${emailAddressId}/draft/${id}`,
        emailAddressId,
        sendAtEpochMs: sendAt.getTime(),
        symmetricKey: Base64.encode(mockSymmetricKey),
      })
    })
  })

  describe('cancelScheduledDraftMessage', () => {
    beforeEach(() => {
      when(mockAppSync.cancelScheduledDraftMessage(anything())).thenResolve(
        GraphQLDataFactory.scheduledDraftMessage.draftMessageKey,
      )
    })

    it('returns expected result on success', async () => {
      const result = await instanceUnderTest.cancelScheduledDraftMessage({
        id: EntityDataFactory.scheduledDraftMessage.id,
        emailAddressId: EntityDataFactory.scheduledDraftMessage.emailAddressId,
      })

      expect(result).toEqual(EntityDataFactory.scheduledDraftMessage.id)
    })

    it('passes correct arguments to appSync', async () => {
      const { id, emailAddressId } = EntityDataFactory.scheduledDraftMessage
      await instanceUnderTest.cancelScheduledDraftMessage({
        id,
        emailAddressId,
      })

      verify(mockAppSync.cancelScheduledDraftMessage(anything())).once()
      const [cancelArgs] = capture(
        mockAppSync.cancelScheduledDraftMessage,
      ).first()
      expect(cancelArgs).toStrictEqual<typeof cancelArgs>({
        draftMessageKey: `identityId/email/${emailAddressId}/draft/${id}`,
        emailAddressId,
      })
    })
  })

  describe('listScheduledDraftMessagesForEmailAddressId', () => {
    beforeEach(() => {
      when(
        mockAppSync.listScheduledDraftMessagesForEmailAddressId(
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.scheduledDraftMessageConnection)
    })

    it('returns expected result on success', async () => {
      const result =
        await instanceUnderTest.listScheduledDraftMessagesForEmailAddressId({
          emailAddressId: EntityDataFactory.emailAccount.id,
        })

      expect(result).toEqual<typeof result>({
        scheduledDraftMessages: [EntityDataFactory.scheduledDraftMessage],
        nextToken: undefined,
      })
    })

    it('passes correct arguments to appSync', async () => {
      const { emailAddressId } = EntityDataFactory.scheduledDraftMessage
      const filter = {
        state: {
          notEqual: ScheduledDraftMessageState.CANCELLED,
        },
      }
      const limit = 5
      const nextToken = 'dummyToken'
      await instanceUnderTest.listScheduledDraftMessagesForEmailAddressId({
        emailAddressId,
        filter,
        limit,
        nextToken,
      })

      verify(
        mockAppSync.listScheduledDraftMessagesForEmailAddressId(
          anything(),
          anything(),
        ),
      ).once()
      const [listArgs] = capture(
        mockAppSync.listScheduledDraftMessagesForEmailAddressId,
      ).first()
      expect(listArgs).toStrictEqual<typeof listArgs>({
        emailAddressId,
        filter: {
          state: {
            ne: ScheduledDraftMessageStateGql.Cancelled,
          },
        },
        limit,
        nextToken,
      })
    })
  })

  describe('getEmailMessageWithBody', () => {
    it('calls getEmailMessageRfc822Data with the same arguments', async () => {
      const mockEmailMessageRfc822Data = jest
        .spyOn(instanceUnderTest, 'getEmailMessageRfc822Data')
        .mockResolvedValue(stringToArrayBuffer('dummy-data'))
      await instanceUnderTest.getEmailMessageWithBody(
        EmailMessageRfc822DataFactory.getEmailMessageInput,
      )

      expect(mockEmailMessageRfc822Data).toHaveBeenCalledTimes(1)
      expect(mockEmailMessageRfc822Data).toHaveBeenCalledWith(
        EmailMessageRfc822DataFactory.getEmailMessageInput,
      )
    })

    it('returns undefined if getEmailMessageRfc822Data returns undefined', async () => {
      const mockEmailMessageRfc822Data = jest
        .spyOn(instanceUnderTest, 'getEmailMessageRfc822Data')
        .mockResolvedValue(undefined)
      const result = await instanceUnderTest.getEmailMessageWithBody(
        EmailMessageRfc822DataFactory.getEmailMessageInput,
      )

      expect(result).toBeUndefined()
    })

    it('passes result from getEmailMessageRfc822Data to parseInternetMessageData and returns proper values', async () => {
      const mockEmailMessageRfc822Data = jest
        .spyOn(instanceUnderTest, 'getEmailMessageRfc822Data')
        .mockResolvedValue(stringToArrayBuffer('dummy-data'))
      const body = 'mockBody'
      parseInternetMessageDataSpy.mockResolvedValueOnce({
        from: [{ emailAddress: 'example@example.com' }],
        body,
        attachments: [],
        inlineAttachments: [],
      })
      const result = await instanceUnderTest.getEmailMessageWithBody(
        EmailMessageRfc822DataFactory.getEmailMessageInput,
      )
      expect(result).toStrictEqual({
        id: EmailMessageRfc822DataFactory.getEmailMessageInput.id,
        body: body,
        attachments: [],
        inlineAttachments: [],
      })
    })
  })

  describe('getEmailMessageRfc822Data', () => {
    const unsealedDraft = Base64.encodeString('unsealedDraft')
    beforeEach(() => {
      when(mockS3Client.download(anything())).thenResolve(
        EmailMessageRfc822DataFactory.s3ClientDownloadOutput,
      )
      when(mockAppSync.getEmailMessage(anything())).thenResolve(
        GraphQLDataFactory.sealedEmailMessage,
      )
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        unsealedDraft,
      )
    })
    it('gets rfc822 data successfully', async () => {
      await expect(
        instanceUnderTest.getEmailMessageRfc822Data(
          EmailMessageRfc822DataFactory.getEmailMessageInput,
        ),
      ).resolves.toStrictEqual(stringToArrayBuffer(unsealedDraft))

      const [s3DownloadArg] = capture(mockS3Client.download).first()
      expect(s3DownloadArg).toEqual({
        bucket: 'bucket',
        region: 'region',
        key: 'identityId/email/testEmailAddressId/testId-testKeyId',
      })
      verify(mockS3Client.download(anything())).once()

      const [idArg, fetchPolicyArg] = capture(
        mockAppSync.getEmailMessage,
      ).first()
      expect(idArg).toStrictEqual(
        EmailMessageRfc822DataFactory.getEmailMessageInput.id,
      )
      expect(fetchPolicyArg).toBeUndefined()
      verify(mockAppSync.getEmailMessage(anything())).once()
      expect(gunzipSpy).toHaveBeenCalledTimes(0)
    })

    it('calls gunzip if content is zipped', async () => {
      when(mockS3Client.download(anything())).thenResolve({
        ...EmailMessageRfc822DataFactory.s3ClientDownloadOutput,
        contentEncoding:
          'sudoplatform-compression, sudoplatform-crypto, sudoplatform-binary-data',
      })
      gunzipSpy.mockResolvedValueOnce(stringToArrayBuffer(unsealedDraft))

      const returnedValue = await instanceUnderTest.getEmailMessageRfc822Data(
        EmailMessageRfc822DataFactory.getEmailMessageInput,
      )
      expect(arrayBufferToString(returnedValue!)).toEqual(unsealedDraft)

      const [s3DownloadArg] = capture(mockS3Client.download).first()
      expect(s3DownloadArg).toEqual({
        bucket: 'bucket',
        region: 'region',
        key: 'identityId/email/testEmailAddressId/testId-testKeyId',
      })
      verify(mockS3Client.download(anything())).once()

      const [idArg, fetchPolicyArg] = capture(
        mockAppSync.getEmailMessage,
      ).first()
      expect(idArg).toStrictEqual(
        EmailMessageRfc822DataFactory.getEmailMessageInput.id,
      )
      expect(fetchPolicyArg).toBeUndefined()
      verify(mockAppSync.getEmailMessage(anything())).once()
      expect(gunzipSpy).toHaveBeenCalledTimes(1)
    })

    it('does not call gunzip if contentEncoding does not include sudoplatform-compression', async () => {
      when(mockS3Client.download(anything())).thenResolve({
        ...EmailMessageRfc822DataFactory.s3ClientDownloadOutput,
        contentEncoding: 'sudoplatform-crypto, sudoplatform-binary-data',
      })

      await expect(
        instanceUnderTest.getEmailMessageRfc822Data(
          EmailMessageRfc822DataFactory.getEmailMessageInput,
        ),
      ).resolves.toStrictEqual(stringToArrayBuffer(unsealedDraft))

      const [s3DownloadArg] = capture(mockS3Client.download).first()
      expect(s3DownloadArg).toEqual({
        bucket: 'bucket',
        region: 'region',
        key: 'identityId/email/testEmailAddressId/testId-testKeyId',
      })
      verify(mockS3Client.download(anything())).once()

      const [idArg, fetchPolicyArg] = capture(
        mockAppSync.getEmailMessage,
      ).first()
      expect(idArg).toStrictEqual(
        EmailMessageRfc822DataFactory.getEmailMessageInput.id,
      )
      expect(fetchPolicyArg).toBeUndefined()
      verify(mockAppSync.getEmailMessage(anything())).once()
      expect(gunzipSpy).toHaveBeenCalledTimes(0)
    })

    it('decrypts the message if the encrypted body id is found', async () => {
      const message: EmailMessageDetails = {
        from: [{ emailAddress: `from-${v4()}@example.com` }],
        attachments: [
          {
            filename: 'encryptedKey',
            data: v4(),
            inlineAttachment: false,
            contentTransferEncoding: 'base64',
            mimeType: 'mimeType',
            contentId: SecureEmailAttachmentType.KEY_EXCHANGE.contentId,
          },
          {
            filename: 'encryptedBody',
            data: v4(),
            inlineAttachment: false,
            contentTransferEncoding: 'base64',
            mimeType: 'mimeType',
            contentId: SecureEmailAttachmentType.BODY.contentId,
          },
        ],
      }
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        `${unsealedDraft}\n${SecureEmailAttachmentType.BODY.contentId}`,
      )
      parseInternetMessageDataSpy.mockResolvedValueOnce(message)
      when(mockEmailCryptoService.decrypt(anything())).thenResolve(
        stringToArrayBuffer(unsealedDraft),
      )

      await expect(
        instanceUnderTest.getEmailMessageRfc822Data(
          EmailMessageRfc822DataFactory.getEmailMessageInput,
        ),
      ).resolves.toStrictEqual(stringToArrayBuffer(unsealedDraft))

      const [s3DownloadArg] = capture(mockS3Client.download).first()
      expect(s3DownloadArg).toEqual({
        bucket: 'bucket',
        region: 'region',
        key: 'identityId/email/testEmailAddressId/testId-testKeyId',
      })
      verify(mockS3Client.download(anything())).once()

      const [idArg, fetchPolicyArg] = capture(
        mockAppSync.getEmailMessage,
      ).first()
      expect(idArg).toStrictEqual(
        EmailMessageRfc822DataFactory.getEmailMessageInput.id,
      )
      expect(fetchPolicyArg).toBeUndefined()
      verify(mockAppSync.getEmailMessage(anything())).once()
      expect(gunzipSpy).toHaveBeenCalledTimes(0)
      expect(parseInternetMessageDataSpy).toHaveBeenCalledTimes(1)
      verify(mockEmailCryptoService.decrypt(anything())).once()
      const [securePackageArg] = capture(mockEmailCryptoService.decrypt).first()
      expect(securePackageArg).toBeInstanceOf(SecurePackage)
    })

    it('throws if given an invalid contentEncoding value', async () => {
      when(mockS3Client.download(anything())).thenResolve({
        ...EmailMessageRfc822DataFactory.s3ClientDownloadOutput,
        contentEncoding: 'some-unknown-compression-system',
      })

      await expect(
        instanceUnderTest.getEmailMessageRfc822Data(
          EmailMessageRfc822DataFactory.getEmailMessageInput,
        ),
      ).rejects.toThrow(DecodeError)
    })

    it('returns undefined if s3 download throws NoSuchKey', async () => {
      when(mockS3Client.download(anything())).thenThrow(
        new S3DownloadError({
          key: 'testKey',
          msg: 'test error',
          code: S3Error.NoSuchKey,
        }),
      )

      await expect(
        instanceUnderTest.getEmailMessageRfc822Data(
          EmailMessageRfc822DataFactory.getEmailMessageInput,
        ),
      ).resolves.toBeUndefined()

      const [s3DownloadArg] = capture(mockS3Client.download).first()
      expect(s3DownloadArg).toEqual({
        bucket: 'bucket',
        region: 'region',
        key: 'identityId/email/testEmailAddressId/testId-testKeyId',
      })
      verify(mockS3Client.download(anything())).once()

      const [idArg, fetchPolicyArg] = capture(
        mockAppSync.getEmailMessage,
      ).first()
      expect(idArg).toStrictEqual(
        EmailMessageRfc822DataFactory.getEmailMessageInput.id,
      )
      expect(fetchPolicyArg).toBeUndefined()
      verify(mockAppSync.getEmailMessage(anything())).once()
      expect(gunzipSpy).toHaveBeenCalledTimes(0)
    })

    it('throws error if s3 download throws error other than NoSuchKey', async () => {
      when(mockS3Client.download(anything())).thenThrow(
        new S3DownloadError({
          key: 'testKey',
          msg: 'test error',
          code: S3Error.NoSuchKey + 1,
        }),
      )

      await expect(
        instanceUnderTest.getEmailMessageRfc822Data(
          EmailMessageRfc822DataFactory.getEmailMessageInput,
        ),
      ).rejects.toThrow('test error')

      const [s3DownloadArg] = capture(mockS3Client.download).first()
      expect(s3DownloadArg).toEqual({
        bucket: 'bucket',
        region: 'region',
        key: 'identityId/email/testEmailAddressId/testId-testKeyId',
      })
      verify(mockS3Client.download(anything())).once()

      const [idArg, fetchPolicyArg] = capture(
        mockAppSync.getEmailMessage,
      ).first()
      expect(idArg).toStrictEqual(
        EmailMessageRfc822DataFactory.getEmailMessageInput.id,
      )
      expect(fetchPolicyArg).toBeUndefined()
      verify(mockAppSync.getEmailMessage(anything())).once()
      expect(gunzipSpy).toHaveBeenCalledTimes(0)
    })

    it('returns undefined if there is no message with supplied id', async () => {
      when(mockAppSync.getEmailMessage(anything())).thenResolve(undefined)

      await expect(
        instanceUnderTest.getEmailMessageRfc822Data(
          EmailMessageRfc822DataFactory.getEmailMessageInput,
        ),
      ).resolves.toBeUndefined()

      verify(mockS3Client.download(anything())).never()
      const [idArg, fetchPolicyArg] = capture(
        mockAppSync.getEmailMessage,
      ).first()
      expect(idArg).toStrictEqual(
        EmailMessageRfc822DataFactory.getEmailMessageInput.id,
      )
      expect(fetchPolicyArg).toBeUndefined()
      verify(mockAppSync.getEmailMessage(anything())).once()
      expect(gunzipSpy).toHaveBeenCalledTimes(0)
    })
  })

  describe('unsealEmailMessage', () => {
    it('should unseal and decode a well formed message with valid sealed data', async () => {
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        unsealedHeaderDetailsString,
      )
      const sealed = EntityDataFactory.sealedEmailMessage

      await expect(
        instanceUnderTest.unsealEmailMessage(sealed),
      ).resolves.toEqual(EntityDataFactory.emailMessage)

      verify(mockDeviceKeyWorker.unsealString(anything())).once()
      const [actualInput] = capture(mockDeviceKeyWorker.unsealString).first()
      expect(actualInput).toEqual({
        encrypted: sealed.rfc822Header,
        keyId: sealed.keyId,
        keyType: KeyType.KeyPair,
      })
    })

    it('should return failed result if unsealed string is not JSON', async () => {
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        true,
      )
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        '{]not json[}',
      )

      const [nodeMajorVersion] = process.versions.node.split('.').map(Number)
      const { rfc822Header, ...rest } = EntityDataFactory.sealedEmailMessage
      await expect(
        instanceUnderTest.unsealEmailMessage({ rfc822Header, ...rest }),
      ).resolves.toEqual({
        ...rest,
        from: [],
        to: [],
        cc: [],
        bcc: [],
        replyTo: [],
        hasAttachments: false,
        status: {
          type: 'Failed',
          // A different error is thrown here based on Node version being <20 or >=20.
          // - this should handle both scenarios.
          cause: new SyntaxError(
            nodeMajorVersion >= 20
              ? "Expected property name or '}' in JSON at position 1"
              : 'Unexpected token ] in JSON at position 1',
          ),
        },
        date: undefined,
      })

      verify(mockDeviceKeyWorker.unsealString(anything())).once()
      const [actualInput] = capture(mockDeviceKeyWorker.unsealString).first()
      expect(actualInput).toEqual({
        encrypted: rfc822Header,
        keyId: rest.keyId,
        keyType: KeyType.KeyPair,
      })
    })

    it('should return failed result with DecodeError if unsealed cannot be decoded in expected format', async () => {
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        true,
      )
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        '{"some": "random", "json": "object"}',
      )

      const { rfc822Header, ...rest } = EntityDataFactory.sealedEmailMessage
      await expect(
        instanceUnderTest.unsealEmailMessage({ rfc822Header, ...rest }),
      ).resolves.toEqual({
        ...rest,
        from: [],
        to: [],
        cc: [],
        bcc: [],
        replyTo: [],
        hasAttachments: false,
        status: {
          type: 'Failed',
          cause: new DecodeError(
            'RFC822 header unable to be parsed as header details',
          ),
        },
        date: undefined,
      })

      verify(mockDeviceKeyWorker.unsealString(anything())).once()
      const [actualInput] = capture(mockDeviceKeyWorker.unsealString).first()
      expect(actualInput).toEqual({
        encrypted: rfc822Header,
        keyId: rest.keyId,
        keyType: KeyType.KeyPair,
      })
    })

    it('should return failed result with KeyNotFoundError if key does not exist', async () => {
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        false,
      )

      const { rfc822Header, ...rest } = EntityDataFactory.sealedEmailMessage
      await expect(
        instanceUnderTest.unsealEmailMessage({ rfc822Header, ...rest }),
      ).resolves.toEqual({
        ...rest,
        from: [],
        to: [],
        cc: [],
        bcc: [],
        replyTo: [],
        hasAttachments: false,
        status: {
          type: 'Failed',
          cause: new KeyNotFoundError(),
        },
        date: undefined,
      })
    })
  })

  describe('subscribeToEmailMessages', () => {
    const mockOwnerId = 'owner-id'
    const mockSubscriberId = 'subscriber-id'

    it('calls services correctly', () => {
      when(mockSubscriptionManager.getWatcher()).thenReturn(null)
      instanceUnderTest.subscribeToEmailMessages({
        subscriptionId: mockOwnerId,
        ownerId: mockSubscriberId,
        subscriber: {
          emailMessageDeleted(emailMessage: EmailMessage): void {},
          connectionStatusChanged(state: ConnectionState): void {
            return
          },
          emailMessageCreated(emailMessage: EmailMessage): void {},
          emailMessageUpdated(emailMessage: EmailMessage): void {},
        },
      })
      verify(mockSubscriptionManager.subscribe(anything(), anything())).times(3)
      const [actualId, actualSubscriber] = capture(
        mockSubscriptionManager.subscribe,
      ).first()
      expect(actualId).toEqual<typeof actualId>(mockOwnerId)
      verify(mockAppSync.onEmailMessageDeleted(anything())).once()
      const [ownerId] = capture(mockAppSync.onEmailMessageDeleted).first()
      verify(mockSubscriptionManager.getWatcher()).times(6)
      verify(mockSubscriptionManager.setWatcher(anything())).times(3)
      verify(mockSubscriptionManager.setSubscription(anything())).times(3)
      verify(
        mockSubscriptionManager.connectionStatusChanged(
          ConnectionState.Connected,
        ),
      ).times(3)
    })
  })
})
