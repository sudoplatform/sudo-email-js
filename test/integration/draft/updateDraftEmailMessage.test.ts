import { DefaultLogger } from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { v4 } from 'uuid'
import {
  AddressNotFoundError,
  EmailAddress,
  MessageNotFoundError,
  SudoEmailClient,
} from '../../../src'
import { str2ab } from '../../util/buffer'
import { createEmailMessageRfc822String } from '../util/createEmailMessage'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'

describe('SudoEmailClient updateDraftEmailMessage Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string

  let emailAddress: EmailAddress
  let draftIds: string[] = []

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    sudo = result.sudo
    sudoOwnershipProofToken = result.ownershipProofToken

    emailAddress = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
    )
  })

  afterEach(async () => {
    await instanceUnderTest.deleteDraftEmailMessages({
      ids: draftIds,
      emailAddressId: emailAddress.id,
    })
    draftIds = []
    await teardown(
      { emailAddresses: [emailAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient },
    )
  })

  it('updates a draft successfully', async () => {
    const draftString = createEmailMessageRfc822String({
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'Hello, World',
    })
    const draftId = await instanceUnderTest.createDraftEmailMessage({
      rfc822Data: str2ab(draftString),
      senderEmailAddressId: emailAddress.id,
    })
    draftIds.push(draftId)
    const updatedDraftString = createEmailMessageRfc822String({
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'Goodbye, World',
    })
    const updatedDraftId = await instanceUnderTest.updateDraftEmailMessage({
      id: draftId,
      rfc822Data: str2ab(updatedDraftString),
      senderEmailAddressId: emailAddress.id,
    })
    await expect(
      instanceUnderTest.getDraftEmailMessage({
        id: updatedDraftId,
        emailAddressId: emailAddress.id,
      }),
    ).resolves.toStrictEqual({
      id: updatedDraftId,
      rfc822Data: new TextEncoder().encode(updatedDraftString),
    })
  })
  it('throws an error if a non-existent draft message id is given', async () => {
    const draftString = createEmailMessageRfc822String({
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'Hello, World',
    })
    await expect(
      instanceUnderTest.updateDraftEmailMessage({
        id: v4(),
        rfc822Data: str2ab(draftString),
        senderEmailAddressId: emailAddress.id,
      }),
    ).rejects.toThrow(MessageNotFoundError)
  })
  it('throws an error if an non-existent email address id is given', async () => {
    const draftString = createEmailMessageRfc822String({
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'Hello, World',
    })
    const draftId = await instanceUnderTest.createDraftEmailMessage({
      rfc822Data: str2ab(draftString),
      senderEmailAddressId: emailAddress.id,
    })
    draftIds.push(draftId)
    const updatedDraftString = createEmailMessageRfc822String({
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'Goodbye, World',
    })
    await expect(
      instanceUnderTest.updateDraftEmailMessage({
        id: draftId,
        rfc822Data: str2ab(updatedDraftString),
        senderEmailAddressId: v4(),
      }),
    ).rejects.toThrow(AddressNotFoundError)
  })
})
