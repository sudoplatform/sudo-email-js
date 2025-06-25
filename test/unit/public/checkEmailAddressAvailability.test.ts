/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { SudoUserClient, internal as userSdk } from '@sudoplatform/sudo-user'
import {
  anything,
  capture,
  instance,
  mock,
  reset,
  verify,
  when,
} from 'ts-mockito'
import { DefaultSudoEmailClient, SudoEmailClient } from '../../../src'
import { PrivateSudoEmailClientOptions } from '../../../src/private/data/common/privateSudoEmailClientOptions'
import { SudoCryptoProvider, SudoKeyManager } from '@sudoplatform/sudo-common'
import { ApiClient } from '../../../src/private/data/common/apiClient'
import { EmailServiceConfig } from '../../../src/private/data/common/config'
import { DefaultEmailAccountService } from '../../../src/private/data/account/defaultEmailAccountService'
import { DefaultEmailDomainService } from '../../../src/private/data/emailDomain/defaultEmailDomainService'
import { DefaultEmailFolderService } from '../../../src/private/data/folder/defaultEmailFolderService'
import { DefaultEmailMessageService } from '../../../src/private/data/message/defaultEmailMessageService'
import { DefaultConfigurationDataService } from '../../../src/private/data/configuration/defaultConfigurationDataService'
import { DefaultEmailAddressBlocklistService } from '../../../src/private/data/blocklist/defaultEmailAddressBlocklistService'
import { WebSudoCryptoProvider } from '@sudoplatform/sudo-web-crypto-provider'
import { DefaultDeviceKeyWorker } from '../../../src/private/data/common/deviceKeyWorker'
import { EntityDataFactory } from '../data-factory/entity'
import { v4 } from 'uuid'
import { APIDataFactory } from '../data-factory/api'
import { CheckEmailAddressAvailabilityUseCase } from '../../../src/private/domain/use-cases/account/checkEmailAddressAvailabilityUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/account/checkEmailAddressAvailabilityUseCase',
)
const JestMockCheckEmailAddressAvailabilityUseCase =
  CheckEmailAddressAvailabilityUseCase as jest.MockedClass<
    typeof CheckEmailAddressAvailabilityUseCase
  >

describe('SudoEmailClient.checkEmailAddressAvailability Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockCheckEmailAddressAvailabilityUseCase =
    mock<CheckEmailAddressAvailabilityUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockCheckEmailAddressAvailabilityUseCase)

    JestMockCheckEmailAddressAvailabilityUseCase.mockClear()

    JestMockCheckEmailAddressAvailabilityUseCase.mockImplementation(() =>
      instance(mockCheckEmailAddressAvailabilityUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(
      mockCheckEmailAddressAvailabilityUseCase.execute(anything()),
    ).thenResolve([{ emailAddress: 'test@example.com' }])
  })
  it('generates use case', async () => {
    await instanceUnderTest.checkEmailAddressAvailability({
      localParts: new Set(['']),
      domains: new Set(['']),
    })
    expect(JestMockCheckEmailAddressAvailabilityUseCase).toHaveBeenCalledTimes(
      1,
    )
  })
  it('calls use case as expected', async () => {
    const localPart = v4()
    const localParts = new Set([localPart])
    const domain = v4()
    const domains = new Set([domain])
    await instanceUnderTest.checkEmailAddressAvailability({
      localParts,
      domains,
    })
    verify(mockCheckEmailAddressAvailabilityUseCase.execute(anything())).once()
    const [actualUseCaseArgs] = capture(
      mockCheckEmailAddressAvailabilityUseCase.execute,
    ).first()
    expect(actualUseCaseArgs).toEqual<typeof actualUseCaseArgs>({
      localParts: [localPart],
      domains: [{ domain }],
    })
  })
  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.checkEmailAddressAvailability({
        localParts: new Set(),
        domains: new Set(),
      }),
    ).resolves.toEqual(['test@example.com'])
  })
})
