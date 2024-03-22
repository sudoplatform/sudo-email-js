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
  InvalidEmailContentsError,
  SudoEmailClient,
  UnauthorizedAddressError,
} from '../../../src'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { readAllPages } from '../util/paginator'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import {
  EmailMessageDetails,
  Rfc822MessageParser,
} from '../../../src/private/util/rfc822MessageParser'
import { stringToArrayBuffer } from '../../../src/private/util/buffer'

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

  let emailAddress1: EmailAddress
  let emailAddress2: EmailAddress
  let inboxFolder: EmailFolder
  let draft: EmailMessageDetails
  let encryptedDraft: EmailMessageDetails
  let draftWithAttachments: EmailMessageDetails
  let encryptedDraftWithAttachments: EmailMessageDetails
  let draftString: string
  let encryptedDraftString: string
  let draftWithAttachmentsString: string
  let encryptedDraftWithAttachmentsString: string

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
    ownershipProofToken = result.ownershipProofToken

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
    }
    draftString = Rfc822MessageParser.encodeToRfc822DataStr(draft)
    encryptedDraft = {
      from: [{ emailAddress: emailAddress1.emailAddress }],
      to: [{ emailAddress: emailAddress2.emailAddress }],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'Hello, World',
      attachments: [],
    }
    encryptedDraftString =
      Rfc822MessageParser.encodeToRfc822DataStr(encryptedDraft)
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
    draftWithAttachmentsString =
      Rfc822MessageParser.encodeToRfc822DataStr(draftWithAttachments)
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
    encryptedDraftWithAttachmentsString =
      Rfc822MessageParser.encodeToRfc822DataStr(encryptedDraftWithAttachments)
  })

  afterEach(async () => {
    await teardown(
      { emailAddresses, sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
    emailAddresses = []
  })

  it('returns expected output', async () => {
    const sentId = await instanceUnderTest.sendEmailMessage({
      rfc822Data: stringToArrayBuffer(draftString),
      senderEmailAddressId: emailAddress1.id,
    })

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

    expect(new TextDecoder().decode(sentRFC822Data?.rfc822Data)).toEqual(
      draftString,
    )
  })

  it('returns expected output with attachments', async () => {
    const sentId = await instanceUnderTest.sendEmailMessage({
      rfc822Data: stringToArrayBuffer(draftWithAttachmentsString),
      senderEmailAddressId: emailAddress1.id,
    })

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

    expect(new TextDecoder().decode(sentRFC822Data?.rfc822Data)).toEqual(
      draftWithAttachmentsString,
    )
  })

  it('returns expected output when sending to cc', async () => {
    const ccDraft = {
      ...draft,
      to: [],
      cc: [{ emailAddress: ootoSimulatorAddress }],
    }
    const ccDraftString = Rfc822MessageParser.encodeToRfc822DataStr(ccDraft)
    const sentId = await instanceUnderTest.sendEmailMessage({
      rfc822Data: stringToArrayBuffer(ccDraftString),
      senderEmailAddressId: emailAddress1.id,
    })

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

    expect(new TextDecoder().decode(sentRFC822Data?.rfc822Data)).toEqual(
      ccDraftString,
    )

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
    const bccDraftString = Rfc822MessageParser.encodeToRfc822DataStr(bccDraft)
    const sentId = await instanceUnderTest.sendEmailMessage({
      rfc822Data: stringToArrayBuffer(bccDraftString),
      senderEmailAddressId: emailAddress1.id,
    })

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

    expect(new TextDecoder().decode(sentRFC822Data?.rfc822Data)).toEqual(
      bccDraftString,
    )

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

  it('throws an error if unknown address is used', async () => {
    await expect(
      instanceUnderTest.sendEmailMessage({
        rfc822Data: stringToArrayBuffer(draftString),
        senderEmailAddressId: v4(),
      }),
    ).rejects.toThrow(UnauthorizedAddressError)
  })

  it('throws an InvalidEmailContentsError if rfc822 data is garbage', async () => {
    await expect(
      instanceUnderTest.sendEmailMessage({
        rfc822Data: stringToArrayBuffer(v4()),
        senderEmailAddressId: emailAddress1.id,
      }),
    ).rejects.toThrow(InvalidEmailContentsError)
  })

  it('throws an InvalidEmailContentsError if rfc822 data has no recipients', async () => {
    const badDraft = {
      from: [{ emailAddress: emailAddress1.emailAddress }],
      to: [],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'Hello, World',
      attachments: [],
    }
    const badDraftString = Rfc822MessageParser.encodeToRfc822DataStr(badDraft)

    await expect(
      instanceUnderTest.sendEmailMessage({
        rfc822Data: stringToArrayBuffer(badDraftString),
        senderEmailAddressId: emailAddress1.id,
      }),
    ).rejects.toThrow(InvalidEmailContentsError)
  })

  describe('encrypted path', () => {
    it('returns expected output', async () => {
      const sentId = await instanceUnderTest.sendEmailMessage({
        rfc822Data: stringToArrayBuffer(encryptedDraftString),
        senderEmailAddressId: emailAddress1.id,
      })

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
        encryptionStatus: EncryptionStatus.ENCRYPTED,
      })
    })

    it('returns expected output with sender and receive swapped', async () => {
      const replyDraft: EmailMessageDetails = {
        ...encryptedDraft,
        from: encryptedDraft.to!,
        to: encryptedDraft.from,
      }
      const replyDraftBuf =
        Rfc822MessageParser.encodeToRfc822DataBuffer(replyDraft)
      const sentId = await instanceUnderTest.sendEmailMessage({
        rfc822Data: replyDraftBuf,
        senderEmailAddressId: emailAddress2.id,
      })

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
        encryptionStatus: EncryptionStatus.ENCRYPTED,
      })
    })

    it('returns expected output with attachments', async () => {
      const sentId = await instanceUnderTest.sendEmailMessage({
        rfc822Data: stringToArrayBuffer(encryptedDraftWithAttachmentsString),
        senderEmailAddressId: emailAddress1.id,
      })

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
        encryptionStatus: EncryptionStatus.ENCRYPTED,
      })
    })

    it('returns expected output when sending to cc', async () => {
      const ccDraft = {
        ...encryptedDraft,
        to: [],
        cc: [{ emailAddress: emailAddress1.emailAddress }],
      }
      const ccDraftString = Rfc822MessageParser.encodeToRfc822DataStr(ccDraft)
      const sentId = await instanceUnderTest.sendEmailMessage({
        rfc822Data: stringToArrayBuffer(ccDraftString),
        senderEmailAddressId: emailAddress1.id,
      })

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
        encryptionStatus: EncryptionStatus.ENCRYPTED,
      })
    })

    it('returns expected output when sending to bcc', async () => {
      const bccDraft = {
        ...encryptedDraft,
        to: [],
        bcc: [{ emailAddress: emailAddress1.emailAddress }],
      }
      const bccDraftString = Rfc822MessageParser.encodeToRfc822DataStr(bccDraft)
      const sentId = await instanceUnderTest.sendEmailMessage({
        rfc822Data: stringToArrayBuffer(bccDraftString),
        senderEmailAddressId: emailAddress1.id,
      })

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
        encryptionStatus: EncryptionStatus.ENCRYPTED,
      })
    })

    it('throws an error if unknown address is used', async () => {
      await expect(
        instanceUnderTest.sendEmailMessage({
          rfc822Data: stringToArrayBuffer(encryptedDraftString),
          senderEmailAddressId: v4(),
        }),
      ).rejects.toThrow(UnauthorizedAddressError)
    })
  })
})
