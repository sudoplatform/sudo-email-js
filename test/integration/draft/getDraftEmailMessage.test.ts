import { DefaultLogger } from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { v4 } from 'uuid'
import {
  AddressNotFoundError,
  EmailAddress,
  SudoEmailClient,
} from '../../../src'
import { createEmailMessageRfc822String } from '../util/createEmailMessage'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'

// Workaround for a bug in jest where `instanceof` does not return the
// correct result when running  in `jsdom` test environment.
global.Uint8Array = Uint8Array

describe('SudoEmailClient getDraftEmailMessage Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string

  let emailAddress: EmailAddress
  let draftContents: Uint8Array
  let draftId: string

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
    const draftEmailMessageString = createEmailMessageRfc822String({
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'test draft message',
    })
    draftContents = new TextEncoder().encode(draftEmailMessageString)
    draftId = await instanceUnderTest.createDraftEmailMessage({
      rfc822Data: draftContents,
      senderEmailAddressId: emailAddress.id,
    })
  })

  afterEach(async () => {
    await instanceUnderTest
      .deleteDraftEmailMessages({
        ids: [draftId],
        emailAddressId: emailAddress.id,
      })
      .catch((err) => {
        if (err instanceof AddressNotFoundError) {
          return
        }
        throw err
      })
    await teardown(
      { emailAddresses: [emailAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient },
    )
  })

  it('returns successful draft', async () => {
    await expect(
      instanceUnderTest.getDraftEmailMessage({
        id: draftId,
        emailAddressId: emailAddress.id,
      }),
    ).resolves.toStrictEqual({ id: draftId, rfc822Data: draftContents })
  })
  it('returns undefined if message id cannot be found', async () => {
    await expect(
      instanceUnderTest.getDraftEmailMessage({
        id: v4(),
        emailAddressId: emailAddress.id,
      }),
    ).resolves.toBeUndefined()
  })
  it('returns undefined if email address id cannot be found', async () => {
    await expect(
      instanceUnderTest.getDraftEmailMessage({
        id: draftId,
        emailAddressId: v4(),
      }),
    ).resolves.toBeUndefined()
  })
})
