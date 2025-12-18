/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { EmailAddress, SudoEmailClient } from '../../../src'
import {
  setupEmailClient,
  sudoIssuer,
  teardown,
} from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import { EmailConfigurationData } from '../../../src/gen/graphqlTypes'

describe('SudoEmailClient CreateCustomEmailFolder Test Suite', () => {
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

  test('create a custom email folder should return success status', async () => {
    const customFolderName = 'CUSTOM_FOLDER'
    const expectedFolderNames = [
      expect.stringContaining('CUSTOM'),
      'INBOX',
      'SENT',
      'TRASH',
      'OUTBOX',
    ]
    const expectedFolderCustomNames = [
      customFolderName,
      undefined,
      undefined,
      undefined,
      undefined,
    ]
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
    })

    expect(updatedEmailAddress?.folders.length).toBeGreaterThanOrEqual(
      expectedFolderNames.length,
    )
    expect(updatedEmailAddress?.folders.map((f) => f.folderName)).toEqual(
      expect.arrayContaining(expectedFolderNames),
    )

    // Standard folders do not have the 'customFolderName' attribute populated
    expect(updatedEmailAddress?.folders.map((f) => f.customFolderName)).toEqual(
      expect.arrayContaining(expectedFolderCustomNames),
    )
  })

  test('can create multiple custom folders successfully', async () => {
    const customFolderName1 = 'CUSTOM_FOLDER_1'
    const customFolderName2 = 'CUSTOM_FOLDER_2'
    const expectedFolderNames = [
      expect.stringContaining('CUSTOM'),
      expect.stringContaining('CUSTOM'),
      'INBOX',
      'SENT',
      'TRASH',
      'OUTBOX',
    ]
    const expectedFolderCustomNames = [
      customFolderName1,
      customFolderName2,
      undefined,
      undefined,
      undefined,
      undefined,
    ]
    const customFolder1 = await instanceUnderTest.createCustomEmailFolder({
      emailAddressId: emailAddress.id,
      customFolderName: customFolderName1,
    })
    const sub = await userClient.getSubject()
    expect(customFolder1.id).toBeDefined()
    expect(customFolder1.owner).toStrictEqual(sub)
    expect(customFolder1.owners[0].id).toStrictEqual(sudo.id)
    expect(customFolder1.owners[0].issuer).toStrictEqual(sudoIssuer)
    expect(customFolder1.customFolderName).toBeDefined()
    expect(customFolder1.customFolderName).toStrictEqual(customFolderName1)

    const customFolder2 = await instanceUnderTest.createCustomEmailFolder({
      emailAddressId: emailAddress.id,
      customFolderName: customFolderName2,
    })
    expect(customFolder2.id).toBeDefined()
    expect(customFolder2.owner).toStrictEqual(sub)
    expect(customFolder2.owners[0].id).toStrictEqual(sudo.id)
    expect(customFolder2.owners[0].issuer).toStrictEqual(sudoIssuer)
    expect(customFolder2.customFolderName).toBeDefined()
    expect(customFolder2.customFolderName).toStrictEqual(customFolderName2)

    const updatedEmailAddress = await instanceUnderTest.getEmailAddress({
      id: emailAddress.id,
    })

    expect(updatedEmailAddress?.folders.length).toBeGreaterThanOrEqual(
      expectedFolderNames.length,
    )
    expect(updatedEmailAddress?.folders.map((f) => f.folderName)).toEqual(
      expect.arrayContaining(expectedFolderNames),
    )

    // Standard folders do not have the 'customFolderName' attribute populated
    expect(updatedEmailAddress?.folders.map((f) => f.customFolderName)).toEqual(
      expect.arrayContaining(expectedFolderCustomNames),
    )
  })
})
