import { CachePolicy, DefaultLogger } from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import _ from 'lodash'
import { v4 } from 'uuid'
import waitForExpect from 'wait-for-expect'
import {
  EmailAddress,
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
  let draft: EmailMessageDetails
  let draftString: string

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
    draft = {
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [{ emailAddress: 'ooto@simulator.amazonses.com' }],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'Hello, World',
    }
    draftString = createEmailMessageRfc822String(draft)
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

    expect(sent).toMatchObject({ id: sentId, ..._.omit(draft, 'body') })

    const sentRFC822Data = await instanceUnderTest.getEmailMessageRfc822Data({
      id: sentId,
      emailAddressId: emailAddress.id,
    })

    expect(new TextDecoder().decode(sentRFC822Data?.rfc822Data)).toEqual(
      draftString,
    )
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

  it('throws an InvalidEmailContentsError if rfc822 data has no To recipients', async () => {
    const badDraft = {
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [],
      cc: [],
      bcc: [{ emailAddress: 'ooto@simulator.amazonses.com' }],
      replyTo: [],
      body: 'Hello, World',
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
