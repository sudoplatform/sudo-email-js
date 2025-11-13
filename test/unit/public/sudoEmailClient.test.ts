/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
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

jest.mock(
  '../../../src/private/data/configuration/defaultConfigurationDataService',
)
const JestMockDefaultConfigurationDataService =
  DefaultConfigurationDataService as jest.MockedClass<
    typeof DefaultConfigurationDataService
  >
jest.mock('../../../src/private/data/account/defaultEmailAccountService')
const JestMockDefaultEmailAccountService =
  DefaultEmailAccountService as jest.MockedClass<
    typeof DefaultEmailAccountService
  >
jest.mock('../../../src/private/data/emailDomain/defaultEmailDomainService')
const JestMockDefaultEmailDomainService =
  DefaultEmailDomainService as jest.MockedClass<
    typeof DefaultEmailDomainService
  >
jest.mock('../../../src/private/data/folder/defaultEmailFolderService')
const JestMockDefaultEmailFolderService =
  DefaultEmailFolderService as jest.MockedClass<
    typeof DefaultEmailFolderService
  >
jest.mock('../../../src/private/data/message/defaultEmailMessageService')
const JestMockDefaultEmailMessageService =
  DefaultEmailMessageService as jest.MockedClass<
    typeof DefaultEmailMessageService
  >
jest.mock(
  '../../../src/private/data/blocklist/defaultEmailAddressBlocklistService',
)
const JestMockDefaultEmailAddressBlocklistService =
  DefaultEmailAddressBlocklistService as jest.MockedClass<
    typeof DefaultEmailAddressBlocklistService
  >
jest.mock('../../../src/private/data/common/apiClient')
const JestMockApiClient = ApiClient as jest.MockedClass<typeof ApiClient>
jest.mock('@sudoplatform/sudo-web-crypto-provider')
const JestMockWebSudoCryptoProvider = WebSudoCryptoProvider as jest.MockedClass<
  typeof WebSudoCryptoProvider
>
jest.mock('@sudoplatform/sudo-user')
const JestMockUserConfig = userSdk as jest.Mocked<typeof userSdk>
jest.mock('../../../src/private/data/common/deviceKeyWorker')
const JestMockDeviceKeyWorker = DefaultDeviceKeyWorker as jest.MockedClass<
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

    JestMockDefaultEmailAccountService.mockClear()
    JestMockDefaultEmailDomainService.mockClear()
    JestMockDefaultEmailFolderService.mockClear()
    JestMockDefaultEmailMessageService.mockClear()
    JestMockDefaultConfigurationDataService.mockClear()
    JestMockDefaultEmailAddressBlocklistService.mockClear()
    JestMockApiClient.mockClear()
    JestMockWebSudoCryptoProvider.mockClear()
    JestMockDeviceKeyWorker.mockClear()
    JestMockUserConfig.getIdentityServiceConfig.mockClear()

    JestMockDefaultConfigurationDataService.mockImplementation(() =>
      instance(mockConfigurationDataService),
    )
    JestMockDefaultEmailAccountService.mockImplementation(() =>
      instance(mockEmailAccountService),
    )
    JestMockDefaultEmailDomainService.mockImplementation(() =>
      instance(mockEmailDomainService),
    )
    JestMockDefaultEmailFolderService.mockImplementation(() =>
      instance(mockEmailFolderService),
    )
    JestMockDefaultEmailMessageService.mockImplementation(() =>
      instance(mockEmailMessageService),
    )
    JestMockDefaultEmailAddressBlocklistService.mockImplementation(() =>
      instance(mockEmailAddressBlocklistService),
    )
    JestMockApiClient.mockImplementation(() => instance(mockApiClient))
    JestMockUserConfig.getIdentityServiceConfig.mockImplementation(() => ({
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
      expect(JestMockApiClient).toHaveBeenCalledTimes(1)
      expect(JestMockWebSudoCryptoProvider).toHaveBeenCalledTimes(1)
      expect(JestMockWebSudoCryptoProvider).toHaveBeenCalledWith(
        'SudoEmailClient',
        'com.sudoplatform.appservicename',
      )
      expect(JestMockUserConfig.getIdentityServiceConfig).toHaveBeenCalledTimes(
        1,
      )
      expect(JestMockDefaultEmailAccountService).toHaveBeenCalledTimes(1)
      expect(JestMockDefaultEmailDomainService).toHaveBeenCalledTimes(1)
      expect(JestMockDefaultEmailFolderService).toHaveBeenCalledTimes(1)
      expect(JestMockDefaultEmailMessageService).toHaveBeenCalledTimes(1)
      expect(JestMockDefaultEmailAddressBlocklistService).toHaveBeenCalledTimes(
        1,
      )
    })
  })
})
