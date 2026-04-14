/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DefaultConfigurationManager,
  SudoCryptoProvider,
  SudoKeyManager,
} from '@sudoplatform/sudo-common'
import { SudoUserClient, internal as userSdk } from '@sudoplatform/sudo-user'
import { WebSudoCryptoProvider } from '@sudoplatform/sudo-web-crypto-provider'
import { instance, mock, reset } from 'ts-mockito'
import { Mocked, MockedClass } from 'vitest'
import { DefaultEmailAccountService } from '../../../src/private/data/account/defaultEmailAccountService'
import { DefaultEmailAddressBlocklistService } from '../../../src/private/data/blocklist/defaultEmailAddressBlocklistService'
import { ApiClient } from '../../../src/private/data/common/apiClient'
import { EmailServiceConfig } from '../../../src/private/data/common/config'
import { DefaultDeviceKeyWorker } from '../../../src/private/data/common/deviceKeyWorker'
import { DefaultConfigurationDataService } from '../../../src/private/data/configuration/defaultConfigurationDataService'
import { DefaultEmailDomainService } from '../../../src/private/data/emailDomain/defaultEmailDomainService'
import { DefaultEmailFolderService } from '../../../src/private/data/folder/defaultEmailFolderService'
import { DefaultEmailMessageService } from '../../../src/private/data/message/defaultEmailMessageService'
import { DefaultSudoEmailClient } from '../../../src/public'

// Constructor mocks

vi.mock(
  '../../../src/private/data/configuration/defaultConfigurationDataService',
)
const ViMockDefaultConfigurationDataService =
  DefaultConfigurationDataService as MockedClass<
    typeof DefaultConfigurationDataService
  >
vi.mock('../../../src/private/data/account/defaultEmailAccountService')
const ViMockDefaultEmailAccountService =
  DefaultEmailAccountService as MockedClass<typeof DefaultEmailAccountService>
vi.mock('../../../src/private/data/emailDomain/defaultEmailDomainService')
const ViMockDefaultEmailDomainService =
  DefaultEmailDomainService as MockedClass<typeof DefaultEmailDomainService>
vi.mock('../../../src/private/data/folder/defaultEmailFolderService')
const ViMockDefaultEmailFolderService =
  DefaultEmailFolderService as MockedClass<typeof DefaultEmailFolderService>
vi.mock('../../../src/private/data/message/defaultEmailMessageService')
const ViMockDefaultEmailMessageService =
  DefaultEmailMessageService as MockedClass<typeof DefaultEmailMessageService>
vi.mock(
  '../../../src/private/data/blocklist/defaultEmailAddressBlocklistService',
)
const ViMockDefaultEmailAddressBlocklistService =
  DefaultEmailAddressBlocklistService as MockedClass<
    typeof DefaultEmailAddressBlocklistService
  >
vi.mock('../../../src/private/data/common/apiClient')
const ViMockApiClient = ApiClient as MockedClass<typeof ApiClient>
vi.mock('@sudoplatform/sudo-web-crypto-provider')
const ViMockWebSudoCryptoProvider = WebSudoCryptoProvider as MockedClass<
  typeof WebSudoCryptoProvider
>
vi.mock('@sudoplatform/sudo-user')
const ViMockUserConfig = userSdk as Mocked<typeof userSdk>
vi.mock('../../../src/private/data/common/deviceKeyWorker')
const ViMockDeviceKeyWorker = DefaultDeviceKeyWorker as MockedClass<
  typeof DefaultDeviceKeyWorker
>

