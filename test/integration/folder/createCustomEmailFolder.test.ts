/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy, DefaultLogger } from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import _ from 'lodash'
import { EmailAddress, SudoEmailClient } from '../../../src'
import {
  setupEmailClient,
  sudoIssuer,
  teardown,
} from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'

describe('SudoEmailClient CreateCustomEmailFolder Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string
  let emailAddress: EmailAddress

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
    sudoOwnershipProofToken = result.ownershipProofToken
    emailAddress = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
    )
  })

  afterEach(async () => {
    await teardown(
      { emailAddresses: [emailAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  test('create a custom email folder should return success status', async () => {
    const customFolderName = 'CUSTOM_FOLDER'
    const customFolder = await instanceUnderTest.createCustomEmailFolder({
      emailAddressId: emailAddress.id,
      customFolderName: customFolderName,
    })
    const sub = await userClient.getSubject()
    expect(customFolder.id).toBeDefined()
    expect(customFolder.owner).toStrictEqual(sub)
    expect(customFolder.owners[0].id).toStrictEqual(sudo.id)
    expect(customFolder.owners[0].issuer).toStrictEqual(sudoIssuer)
    expect(customFolder.customFolderName).toBeDefined()
    expect(customFolder.customFolderName).toStrictEqual(customFolderName)

    const updatedEmailAddress = await instanceUnderTest.getEmailAddress({
      id: emailAddress.id,
      cachePolicy: CachePolicy.RemoteOnly,
    })

    expect(updatedEmailAddress?.folders).toHaveLength(5)
    // 'NONE' is returned in the 'folderName' for custom folders, as this attribute is only used for standard folders.
    expect(updatedEmailAddress?.folders.map((f) => f.folderName)).toEqual(
      expect.arrayContaining(['NONE', 'INBOX', 'SENT', 'OUTBOX', 'TRASH']),
    )

    // Standard folders do not have the 'customFolderName' attribute populated
    expect(updatedEmailAddress?.folders.map((f) => f.customFolderName)).toEqual(
      expect.arrayContaining([
        'CUSTOM_FOLDER',
        undefined,
        undefined,
        undefined,
        undefined,
      ]),
    )
  })
})
