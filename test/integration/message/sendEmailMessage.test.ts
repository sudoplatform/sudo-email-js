/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CachePolicy,
  DefaultLogger,
  ListOperationResultStatus,
} from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import _ from 'lodash'
import { v4 } from 'uuid'
import waitForExpect from 'wait-for-expect'
import {
  EmailAddress,
  EmailFolder,
  EncryptionStatus,
  InNetworkAddressNotFoundError,
  InvalidEmailContentsError,
  MessageSizeLimitExceededError,
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

describe('SudoEmailClient SendEmailMessage Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')
  const ootoSimulatorAddress = 'ooto@simulator.amazonses.com'

  let emailAddresses: EmailAddress[] = []

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let ownershipProofToken: string
  let sendEncryptedEmailEnabled: boolean

  let emailAddress1: EmailAddress
  let emailAddress2: EmailAddress
  let inboxFolder: EmailFolder
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

    const folder = emailAddress1.folders.find((f) => f.folderName === 'INBOX')
    if (!folder) {
      fail(`Could not find INBOX folder for ${emailAddress1.id}`)
    }
    inboxFolder = folder

    draft = {
      from: [{ emailAddress: emailAddress1.emailAddress }],
      to: [{ emailAddress: ootoSimulatorAddress }],
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
    }
    draftWithAttachments = {
      ...draft,
      attachments: [
        {
          mimeType: 'application/pdf',
          contentTransferEncoding: 'base64',
          filename: 'attachment-1.pdf',
          data: Buffer.from('Content of attachment 1').toString('base64'),
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
          data: Buffer.from('Content of attachment 1').toString('base64'),
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
    expect(sentRfc822DataStr).toContain(`Subject: ${draft.subject}`)
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
      `Subject: ${draftWithAttachments.subject}`,
    )
    expect(sentRfc822DataStr).toContain(draftWithAttachments.body)
  })

  it('returns expected output when sending to cc', async () => {
    const ccDraft = {
      ...draft,
      to: [],
      cc: [{ emailAddress: ootoSimulatorAddress }],
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
    })

    const sentRFC822Data = await instanceUnderTest.getEmailMessageRfc822Data({
      id: sentId,
      emailAddressId: emailAddress1.id,
    })

    const sentRfc822DataStr = new TextDecoder().decode(
      sentRFC822Data?.rfc822Data,
    )
    expect(sentRfc822DataStr).toContain(
      `From: <${ccDraft.from[0].emailAddress}>`,
    )
    expect(sentRfc822DataStr).toContain(`Cc: <${ccDraft.cc[0].emailAddress}>`)
    expect(sentRfc822DataStr).toContain(`Subject: ${ccDraft.subject}`)
    expect(sentRfc822DataStr).toContain(ccDraft.body)

    await waitForExpect(async () => {
      const result = await readAllPages((nextToken?: string) =>
        instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder.id,
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
      bcc: [{ emailAddress: ootoSimulatorAddress }],
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

    const sentRFC822Data = await instanceUnderTest.getEmailMessageRfc822Data({
      id: sentId,
      emailAddressId: emailAddress1.id,
    })

    const sentRfc822DataStr = new TextDecoder().decode(
      sentRFC822Data?.rfc822Data,
    )
    expect(sentRfc822DataStr).toContain(
      `From: <${bccDraft.from[0].emailAddress}>`,
    )
    expect(sentRfc822DataStr).toContain(
      `Bcc: <${bccDraft.bcc[0].emailAddress}>`,
    )
    expect(sentRfc822DataStr).toContain(`Subject: ${bccDraft.subject}`)
    expect(sentRfc822DataStr).toContain(bccDraft.body)

    await waitForExpect(
      async () => {
        const result = await readAllPages((nextToken?: string) =>
          instanceUnderTest.listEmailMessagesForEmailFolderId({
            folderId: inboxFolder.id,
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

    const sentRFC822Data = await instanceUnderTest.getEmailMessageRfc822Data({
      id: sentId,
      emailAddressId: emailAddress1.id,
    })

    const sentRfc822DataStr = new TextDecoder().decode(
      sentRFC822Data?.rfc822Data,
    )
    expect(sentRfc822DataStr).toContain(`From: <${draft.from[0].emailAddress}>`)
    expect(sentRfc822DataStr).toContain(`To: <${draft.to![0].emailAddress}>`)
    expect(sentRfc822DataStr).toContain(`Subject: ${draft.subject}`)
    expect(sentRfc822DataStr).toContain(draft.body)
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

      let sent
      await waitForExpect(async () => {
        sent = await instanceUnderTest.getEmailMessage({
          id: sentId,
          cachePolicy: CachePolicy.RemoteOnly,
        })
        expect(sent).toBeDefined()
      })

      expect(sent).toMatchObject({
        ..._.omit(encryptedDraftWithAttachments, 'body', 'attachments'),
        id: sentId,
        hasAttachments: true,
        encryptionStatus: sendEncryptedEmailEnabled
          ? EncryptionStatus.ENCRYPTED
          : EncryptionStatus.UNENCRYPTED,
      })
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
      })
    })

    runTestsIf(
      'throws an error if internal recipient is not found',
      () => sendEncryptedEmailEnabled,
      async () => {
        const domains = await instanceUnderTest.getSupportedEmailDomains()
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
})
