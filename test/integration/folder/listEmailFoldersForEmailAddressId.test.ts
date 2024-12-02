/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import { EmailAddress, SudoEmailClient } from '../../../src'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import { EmailConfigurationData } from '../../../src/gen/graphqlTypes'

describe('SudoEmailClient ListEmailFoldersForEmailAddressId Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string
  let emailAddress: EmailAddress
  let config: EmailConfigurationData

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    if (!config) {
      config = await instanceUnderTest.getConfigurationData()
    }
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

  test('list returns the expected standard folders', async () => {
    const expectedFolderNames = ['INBOX', 'SENT', 'TRASH', 'OUTBOX']
    const foldersListResult =
      await instanceUnderTest.listEmailFoldersForEmailAddressId({
        emailAddressId: emailAddress.id,
      })

    expect(foldersListResult.items.length).toBeGreaterThanOrEqual(
      expectedFolderNames.length,
    )
    expect(foldersListResult.items.map((folder) => folder.folderName)).toEqual(
      expect.arrayContaining(expectedFolderNames),
    )
  })

  test('list returns standard folders plus custom folders', async () => {
    const expectedFolderNames = [
      expect.stringContaining('CUSTOM'),
      'INBOX',
      'SENT',
      'TRASH',
      'OUTBOX',
    ]
    const expectedFolderCustomNames = [
      'CUSTOM_FOLDER',
      undefined,
      undefined,
      undefined,
      undefined,
    ]
    const customFolderName = 'CUSTOM_FOLDER'
    const customFolder = await instanceUnderTest.createCustomEmailFolder({
      emailAddressId: emailAddress.id,
      customFolderName: customFolderName,
    })

    expect(customFolder).toBeDefined()

    const foldersListResult =
      await instanceUnderTest.listEmailFoldersForEmailAddressId({
        emailAddressId: emailAddress.id,
        limit: 10,
      })

    expect(foldersListResult.nextToken).toBeFalsy()
    expect(foldersListResult.items.length).toBeGreaterThanOrEqual(
      expectedFolderNames.length,
    )
    expect(foldersListResult.items.map((folder) => folder.folderName)).toEqual(
      expect.arrayContaining(expectedFolderNames),
    )

    expect(
      foldersListResult.items.map((folder) => folder.customFolderName),
    ).toEqual(expect.arrayContaining(expectedFolderCustomNames))
  })
})