describe('SudoEmailClient Test Suite', () => {
  // Opt Mocks
  const mockSudoUserClient = mock<SudoUserClient>()
  const mockSudoCryptoProvider = mock<SudoCryptoProvider>()
  const mockSudoKeyManager = mock<SudoKeyManager>()
  const mockApiClient = mock<ApiClient>()

  // Mocks generated inside of constructor
  const mockEmailAccountService = mock<DefaultEmailAccountService>()
  const mockEmailDomainService = mock<DefaultEmailDomainService>()
  const mockEmailFolderService = mock<DefaultEmailFolderService>()
  const mockEmailMessageService = mock<DefaultEmailMessageService>()
  const mockConfigurationDataService = mock<DefaultConfigurationDataService>()
  const mockEmailAddressBlocklistService =
    mock<DefaultEmailAddressBlocklistService>()

  const mockIdentityServiceConfig: userSdk.IdentityServiceConfig = {
    region: 'region',
    poolId: 'poolId',
    clientId: 'clientId',
    identityPoolId: 'identityPoolId',
    apiUrl: 'apiUrl',
    transientBucket: 'transientBucket',
    registrationMethods: [],
    bucket: 'bucket',
  }

  const mockEmailServiceConfig: EmailServiceConfig = {
    region: 'region',
    apiUrl: 'apiUrl',
    transientBucket: 'transientBucket',
    bucket: 'bucket',
  }
  DefaultConfigurationManager.getInstance().setConfig(
    JSON.stringify({
      identityService: mockIdentityServiceConfig,
      emService: mockEmailServiceConfig,
    }),
  )

  const resetMocks = (): void => {
    reset(mockSudoUserClient)
    reset(mockSudoCryptoProvider)
    reset(mockSudoKeyManager)
    reset(mockApiClient)
    reset(mockEmailAccountService)
    reset(mockEmailDomainService)
    reset(mockEmailFolderService)
    reset(mockEmailMessageService)
    reset(mockConfigurationDataService)
    reset(mockEmailAddressBlocklistService)

    ViMockDefaultEmailAccountService.mockClear()
    ViMockDefaultEmailDomainService.mockClear()
    ViMockDefaultEmailFolderService.mockClear()
    ViMockDefaultEmailMessageService.mockClear()
    ViMockDefaultConfigurationDataService.mockClear()
    ViMockDefaultEmailAddressBlocklistService.mockClear()
    ViMockApiClient.mockClear()
    ViMockWebSudoCryptoProvider.mockClear()
    ViMockDeviceKeyWorker.mockClear()
    ViMockUserConfig.getIdentityServiceConfig.mockClear()

    ViMockDefaultConfigurationDataService.mockImplementation(function () {
      return instance(mockConfigurationDataService)
    })
    ViMockDefaultEmailAccountService.mockImplementation(function () {
      return instance(mockEmailAccountService)
    })
    ViMockDefaultEmailDomainService.mockImplementation(function () {
      return instance(mockEmailDomainService)
    })
    ViMockDefaultEmailFolderService.mockImplementation(function () {
      return instance(mockEmailFolderService)
    })
    ViMockDefaultEmailMessageService.mockImplementation(function () {
      return instance(mockEmailMessageService)
    })
    ViMockDefaultEmailAddressBlocklistService.mockImplementation(function () {
      return instance(mockEmailAddressBlocklistService)
    })
    ViMockApiClient.mockImplementation(function () {
      return instance(mockApiClient)
    })
    ViMockUserConfig.getIdentityServiceConfig.mockImplementation(() => ({
      identityService: mockIdentityServiceConfig,
    }))
  }

  beforeEach(() => {
    resetMocks()
  })

  describe('constructor', () => {
    beforeEach(() => {
      resetMocks()
    })
    it('constructs itself correctly', () => {
      new DefaultSudoEmailClient({
        sudoUserClient: instance(mockSudoUserClient),
      })
      expect(ViMockApiClient).toHaveBeenCalledTimes(1)
      expect(ViMockWebSudoCryptoProvider).toHaveBeenCalledTimes(1)
      expect(ViMockWebSudoCryptoProvider).toHaveBeenCalledWith(
        'SudoEmailClient',
        'com.sudoplatform.appservicename',
      )
      expect(ViMockUserConfig.getIdentityServiceConfig).toHaveBeenCalledTimes(1)
      expect(ViMockDefaultEmailAccountService).toHaveBeenCalledTimes(1)
      expect(ViMockDefaultEmailDomainService).toHaveBeenCalledTimes(1)
      expect(ViMockDefaultEmailFolderService).toHaveBeenCalledTimes(1)
      expect(ViMockDefaultEmailMessageService).toHaveBeenCalledTimes(1)
      expect(ViMockDefaultEmailAddressBlocklistService).toHaveBeenCalledTimes(1)
    })
  })
})
