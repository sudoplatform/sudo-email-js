/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { DefaultLogger } from '@sudoplatform/sudo-common'
import {
  AddressNotFoundError,
  CustomEmailFolderUpdateValuesInput,
  EmailAddress,
  EmailFolder,
  EmailFolderNotFoundError,
  InvalidAddressError,
  SudoEmailClient,
} from '../../../src'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import { v4 } from 'uuid'

describe('SudoEmailClient DeleteCustomEmailFolder Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  const ootoSimulatorAddress = 'ooto@simulator.amazonses.com'
  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string
  let emailAddress: EmailAddress
  const customFolderName = 'CUSTOM_FOLDER'
  const updatedCustomFolderName = 'UPDATED_CUSTOM_FOLDER'
  let customFolder: EmailFolder

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
    customFolder = await instanceUnderTest.createCustomEmailFolder({
      emailAddressId: emailAddress.id,
      customFolderName: customFolderName,
    })
  })

  afterEach(async () => {
    await teardown(
      { emailAddresses: [emailAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  test('update custom email folder should return updated folder on success', async () => {
    const inputValues: CustomEmailFolderUpdateValuesInput = {
      customFolderName: updatedCustomFolderName,
    }

    const result = await instanceUnderTest.updateCustomEmailFolder({
      emailAddressId: emailAddress.id,
      emailFolderId: customFolder.id,
      values: inputValues,
    })

    expect(result.id).toEqual(customFolder.id)
    expect(result.customFolderName).toEqual(updatedCustomFolderName)
  })

  test('should throw EmailFolderNotFoundError for non-existant folder id', async () => {
    const inputValues: CustomEmailFolderUpdateValuesInput = {
      customFolderName: updatedCustomFolderName,
    }

    await expect(
      instanceUnderTest.updateCustomEmailFolder({
        emailAddressId: emailAddress.id,
        emailFolderId: v4(),
        values: inputValues,
      }),
    ).rejects.toBeInstanceOf(EmailFolderNotFoundError)
  })

  test('should throw AddressNotFoundError for non-existant email address id', async () => {
    const inputValues: CustomEmailFolderUpdateValuesInput = {
      customFolderName: updatedCustomFolderName,
    }

    await expect(
      instanceUnderTest.updateCustomEmailFolder({
        emailAddressId: v4(),
        emailFolderId: customFolder.id,
        values: inputValues,
      }),
    ).rejects.toBeInstanceOf(AddressNotFoundError)
  })
})
