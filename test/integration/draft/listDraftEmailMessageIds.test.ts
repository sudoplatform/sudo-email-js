import { DefaultLogger } from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import _ from 'lodash'
import { DraftEmailMessage, EmailAddress, SudoEmailClient } from '../../../src'
import { createEmailMessageRfc822String } from '../util/createEmailMessage'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'

describe('SudoEmailClient listDraftEmailMessageIds Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string

  let emailAddress: EmailAddress
  let draftData: DraftEmailMessage[] = []

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
    const encoder = new TextEncoder()
    const draftDataArrays = _.range(9)
      .map(() =>
        createEmailMessageRfc822String({
          from: [{ emailAddress: emailAddress.emailAddress }],
          to: [],
          cc: [],
          bcc: [],
          replyTo: [],
          body: 'test draft message',
        }),
      )
      .map((s) => encoder.encode(s))

    draftData = await Promise.all(
      draftDataArrays.map(async (d) => {
        const metadata = await instanceUnderTest.createDraftEmailMessage({
          senderEmailAddressId: emailAddress.id,
          rfc822Data: d,
        })
        return { ...metadata, rfc822Data: d }
      }),
    )
  })

  afterEach(async () => {
    const draftIds = draftData.map(({ id }) => id)

    await instanceUnderTest.deleteDraftEmailMessages({
      ids: draftIds,
      emailAddressId: emailAddress.id,
    })
    draftData = []
    await teardown(
      { emailAddresses: [emailAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient },
    )
  })

  it('lists multiple draft ids across an email address', async () => {
    const draftIds = draftData.map(({ id }) => id)
    await expect(
      instanceUnderTest.listDraftEmailMessageIds(emailAddress.id),
    ).resolves.toStrictEqual(expect.arrayContaining(draftIds))
  })

  it('lists multiple draft metadata across an email address', async () => {
    const metadata = await instanceUnderTest.listDraftEmailMessageMetadata(
      emailAddress.id,
    )

    metadata.forEach((m) => {
      expect(draftData).toContainEqual({
        ...m,
        id: m.id,
        updatedAt: m.updatedAt,
        rfc822Data: expect.anything(),
      })
    })
  })
})
