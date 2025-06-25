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
import {
  CachePolicy,
  SudoCryptoProvider,
  SudoKeyManager,
} from '@sudoplatform/sudo-common'
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
import { GetSupportedEmailDomainsUseCase } from '../../../src/private/domain/use-cases/emailDomain/getSupportedEmailDomainsUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/emailDomain/getSupportedEmailDomainsUseCase',
)
const JestMockGetSupportedEmailDomainsUseCase =
  GetSupportedEmailDomainsUseCase as jest.MockedClass<
    typeof GetSupportedEmailDomainsUseCase
  >

describe('SudoEmailClient.getSupportedEmailDomains Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockGetSupportedEmailDomainsUseCase =
    mock<GetSupportedEmailDomainsUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockGetSupportedEmailDomainsUseCase)

    JestMockGetSupportedEmailDomainsUseCase.mockClear()

    JestMockGetSupportedEmailDomainsUseCase.mockImplementation(() =>
      instance(mockGetSupportedEmailDomainsUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockGetSupportedEmailDomainsUseCase.execute(anything())).thenResolve([
      { domain: 'domain.com' },
    ])
  })
  it('generates use case', async () => {
    await instanceUnderTest.getSupportedEmailDomains(CachePolicy.CacheOnly)
    expect(JestMockGetSupportedEmailDomainsUseCase).toHaveBeenCalledTimes(1)
  })
  it('calls use case as expected', async () => {
    await instanceUnderTest.getSupportedEmailDomains(CachePolicy.CacheOnly)
    verify(mockGetSupportedEmailDomainsUseCase.execute(anything())).once()
    const [actualCachePolicy] = capture(
      mockGetSupportedEmailDomainsUseCase.execute,
    ).first()
    expect(actualCachePolicy).toEqual(CachePolicy.CacheOnly)
  })
  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.getSupportedEmailDomains(CachePolicy.CacheOnly),
    ).resolves.toEqual(['domain.com'])
  })
})
