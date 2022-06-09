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
  InvalidEmailContentsError,
  SudoEmailClient,
  UnauthorizedAddressError,
} from '../../../src'
import { str2ab } from '../../util/buffer'
import {
  createEmailMessageRfc822String,
  EmailMessageDetails,
} from '../util/createEmailMessage'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { readAllPages } from '../util/paginator'
import { provisionEmailAddress } from '../util/provisionEmailAddress'

describe('SudoEmailClient SendEmailMessage Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let emailAddresses: EmailAddress[] = []

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let ownershipProofToken: string

  let emailAddress: EmailAddress
  let inboxFolder: EmailFolder
  let draft: EmailMessageDetails
  let draftWithAttachments: EmailMessageDetails
  let draftString: string
  let draftWithAttachmentsString: string

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
    ownershipProofToken = result.ownershipProofToken

    emailAddress = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
    )
    emailAddresses.push(emailAddress)

    const folder = emailAddress.folders.find((f) => f.folderName === 'INBOX')
    if (!folder) {
      fail(`Could not find INBOX folder for ${emailAddress.id}`)
    }
    inboxFolder = folder

    draft = {
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [{ emailAddress: 'ooto@simulator.amazonses.com' }],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'Hello, World',
      attachments: [],
    }
    draftString = createEmailMessageRfc822String(draft)
    draftWithAttachments = {
      ...draft,
      attachments: [
        {
          contentType: 'application/pdf',
          contentTransferEncoding: 'base64',
          fileName: 'attachment-1.pdf',
          content: Buffer.from('Content of attachment 1').toString('base64'),
        },
        {
          contentType: 'image/jpeg',
          contentTransferEncoding: 'base64',
          fileName: 'attachment-2.jpeg',
          content: Buffer.from('Content of attachment 2').toString('base64'),
        },
      ],
    }
    draftWithAttachmentsString =
      createEmailMessageRfc822String(draftWithAttachments)
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
      rfc822Data: str2ab(draftString),
      senderEmailAddressId: emailAddress.id,
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
      emailAddressId: emailAddress.id,
    })

    expect(new TextDecoder().decode(sentRFC822Data?.rfc822Data)).toEqual(
      draftString,
    )
  })

  it('returns expected output with attachments', async () => {
    const sentId = await instanceUnderTest.sendEmailMessage({
      rfc822Data: str2ab(draftWithAttachmentsString),
      senderEmailAddressId: emailAddress.id,
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
      emailAddressId: emailAddress.id,
    })

    expect(new TextDecoder().decode(sentRFC822Data?.rfc822Data)).toEqual(
      draftWithAttachmentsString,
    )
  })

  it('returns expected output when sending to cc', async () => {
    const ccDraft = {
      ...draft,
      to: [],
      cc: [{ emailAddress: 'ooto@simulator.amazonses.com' }],
    }
    const ccDraftString = createEmailMessageRfc822String(ccDraft)
    const sentId = await instanceUnderTest.sendEmailMessage({
      rfc822Data: str2ab(ccDraftString),
      senderEmailAddressId: emailAddress.id,
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
      emailAddressId: emailAddress.id,
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
      bcc: [{ emailAddress: 'ooto@simulator.amazonses.com' }],
    }
    const bccDraftString = createEmailMessageRfc822String(bccDraft)
    const sentId = await instanceUnderTest.sendEmailMessage({
      rfc822Data: str2ab(bccDraftString),
      senderEmailAddressId: emailAddress.id,
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
      emailAddressId: emailAddress.id,
    })

    expect(new TextDecoder().decode(sentRFC822Data?.rfc822Data)).toEqual(
      bccDraftString,
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

  it('throws an error if unknown address is used', async () => {
    await expect(
      instanceUnderTest.sendEmailMessage({
        rfc822Data: str2ab(draftString),
        senderEmailAddressId: v4(),
      }),
    ).rejects.toThrow(UnauthorizedAddressError)
  })

  it('throws an InvalidEmailContentsError if rfc822 data is garbage', async () => {
    await expect(
      instanceUnderTest.sendEmailMessage({
        rfc822Data: str2ab(v4()),
        senderEmailAddressId: emailAddress.id,
      }),
    ).rejects.toThrow(InvalidEmailContentsError)
  })

  it('throws an InvalidEmailContentsError if rfc822 data has no recipients', async () => {
    const badDraft = {
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'Hello, World',
      attachments: [],
    }
    const badDraftString = createEmailMessageRfc822String(badDraft)

    await expect(
      instanceUnderTest.sendEmailMessage({
        rfc822Data: str2ab(badDraftString),
        senderEmailAddressId: emailAddress.id,
      }),
    ).rejects.toThrow(InvalidEmailContentsError)
  })
})
