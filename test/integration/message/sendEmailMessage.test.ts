/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Base64,
  CachePolicy,
  DefaultLogger,
  ListOperationResultStatus,
} from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import _, { sample } from 'lodash'
import { v4 } from 'uuid'
import { externalAccounts } from '../interop.test'
import waitForExpect from 'wait-for-expect'
import {
  EmailAddress,
  EmailFolder,
  EmailMessage,
  EmailMessageRfc822Data,
  EncryptionStatus,
  InNetworkAddressNotFoundError,
  InvalidEmailContentsError,
  MessageSizeLimitExceededError,
  SendEmailMessageInput,
  SudoEmailClient,
  UnauthorizedAddressError,
} from '../../../src'
import { EmailConfigurationDataService } from '../../../src/private/domain/entities/configuration/configurationDataService'
import { arrayBufferToString } from '../../../src/private/util/buffer'
import { EmailMessageDetails } from '../../../src/private/util/rfc822MessageDataProcessor'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { readAllPages } from '../util/paginator'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import { runTestsIf } from '../../util/util'
import { delay } from '../../util/delay'
import { insertLinebreaks } from '../../../src/private/util/stringUtils'
import { encodeWordIfRequired } from '../../util/encoding'

describe('SudoEmailClient SendEmailMessage Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')
  const successSimulatorAddress = 'success@simulator.amazonses.com'

  let emailAddresses: EmailAddress[] = []

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let ownershipProofToken: string
  let sendEncryptedEmailEnabled: boolean

  let emailAddress1: EmailAddress
  let emailAddress2: EmailAddress
  let inboxFolder1: EmailFolder
  let inboxFolder2: EmailFolder
  let draft: EmailMessageDetails
  let encryptedDraft: EmailMessageDetails
  let draftWithAttachments: EmailMessageDetails
  let encryptedDraftWithAttachments: EmailMessageDetails
  let configurationDataService: EmailConfigurationDataService

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
    ownershipProofToken = result.ownershipProofToken
    configurationDataService = result.configurationDataService

    const configuration = await instanceUnderTest.getConfigurationData()
    sendEncryptedEmailEnabled = configuration.sendEncryptedEmailEnabled

    emailAddress1 = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
    )
    emailAddresses.push(emailAddress1)
    emailAddress2 = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
    )
    emailAddresses.push(emailAddress2)

    let folder = emailAddress1.folders.find((f) => f.folderName === 'INBOX')
    if (!folder) {
      fail(`Could not find INBOX folder for ${emailAddress1.id}`)
    }
    inboxFolder1 = folder
    folder = emailAddress2.folders.find((f) => f.folderName === 'INBOX')
    if (!folder) {
      fail(`Could not find INBOX folder for ${emailAddress2.id}`)
    }
    inboxFolder2 = folder

    draft = {
      from: [{ emailAddress: emailAddress1.emailAddress }],
      to: [{ emailAddress: successSimulatorAddress }],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'Hello, World',
      attachments: [],
      subject: 'Send Email Message Test',
    }
    encryptedDraft = {
      from: [{ emailAddress: emailAddress1.emailAddress }],
      to: [{ emailAddress: emailAddress2.emailAddress }],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'Hello, World',
      attachments: [],
      subject: 'Send Email Message Test',
    }
    draftWithAttachments = {
      ...draft,
      attachments: [
        {
          mimeType: 'application/pdf',
          contentTransferEncoding: 'base64',
          filename: 'attachment-1.pdf',
          data: Buffer.from(
            'Content of attachment 1 AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          ).toString('base64'),
          inlineAttachment: false,
        },
        {
          mimeType: 'image/jpeg',
          contentTransferEncoding: 'base64',
          filename: 'attachment-2.jpeg',
          data: Buffer.from('Content of attachment 2').toString('base64'),
          inlineAttachment: false,
        },
      ],
    }
    encryptedDraftWithAttachments = {
      ...encryptedDraft,
      attachments: [
        {
          mimeType: 'application/pdf',
          contentTransferEncoding: 'base64',
          filename: 'attachment-1.pdf',
          data: Buffer.from(
            'Content of attachment 1 AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          ).toString('base64'),
          inlineAttachment: false,
        },
        {
          mimeType: 'image/jpeg',
          contentTransferEncoding: 'base64',
          filename: 'attachment-2.jpeg',
          data: Buffer.from('Content of attachment 2').toString('base64'),
          inlineAttachment: false,
        },
      ],
    }
  })

  afterEach(async () => {
    await teardown(
      { emailAddresses, sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
    emailAddresses = []
  })

  it.each`
    toAddress
    ${sample(externalAccounts)}
    ${successSimulatorAddress}
  `('sends valid message with special characters', async ({ toAddress }) => {
    const emojiSubject = 'emoji me: 😎 ¡ ™ £ ¢ ∞ § ¶ • ª.'
    const emojiBody =
      "Let's put emojis in the body as well: for example 😱, 💐 and special chars  ¡ ™ £ ¢ ∞ § ¶ • ª."

    const result = await instanceUnderTest.sendEmailMessage({
      senderEmailAddressId: emailAddress1.id,
      emailMessageHeader: {
        from: draft.from[0],
        to: [{ emailAddress: toAddress }],
        cc: draft.cc ?? [],
        bcc: draft.bcc ?? [],
        replyTo: draft.replyTo ?? [],
        subject: emojiSubject,
      },
      body: emojiBody,
      attachments: draft.attachments ?? [],
      inlineAttachments: draft.inlineAttachments ?? [],
    })
    const { id: sentId } = result

    expect(sentId).toMatch(
      /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    )

    let sent
    await waitForExpect(async () => {
      sent = await instanceUnderTest.getEmailMessage({
        id: sentId,
        cachePolicy: CachePolicy.RemoteOnly,
      })
      expect(sent).toBeDefined()
    })

    expect(sent).toMatchObject({
      ..._.omit(draft, 'body', 'attachments'),
      id: sentId,
      hasAttachments: false,
      date: expect.any(Date),
      subject: emojiSubject,
      to: [{ emailAddress: toAddress }],
    })

    const sentRFC822Data = await instanceUnderTest.getEmailMessageRfc822Data({
      id: sentId,
      emailAddressId: emailAddress1.id,
    })

    const sentRfc822DataStr = new TextDecoder().decode(
      sentRFC822Data?.rfc822Data,
    )
    expect(sentRfc822DataStr).toContain(`From: <${draft.from[0].emailAddress}>`)
    expect(sentRfc822DataStr).toContain(`To: <${toAddress}>`)
    expect(sentRfc822DataStr).toContain(emojiBody)

    const sentEmailMessageBody =
      await instanceUnderTest.getEmailMessageWithBody({
        id: sentId,
        emailAddressId: emailAddress1.id,
      })
    expect(sentEmailMessageBody).toBeDefined()
  })

  it('returns expected output', async () => {
    const result = await instanceUnderTest.sendEmailMessage({
      senderEmailAddressId: emailAddress1.id,
      emailMessageHeader: {
        from: draft.from[0],
        to: draft.to ?? [],
        cc: draft.cc ?? [],
        bcc: draft.bcc ?? [],
        replyTo: draft.replyTo ?? [],
        subject: draft.subject ?? '',
      },
      body: draft.body ?? '',
      attachments: draft.attachments ?? [],
      inlineAttachments: draft.inlineAttachments ?? [],
    })
    const { id: sentId } = result

    expect(sentId).toMatch(
      /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    )

    let sent
    await waitForExpect(async () => {
      sent = await instanceUnderTest.getEmailMessage({
        id: sentId,
        cachePolicy: CachePolicy.RemoteOnly,
      })
      expect(sent).toBeDefined()
    })

    expect(sent).toMatchObject({
      ..._.omit(draft, 'body', 'attachments'),
      id: sentId,
      hasAttachments: false,
      date: expect.any(Date),
    })

    const sentRFC822Data = await instanceUnderTest.getEmailMessageRfc822Data({
      id: sentId,
      emailAddressId: emailAddress1.id,
    })

    const sentRfc822DataStr = new TextDecoder().decode(
      sentRFC822Data?.rfc822Data,
    )
    expect(sentRfc822DataStr).toContain(`From: <${draft.from[0].emailAddress}>`)
    expect(sentRfc822DataStr).toContain(`To: <${draft.to![0].emailAddress}>`)
    expect(sentRfc822DataStr).toContain(
      `Subject: ${encodeWordIfRequired(draft.subject, EncryptionStatus.UNENCRYPTED)}`,
    )
    expect(sentRfc822DataStr).toContain(draft.body)
  })

  it('returns expected output with attachments', async () => {
    const result = await instanceUnderTest.sendEmailMessage({
      senderEmailAddressId: emailAddress1.id,
      emailMessageHeader: {
        from: draftWithAttachments.from[0],
        to: draftWithAttachments.to ?? [],
        cc: draftWithAttachments.cc ?? [],
        bcc: draftWithAttachments.bcc ?? [],
        replyTo: draftWithAttachments.replyTo ?? [],
        subject: draftWithAttachments.subject ?? '',
      },
      body: draftWithAttachments.body ?? '',
      attachments: draftWithAttachments.attachments ?? [],
      inlineAttachments: draftWithAttachments.inlineAttachments ?? [],
    })
    const { id: sentId } = result

    expect(sentId).toMatch(
      /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    )

    let sent
    await waitForExpect(async () => {
      sent = await instanceUnderTest.getEmailMessage({
        id: sentId,
        cachePolicy: CachePolicy.RemoteOnly,
      })
      expect(sent).toBeDefined()
    })

    expect(sent).toMatchObject({
      ..._.omit(draft, 'body', 'attachments'),
      id: sentId,
      hasAttachments: true,
      date: expect.any(Date),
    })

    const sentRFC822Data = await instanceUnderTest.getEmailMessageRfc822Data({
      id: sentId,
      emailAddressId: emailAddress1.id,
    })

    const sentRfc822DataStr = new TextDecoder().decode(
      sentRFC822Data?.rfc822Data,
    )
    expect(sentRfc822DataStr).toContain(
      `From: <${draftWithAttachments.from[0].emailAddress}>`,
    )
    expect(sentRfc822DataStr).toContain(
      `To: <${draftWithAttachments.to![0].emailAddress}>`,
    )
    expect(sentRfc822DataStr).toContain(
      `Subject: ${encodeWordIfRequired(draftWithAttachments.subject, EncryptionStatus.UNENCRYPTED)}`,
    )
    expect(sentRfc822DataStr).toContain(draftWithAttachments.body)
    const expectedAttachment1Data = insertLinebreaks(
      draftWithAttachments.attachments![0].data,
    )
    expect(sentRfc822DataStr).toContain(expectedAttachment1Data)
    const expectedAttachment2Data = insertLinebreaks(
      draftWithAttachments.attachments![1].data,
    )
    expect(sentRfc822DataStr).toContain(expectedAttachment2Data)
  })

  it('returns expected output when sending to cc', async () => {
    const ccDraft = {
      ...draft,
      to: [],
      cc: [{ emailAddress: emailAddress2.emailAddress }],
    }
    const result = await instanceUnderTest.sendEmailMessage({
      senderEmailAddressId: emailAddress1.id,
      emailMessageHeader: {
        from: ccDraft.from[0],
        to: ccDraft.to ?? [],
        cc: ccDraft.cc ?? [],
        bcc: ccDraft.bcc ?? [],
        replyTo: ccDraft.replyTo ?? [],
        subject: ccDraft.subject ?? '',
      },
      body: ccDraft.body ?? '',
      attachments: ccDraft.attachments ?? [],
      inlineAttachments: ccDraft.inlineAttachments ?? [],
    })
    const { id: sentId } = result

    expect(sentId).toMatch(
      /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    )

    let sent
    await waitForExpect(async () => {
      sent = await instanceUnderTest.getEmailMessage({
        id: sentId,
        cachePolicy: CachePolicy.RemoteOnly,
      })
      expect(sent).toBeDefined()
    })

    expect(sent).toMatchObject({
      ..._.omit(ccDraft, 'body', 'attachments'),
      id: sentId,
      date: expect.any(Date),
    })

    const emailMessage = await instanceUnderTest.getEmailMessage({
      id: sentId,
    })
    const emailMessageBody = await instanceUnderTest.getEmailMessageWithBody({
      id: sentId,
      emailAddressId: emailAddress1.id,
    })

    expect(emailMessage?.from[0].emailAddress).toEqual(
      ccDraft.from[0].emailAddress,
    )
    expect(emailMessage?.cc[0].emailAddress).toEqual(ccDraft.cc[0].emailAddress)
    expect(emailMessage?.subject).toEqual(ccDraft.subject)
    expect(emailMessageBody?.body).toEqual(ccDraft.body)

    await waitForExpect(async () => {
      const result = await readAllPages((nextToken?: string) =>
        instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder2.id,
          cachePolicy: CachePolicy.RemoteOnly,
          nextToken,
        }),
      )
      expect(result.status).toEqual(ListOperationResultStatus.Success)
      if (result.status !== ListOperationResultStatus.Success) {
        fail('result.status unexpectedly not ListOperationResultStatus.Success')
      }
      expect(result.items).toHaveLength(1)
    })
  })

  it('returns expected output when sending to bcc', async () => {
    const bccDraft = {
      ...draft,
      to: [],
      bcc: [{ emailAddress: emailAddress2.emailAddress }],
    }
    const result = await instanceUnderTest.sendEmailMessage({
      senderEmailAddressId: emailAddress1.id,
      emailMessageHeader: {
        from: bccDraft.from[0],
        to: bccDraft.to ?? [],
        cc: bccDraft.cc ?? [],
        bcc: bccDraft.bcc ?? [],
        replyTo: bccDraft.replyTo ?? [],
        subject: bccDraft.subject ?? '',
      },
      body: bccDraft.body ?? '',
      attachments: bccDraft.attachments ?? [],
      inlineAttachments: bccDraft.inlineAttachments ?? [],
    })
    const { id: sentId } = result

    expect(sentId).toMatch(
      /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    )

    let sent
    await waitForExpect(async () => {
      sent = await instanceUnderTest.getEmailMessage({
        id: sentId,
        cachePolicy: CachePolicy.RemoteOnly,
      })
      expect(sent).toBeDefined()
    })

    expect(sent).toMatchObject({
      ..._.omit(bccDraft, 'body', 'attachments'),
      id: sentId,
    })

    const sentEmailMessage = await instanceUnderTest.getEmailMessage({
      id: sentId,
    })
    const sentEmailMessageBody =
      await instanceUnderTest.getEmailMessageWithBody({
        id: sentId,
        emailAddressId: emailAddress1.id,
      })

    expect(sentEmailMessage?.from[0].emailAddress).toEqual(
      bccDraft.from[0].emailAddress,
    )
    expect(sentEmailMessage?.bcc[0].emailAddress).toEqual(
      bccDraft.bcc[0].emailAddress,
    )
    expect(sentEmailMessage?.subject).toEqual(bccDraft.subject)
    expect(sentEmailMessageBody?.body).toEqual(bccDraft.body)

    await waitForExpect(
      async () => {
        const result = await readAllPages((nextToken?: string) =>
          instanceUnderTest.listEmailMessagesForEmailFolderId({
            folderId: inboxFolder2.id,
            cachePolicy: CachePolicy.RemoteOnly,
            nextToken,
          }),
        )
        expect(result.status).toEqual(ListOperationResultStatus.Success)
        if (result.status !== ListOperationResultStatus.Success) {
          fail(
            'result.status unexpectedly not ListOperationResultStatus.Success',
          )
        }
        expect(result.items).toHaveLength(1)
      },
      20000,
      1000,
    )
  })

  it('can send to recipients with commas in display names', async () => {
    const result = await instanceUnderTest.sendEmailMessage({
      senderEmailAddressId: emailAddress1.id,
      emailMessageHeader: {
        from: draft.from[0],
        to: [
          {
            emailAddress: successSimulatorAddress,
            displayName: 'success, simulator',
          },
        ],
        cc: draft.cc ?? [],
        bcc: draft.bcc ?? [],
        replyTo: draft.replyTo ?? [],
        subject: draft.subject ?? '',
      },
      body: draft.body ?? '',
      attachments: draft.attachments ?? [],
      inlineAttachments: draft.inlineAttachments ?? [],
    })
    const { id: sentId } = result

    expect(sentId).toMatch(
      /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    )

    let sent
    await waitForExpect(async () => {
      sent = await instanceUnderTest.getEmailMessage({
        id: sentId,
        cachePolicy: CachePolicy.RemoteOnly,
      })
      expect(sent).toBeDefined()
    })

    expect(sent).toMatchObject({
      ..._.omit(draft, 'body', 'attachments'),
      to: [
        {
          emailAddress: successSimulatorAddress,
          displayName: 'success, simulator',
        },
      ],
      id: sentId,
      hasAttachments: false,
      date: expect.any(Date),
    })

    const emailMessage = await instanceUnderTest.getEmailMessage({
      id: sentId,
    })

    expect(emailMessage?.to[0].displayName).toEqual('success, simulator')
    expect(emailMessage?.to[0].emailAddress).toEqual(draft.to![0].emailAddress)
  })

  it('returns unencrypted status when sending with mixture of recipients', async () => {
    const result = await instanceUnderTest.sendEmailMessage({
      senderEmailAddressId: emailAddress1.id,
      emailMessageHeader: {
        from: draft.from[0],
        to: [...(draft.to ?? []), ...(encryptedDraft.to ?? [])],
        cc: draft.cc ?? [],
        bcc: draft.bcc ?? [],
        replyTo: draft.replyTo ?? [],
        subject: draft.subject ?? '',
      },
      body: draft.body ?? '',
      attachments: draft.attachments ?? [],
      inlineAttachments: draft.inlineAttachments ?? [],
    })
    const { id: sentId } = result

    expect(sentId).toMatch(
      /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    )

    let sent
    await waitForExpect(async () => {
      sent = await instanceUnderTest.getEmailMessage({
        id: sentId,
        cachePolicy: CachePolicy.RemoteOnly,
      })
      expect(sent).toBeDefined()
    })

    expect(sent).toMatchObject({
      ..._.omit(draft, 'body', 'attachments'),
      id: sentId,
      to: [...(draft.to ?? []), ...(encryptedDraft.to ?? [])],
      hasAttachments: false,
      encryptionStatus: EncryptionStatus.UNENCRYPTED,
    })

    const emailMessageBody = await instanceUnderTest.getEmailMessageWithBody({
      id: sentId,
      emailAddressId: emailAddress1.id,
    })
    const emailMessage = await instanceUnderTest.getEmailMessage({
      id: sentId,
    })

    expect(emailMessage?.from[0].emailAddress).toEqual(
      draft.from[0].emailAddress,
    )
    expect(emailMessage?.to[0].emailAddress).toEqual(draft.to![0].emailAddress)
    expect(emailMessage?.subject).toEqual(draft.subject)
    expect(emailMessageBody?.body).toEqual(draft.body)
  })

  it('throws an error if unknown address is used', async () => {
    await expect(
      instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: v4(),
        emailMessageHeader: {
          from: draft.from[0],
          to: draft.to ?? [],
          cc: draft.cc ?? [],
          bcc: draft.bcc ?? [],
          replyTo: draft.replyTo ?? [],
          subject: draft.subject ?? '',
        },
        body: draft.body ?? '',
        attachments: draft.attachments ?? [],
        inlineAttachments: draft.inlineAttachments ?? [],
      }),
    ).rejects.toThrow(UnauthorizedAddressError)
  })

  it('respects the outgoing email message size limit', async () => {
    const { emailMessageMaxOutboundMessageSize } =
      await configurationDataService.getConfigurationData()

    const largeAttachment = Buffer.alloc(emailMessageMaxOutboundMessageSize)
    await expect(
      instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress1.id,
        emailMessageHeader: {
          from: draft.from[0],
          to: draft.to ?? [],
          cc: draft.cc ?? [],
          bcc: draft.bcc ?? [],
          replyTo: draft.replyTo ?? [],
          subject: draft.subject ?? '',
        },
        body: encryptedDraft.body ?? '',
        attachments: [
          {
            contentTransferEncoding: '7bit',
            data: arrayBufferToString(largeAttachment),
            filename: 'large-attachment.txt',
            inlineAttachment: false,
            mimeType: 'text/plain',
          },
        ],
        inlineAttachments: encryptedDraft.inlineAttachments ?? [],
      }),
    ).rejects.toThrow(MessageSizeLimitExceededError)
  })

  it('throws an InvalidEmailContentsError if rfc822 data has no recipients', async () => {
    const badDraft = {
      ...draft,
      from: [{ emailAddress: emailAddress1.emailAddress }],
      to: [],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'Hello, World',
      attachments: [],
    }

    await expect(
      instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress1.id,
        emailMessageHeader: {
          from: badDraft.from[0],
          to: badDraft.to ?? [],
          cc: badDraft.cc ?? [],
          bcc: badDraft.bcc ?? [],
          replyTo: badDraft.replyTo ?? [],
          subject: badDraft.subject ?? '',
        },
        body: badDraft.body ?? '',
        attachments: badDraft.attachments ?? [],
        inlineAttachments: badDraft.inlineAttachments ?? [],
      }),
    ).rejects.toThrow(InvalidEmailContentsError)
  })

  describe('encrypted path', () => {
    it('returns expected output', async () => {
      const result = await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress1.id,
        emailMessageHeader: {
          from: encryptedDraft.from[0],
          to: encryptedDraft.to ?? [],
          cc: encryptedDraft.cc ?? [],
          bcc: encryptedDraft.bcc ?? [],
          replyTo: encryptedDraft.replyTo ?? [],
          subject: encryptedDraft.subject ?? '',
        },
        body: encryptedDraft.body ?? '',
        attachments: encryptedDraft.attachments ?? [],
        inlineAttachments: encryptedDraft.inlineAttachments ?? [],
      })
      const { id: sentId } = result

      expect(sentId).toMatch(
        /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )

      let sent
      await waitForExpect(async () => {
        sent = await instanceUnderTest.getEmailMessage({
          id: sentId,
          cachePolicy: CachePolicy.RemoteOnly,
        })
        expect(sent).toBeDefined()
      })

      expect(sent).toMatchObject({
        ..._.omit(encryptedDraft, 'body', 'attachments'),
        id: sentId,
        hasAttachments: false,
        encryptionStatus: sendEncryptedEmailEnabled
          ? EncryptionStatus.ENCRYPTED
          : EncryptionStatus.UNENCRYPTED,
        date: expect.any(Date),
      })
    })

    it('returns expected output with sender and receiver swapped', async () => {
      const replyDraft: EmailMessageDetails = {
        ...encryptedDraft,
        from: encryptedDraft.to!,
        to: encryptedDraft.from,
      }
      const result = await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress2.id,
        emailMessageHeader: {
          from: replyDraft.from[0],
          to: replyDraft.to ?? [],
          cc: replyDraft.cc ?? [],
          bcc: replyDraft.bcc ?? [],
          replyTo: replyDraft.replyTo ?? [],
          subject: replyDraft.subject ?? '',
        },
        body: replyDraft.body ?? '',
        attachments: replyDraft.attachments ?? [],
        inlineAttachments: replyDraft.inlineAttachments ?? [],
      })
      const { id: sentId } = result

      expect(sentId).toMatch(
        /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )

      let sent
      await waitForExpect(async () => {
        sent = await instanceUnderTest.getEmailMessage({
          id: sentId,
          cachePolicy: CachePolicy.RemoteOnly,
        })
        expect(sent).toBeDefined()
      })

      expect(sent).toMatchObject({
        ..._.omit(replyDraft, 'body', 'attachments'),
        id: sentId,
        hasAttachments: false,
        encryptionStatus: sendEncryptedEmailEnabled
          ? EncryptionStatus.ENCRYPTED
          : EncryptionStatus.UNENCRYPTED,
        date: expect.any(Date),
      })
    })

    it('returns expected output with attachments', async () => {
      const result = await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress1.id,
        emailMessageHeader: {
          from: encryptedDraftWithAttachments.from[0],
          to: encryptedDraftWithAttachments.to ?? [],
          cc: encryptedDraftWithAttachments.cc ?? [],
          bcc: encryptedDraftWithAttachments.bcc ?? [],
          replyTo: encryptedDraftWithAttachments.replyTo ?? [],
          subject: encryptedDraftWithAttachments.subject ?? '',
        },
        body: encryptedDraftWithAttachments.body ?? '',
        attachments: encryptedDraftWithAttachments.attachments ?? [],
        inlineAttachments:
          encryptedDraftWithAttachments.inlineAttachments ?? [],
      })
      const { id: sentId } = result

      expect(sentId).toMatch(
        /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )

      let sent: EmailMessageRfc822Data | undefined
      await waitForExpect(async () => {
        sent = await instanceUnderTest.getEmailMessageRfc822Data({
          id: sentId,
          emailAddressId: emailAddress1.id,
        })
        expect(sent).toBeDefined()
      })

      const sentRfc822DataStr = new TextDecoder().decode(sent?.rfc822Data)
      expect(sentRfc822DataStr).toContain(
        `From: <${encryptedDraftWithAttachments.from[0].emailAddress}>`,
      )
      expect(sentRfc822DataStr).toContain(
        `To: <${encryptedDraftWithAttachments.to![0].emailAddress}>`,
      )
      expect(sentRfc822DataStr).toContain(
        `Subject: ${encryptedDraftWithAttachments.subject}`,
      )
      expect(sentRfc822DataStr).toContain(encryptedDraftWithAttachments.body)
      const expectedAttachment1Data = insertLinebreaks(
        encryptedDraftWithAttachments.attachments![0].data,
      )
      expect(sentRfc822DataStr).toContain(expectedAttachment1Data)
      const expectedAttachment2Data = insertLinebreaks(
        encryptedDraftWithAttachments.attachments![1].data,
      )
      expect(sentRfc822DataStr).toContain(expectedAttachment2Data)
    })

    it('returns expected output when sending to cc', async () => {
      const ccDraft = {
        ...encryptedDraft,
        to: [],
        cc: [{ emailAddress: emailAddress1.emailAddress }],
      }
      const result = await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress1.id,
        emailMessageHeader: {
          from: ccDraft.from[0],
          to: ccDraft.to ?? [],
          cc: ccDraft.cc ?? [],
          bcc: ccDraft.bcc ?? [],
          replyTo: ccDraft.replyTo ?? [],
          subject: ccDraft.subject ?? '',
        },
        body: ccDraft.body ?? '',
        attachments: ccDraft.attachments ?? [],
        inlineAttachments: ccDraft.inlineAttachments ?? [],
      })
      const { id: sentId } = result

      expect(sentId).toMatch(
        /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )

      let sent
      await waitForExpect(async () => {
        sent = await instanceUnderTest.getEmailMessage({
          id: sentId,
          cachePolicy: CachePolicy.RemoteOnly,
        })
        expect(sent).toBeDefined()
      })

      expect(sent).toMatchObject({
        ..._.omit(ccDraft, 'body', 'attachments'),
        id: sentId,
        hasAttachments: false,
        encryptionStatus: sendEncryptedEmailEnabled
          ? EncryptionStatus.ENCRYPTED
          : EncryptionStatus.UNENCRYPTED,
        date: expect.any(Date),
      })
    })

    it('returns expected output when sending to bcc', async () => {
      const bccDraft = {
        ...encryptedDraft,
        to: [],
        bcc: [{ emailAddress: emailAddress1.emailAddress }],
      }
      const result = await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress1.id,
        emailMessageHeader: {
          from: bccDraft.from[0],
          to: bccDraft.to ?? [],
          cc: bccDraft.cc ?? [],
          bcc: bccDraft.bcc ?? [],
          replyTo: bccDraft.replyTo ?? [],
          subject: bccDraft.subject ?? '',
        },
        body: bccDraft.body ?? '',
        attachments: bccDraft.attachments ?? [],
        inlineAttachments: bccDraft.inlineAttachments ?? [],
      })
      const { id: sentId } = result

      expect(sentId).toMatch(
        /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )

      let sent
      await waitForExpect(async () => {
        sent = await instanceUnderTest.getEmailMessage({
          id: sentId,
          cachePolicy: CachePolicy.RemoteOnly,
        })
        expect(sent).toBeDefined()
      })

      expect(sent).toMatchObject({
        ..._.omit(bccDraft, 'body', 'attachments'),
        id: sentId,
        hasAttachments: false,
        encryptionStatus: sendEncryptedEmailEnabled
          ? EncryptionStatus.ENCRYPTED
          : EncryptionStatus.UNENCRYPTED,
        date: expect.any(Date),
      })
    })

    it('can send to recipients with commas in display names', async () => {
      const commaDisplayNameDraft: EmailMessageDetails = {
        ...encryptedDraft,
        to: [
          {
            emailAddress: emailAddress1.emailAddress,
            displayName: 'Kent, Clark',
          },
        ],
      }
      const result = await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress1.id,
        emailMessageHeader: {
          from: commaDisplayNameDraft.from[0],
          to: commaDisplayNameDraft.to ?? [],
          cc: commaDisplayNameDraft.cc ?? [],
          bcc: commaDisplayNameDraft.bcc ?? [],
          replyTo: commaDisplayNameDraft.replyTo ?? [],
          subject: commaDisplayNameDraft.subject ?? '',
        },
        body: commaDisplayNameDraft.body ?? '',
        attachments: commaDisplayNameDraft.attachments ?? [],
        inlineAttachments: commaDisplayNameDraft.inlineAttachments ?? [],
      })
      const { id: sentId } = result

      expect(sentId).toMatch(
        /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )

      let sent
      await waitForExpect(async () => {
        sent = await instanceUnderTest.getEmailMessage({
          id: sentId,
          cachePolicy: CachePolicy.RemoteOnly,
        })
        expect(sent).toBeDefined()
      })

      expect(sent).toMatchObject({
        ..._.omit(commaDisplayNameDraft, 'body', 'attachments'),
        id: sentId,
        hasAttachments: false,
        date: expect.any(Date),
      })

      const sentRFC822Data = await instanceUnderTest.getEmailMessageRfc822Data({
        id: sentId,
        emailAddressId: emailAddress1.id,
      })

      const sentRfc822DataStr = new TextDecoder().decode(
        sentRFC822Data?.rfc822Data,
      )
      expect(sentRfc822DataStr).toContain(
        `To: "Kent, Clark" <${commaDisplayNameDraft.to![0].emailAddress}>`,
      )
    })

    runTestsIf(
      'throws an error if internal recipient is not found',
      () => sendEncryptedEmailEnabled,
      async () => {
        const domains = await instanceUnderTest.getConfiguredEmailDomains()
        const inNetworkNotFoundAddress = `notfoundaddress@${domains[0]}`
        await expect(
          instanceUnderTest.sendEmailMessage({
            senderEmailAddressId: emailAddress1.id,
            emailMessageHeader: {
              from: draft.from[0],
              to: [
                ...(draft.to ?? []),
                { emailAddress: inNetworkNotFoundAddress },
              ],
              cc: draft.cc ?? [],
              bcc: draft.bcc ?? [],
              replyTo: draft.replyTo ?? [],
              subject: draft.subject ?? '',
            },
            body: draft.body ?? '',
            attachments: draft.attachments ?? [],
            inlineAttachments: draft.inlineAttachments ?? [],
          }),
        ).rejects.toThrow(InNetworkAddressNotFoundError)
      },
    )

    it('respects the outgoing email message size limit', async () => {
      const { emailMessageMaxOutboundMessageSize } =
        await configurationDataService.getConfigurationData()

      const largeAttachment = Buffer.alloc(emailMessageMaxOutboundMessageSize)
      await expect(
        instanceUnderTest.sendEmailMessage({
          senderEmailAddressId: emailAddress1.id,
          emailMessageHeader: {
            from: encryptedDraft.from[0],
            to: encryptedDraft.to ?? [],
            cc: encryptedDraft.cc ?? [],
            bcc: encryptedDraft.bcc ?? [],
            replyTo: encryptedDraft.replyTo ?? [],
            subject: encryptedDraft.subject ?? '',
          },
          body: encryptedDraft.body ?? '',
          attachments: [
            {
              contentTransferEncoding: '7bit',
              data: arrayBufferToString(largeAttachment),
              filename: 'large-attachment.txt',
              inlineAttachment: false,
              mimeType: 'text/plain',
            },
          ],
          inlineAttachments: encryptedDraft.inlineAttachments ?? [],
        }),
      ).rejects.toThrow(MessageSizeLimitExceededError)
    })

    it('throws an error if unknown address is used', async () => {
      await expect(
        instanceUnderTest.sendEmailMessage({
          senderEmailAddressId: v4(),
          emailMessageHeader: {
            from: encryptedDraft.from[0],
            to: encryptedDraft.to ?? [],
            cc: encryptedDraft.cc ?? [],
            bcc: encryptedDraft.bcc ?? [],
            replyTo: encryptedDraft.replyTo ?? [],
            subject: encryptedDraft.subject ?? '',
          },
          body: encryptedDraft.body ?? '',
          attachments: encryptedDraft.attachments ?? [],
          inlineAttachments: encryptedDraft.inlineAttachments ?? [],
        }),
      ).rejects.toThrow(UnauthorizedAddressError)
    })
  })

  describe('replying/forwarding tests', () => {
    async function sendMessageAndVerify(
      sendInput: SendEmailMessageInput,
    ): Promise<string> {
      const sendResult = await instanceUnderTest.sendEmailMessage(sendInput)
      expect(sendResult).toBeDefined()
      const { id } = sendResult
      expect(id).toMatch(
        /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )
      return id
    }

    async function waitForAndVerifyMessage(
      messageId: string,
    ): Promise<EmailMessage> {
      let message
      await waitForExpect(async () => {
        message = await instanceUnderTest.getEmailMessage({
          id: messageId,
          cachePolicy: CachePolicy.RemoteOnly,
        })
        expect(message).toBeDefined()
        expect(message).toMatchObject({ id: messageId })
      })
      return message as unknown as EmailMessage
    }

    it('sends a message as a reply and updates the replied message at the service level', async () => {
      const sendInput: SendEmailMessageInput = {
        senderEmailAddressId: emailAddress1.id,
        emailMessageHeader: {
          from: draft.from[0],
          to: [draft.from[0]],
          cc: [],
          bcc: [],
          replyTo: [],
          subject: 'Initial message',
        },
        body: 'This message will be replied to',
        attachments: [],
        inlineAttachments: [],
      }

      // Send an initial message to self
      const initialMessageId = await sendMessageAndVerify(sendInput)

      // Retrieve the initial sent message
      let initialMessage = await waitForAndVerifyMessage(initialMessageId)
      expect(initialMessage.repliedTo).toEqual(false)

      // Send another message in reply to the first message
      const replyingMessageInput: SendEmailMessageInput = { ...sendInput }
      replyingMessageInput.body = ''
      replyingMessageInput.replyingMessageId = initialMessageId
      replyingMessageInput.emailMessageHeader.subject = ''
      await sendMessageAndVerify(replyingMessageInput)

      // Allow some time for updates
      await delay(5000)

      // Retrieve the initial message again and verify the `repliedTo` param has updated
      initialMessage = await waitForAndVerifyMessage(initialMessageId)
      expect(initialMessage.repliedTo).toEqual(true)
    })

    it('sends a forwarded message and updates the forwarded message at the service level', async () => {
      const sendInput: SendEmailMessageInput = {
        senderEmailAddressId: emailAddress1.id,
        emailMessageHeader: {
          from: draft.from[0],
          to: [draft.from[0]],
          cc: [],
          bcc: [],
          replyTo: [],
          subject: 'Initial message',
        },
        body: 'This message will be forwarded',
        attachments: [],
        inlineAttachments: [],
      }

      // Send an initial message to self
      const initialMessageId = await sendMessageAndVerify(sendInput)

      // Retrieve the initial sent message
      let initialMessage = await waitForAndVerifyMessage(initialMessageId)
      expect(initialMessage.forwarded).toEqual(false)

      // Send another message forwarding the first message
      const forwardingMessageInput: SendEmailMessageInput = { ...sendInput }
      forwardingMessageInput.body = ''
      forwardingMessageInput.forwardingMessageId = initialMessageId
      forwardingMessageInput.emailMessageHeader.subject = ''
      await sendMessageAndVerify(forwardingMessageInput)

      // Allow some time for updates
      await delay(5000)

      // Retrieve the initial message again and verify the `forwarded` param has updated
      initialMessage = await waitForAndVerifyMessage(initialMessageId)
      expect(initialMessage.forwarded).toEqual(true)
    })
  })
})
