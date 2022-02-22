import { DefaultApiClientManager } from '@sudoplatform/sudo-api-client'
import {
  DefaultLogger,
  DefaultSudoKeyArchive,
  DefaultSudoKeyManager,
} from '@sudoplatform/sudo-common'
import { DefaultSudoUserClient } from '@sudoplatform/sudo-user'
import { WebSudoCryptoProvider } from '@sudoplatform/sudo-web-crypto-provider'
import { DefaultSudoEmailClient } from '../../../src'
import { str2ab } from '../../util/buffer'
import { createEmailMessageRfc822String } from '../util/createEmailMessage'
import { setupEmailClient } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'

describe('SDK Tests', () => {
  jest.setTimeout(240000)

  it('should allow reinitialisation as a new user and be able to be used to draft emails', async () => {
    // We test this by creating two separate user client instances
    // in series, resetting the API client in between. We create
    // a draft with each one thus owned by each separate user.
    //
    // We then create a 3rd instance. Import the keys of the 1st
    // user, access the 1st user's draft. Reset the emtil client,
    // import the keys of the 2nd user, access the 2nd user's draft.

    const emailClient1 = await setupEmailClient(new DefaultLogger('User 1'))
    const emailAddress1 = await provisionEmailAddress(
      emailClient1.ownershipProofToken,
      emailClient1.emailClient,
    )
    const draftString1 = createEmailMessageRfc822String({
      from: [{ emailAddress: emailAddress1.emailAddress }],
      to: [],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'Message 1',
    })

    const draft1RFC822Data = str2ab(draftString1)
    const draftMetadata1 =
      await emailClient1.emailClient.createDraftEmailMessage({
        rfc822Data: str2ab(draftString1),
        senderEmailAddressId: emailAddress1.id,
      })

    const keyArchive1 = new DefaultSudoKeyArchive(
      Object.values(emailClient1.keyManagers),
    )
    await keyArchive1.loadKeys()
    const exportedKeys1 = await keyArchive1.archive(undefined)

    await DefaultApiClientManager.getInstance().reset()

    const emailClient2 = await setupEmailClient(new DefaultLogger('User 2'))
    const emailAddress2 = await provisionEmailAddress(
      emailClient2.ownershipProofToken,
      emailClient2.emailClient,
    )
    const draftString2 = createEmailMessageRfc822String({
      from: [{ emailAddress: emailAddress2.emailAddress }],
      to: [],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'Message 2',
    })

    const draft2RFC822Data = str2ab(draftString2)
    const draftMetadata2 =
      await emailClient2.emailClient.createDraftEmailMessage({
        rfc822Data: draft2RFC822Data,
        senderEmailAddressId: emailAddress2.id,
      })

    const keyArchive2 = new DefaultSudoKeyArchive(
      Object.values(emailClient2.keyManagers),
    )
    await keyArchive2.loadKeys()
    const exportedKeys2 = await keyArchive2.archive(undefined)

    // We now have two users with separate keys each of which
    // have an email address and a draft. Reset our API client
    // and create a 3rd set of client SDK instances. We don't
    // register a new user or create a new sudo. We simply
    // import the keys for each user created above, resetting
    // the user client in between.

    await DefaultApiClientManager.getInstance().reset()

    const userCryptoProvider = new WebSudoCryptoProvider(
      'SudoUserClient',
      'com.sudoplatform.appservicename',
    )
    const userKeyManager = new DefaultSudoKeyManager(userCryptoProvider)
    const profilesCryptoProvider = new WebSudoCryptoProvider(
      'SudoProfileClient',
      'com.sudoplatform.appservicename',
    )
    const profilesKeyManager = new DefaultSudoKeyManager(profilesCryptoProvider)
    const emailCryptoProvider = new WebSudoCryptoProvider(
      'SudoEmailClient',
      'com.sudoplatform.appservicename',
    )
    const emailKeyManager = new DefaultSudoKeyManager(emailCryptoProvider)

    const logger = new DefaultLogger('IUT')
    const userClient = new DefaultSudoUserClient({
      logger,
      sudoKeyManager: userKeyManager,
    })
    DefaultApiClientManager.getInstance().setAuthClient(userClient)
    const iut = new DefaultSudoEmailClient({
      sudoUserClient: userClient,
      sudoCryptoProvider: emailCryptoProvider,
      sudoKeyManager: emailKeyManager,
    })

    const importer1 = new DefaultSudoKeyArchive(
      Object.values([userKeyManager, profilesKeyManager, emailKeyManager]),
      {
        archiveData: exportedKeys1,
      },
    )
    await importer1.unarchive(undefined)
    await importer1.saveKeys()

    await userClient.signInWithKey()

    const retrievedDraft1 = await iut.getDraftEmailMessage({
      id: draftMetadata1.id,
      emailAddressId: emailAddress1.id,
    })
    if (!retrievedDraft1?.rfc822Data) {
      fail('rerievedDraft1?.rfc822Data undefined')
    }
    expect(new Uint8Array(retrievedDraft1.rfc822Data)).toEqual(
      new Uint8Array(draft1RFC822Data),
    )

    // Now reset user client and load keys from user 2
    userClient.reset()

    const importer2 = new DefaultSudoKeyArchive(
      Object.values([userKeyManager, profilesKeyManager, emailKeyManager]),
      {
        archiveData: exportedKeys2,
      },
    )
    await importer2.unarchive(undefined)
    await importer2.saveKeys()

    await userClient.signInWithKey()
    const retrievedDraft2 = await iut.getDraftEmailMessage({
      id: draftMetadata2.id,
      emailAddressId: emailAddress2.id,
    })
    if (!retrievedDraft2?.rfc822Data) {
      fail('retrievedDraft2?.rfc822Data undefined')
    }
    expect(new Uint8Array(retrievedDraft2.rfc822Data)).toEqual(
      new Uint8Array(draft2RFC822Data),
    )
  })
})
