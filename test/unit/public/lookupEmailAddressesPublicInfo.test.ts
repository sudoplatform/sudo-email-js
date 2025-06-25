/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { PublicKeyFormat } from '@sudoplatform/sudo-common'
import { anything, capture, instance, mock, reset, when } from 'ts-mockito'
import { EmailAddressPublicInfo, SudoEmailClient } from '../../../src'
import { LookupEmailAddressesPublicInfoUseCase } from '../../../src/private/domain/use-cases/account/lookupEmailAddressesPublicInfoUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/account/lookupEmailAddressesPublicInfoUseCase',
)
const JestMockLookupEmailAddressesPublicInfoUseCase =
  LookupEmailAddressesPublicInfoUseCase as jest.MockedClass<
    typeof LookupEmailAddressesPublicInfoUseCase
  >

describe('SudoEmailClient.lookupEmailAddressesPublicInfo Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockLookupEmailAddressesPublicInfoUseCase =
    mock<LookupEmailAddressesPublicInfoUseCase>()
  const emailAddresses = ['test1@email.com', 'test2@email.com']
  const publicKeys = ['testPublicKey-1', 'testPublicKey-2']
  const publicInfo: EmailAddressPublicInfo[] = [
    {
      emailAddress: emailAddresses[0],
      keyId: 'testKeyId',
      publicKey: publicKeys[0],
      publicKeyDetails: {
        publicKey: publicKeys[0],
        keyFormat: PublicKeyFormat.RSAPublicKey,
        algorithm: 'testAlgorithm',
      },
    },
    {
      emailAddress: emailAddresses[1],
      keyId: 'testKeyId_2',
      publicKey: publicKeys[1],
      publicKeyDetails: {
        publicKey: publicKeys[1],
        keyFormat: PublicKeyFormat.SPKI,
        algorithm: 'testAlgorithm_2',
      },
    },
  ]

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockLookupEmailAddressesPublicInfoUseCase)

    JestMockLookupEmailAddressesPublicInfoUseCase.mockClear()

    JestMockLookupEmailAddressesPublicInfoUseCase.mockImplementation(() =>
      instance(mockLookupEmailAddressesPublicInfoUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(
      mockLookupEmailAddressesPublicInfoUseCase.execute(anything()),
    ).thenResolve(publicInfo)
  })

  it('generates use case', async () => {
    await instanceUnderTest.lookupEmailAddressesPublicInfo({
      emailAddresses,
    })

    expect(JestMockLookupEmailAddressesPublicInfoUseCase).toHaveBeenCalledTimes(
      1,
    )
  })

  it('calls use case as expected', async () => {
    await instanceUnderTest.lookupEmailAddressesPublicInfo({
      emailAddresses,
    })

    const [actualArgs] = capture(
      mockLookupEmailAddressesPublicInfoUseCase.execute,
    ).first()
    expect(actualArgs).toEqual<typeof actualArgs>({
      emailAddresses,
    })
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.lookupEmailAddressesPublicInfo({
        emailAddresses,
      }),
    ).resolves.toStrictEqual<EmailAddressPublicInfo[]>(publicInfo)

    const [actualArgs] = capture(
      mockLookupEmailAddressesPublicInfoUseCase.execute,
    ).first()
    expect(actualArgs).toEqual({
      emailAddresses,
    })
  })
})
