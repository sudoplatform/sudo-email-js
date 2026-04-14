/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { SudoUserClient, internal as userSdk } from '@sudoplatform/sudo-user'
import { vi, type MockedClass, type Mocked } from 'vitest'
import { DefaultSudoEmailClient, SudoEmailClient } from '../../src'
import { PrivateSudoEmailClientOptions } from '../../src/private/data/common/privateSudoEmailClientOptions'
import {
  DefaultConfigurationManager,
  SudoCryptoProvider,
  SudoKeyManager,
} from '@sudoplatform/sudo-common'
import { ApiClient } from '../../src/private/data/common/apiClient'
import { EmailServiceConfig } from '../../src/private/data/common/config'
import { DefaultEmailAccountService } from '../../src/private/data/account/defaultEmailAccountService'
import { DefaultEmailDomainService } from '../../src/private/data/emailDomain/defaultEmailDomainService'
import { DefaultEmailFolderService } from '../../src/private/data/folder/defaultEmailFolderService'
import { DefaultEmailMessageService } from '../../src/private/data/message/defaultEmailMessageService'
import { DefaultConfigurationDataService } from '../../src/private/data/configuration/defaultConfigurationDataService'
import { DefaultEmailAddressBlocklistService } from '../../src/private/data/blocklist/defaultEmailAddressBlocklistService'
import { WebSudoCryptoProvider } from '@sudoplatform/sudo-web-crypto-provider'
import { DefaultDeviceKeyWorker } from '../../src/private/data/common/deviceKeyWorker'
import { instance, mock, reset } from 'ts-mockito'

vi.mock('../../src/private/data/configuration/defaultConfigurationDataService')
vi.mock('../../src/private/data/account/defaultEmailAccountService')
vi.mock('../../src/private/data/emailDomain/defaultEmailDomainService')
vi.mock('../../src/private/data/folder/defaultEmailFolderService')
vi.mock('../../src/private/data/message/defaultEmailMessageService')
vi.mock('../../src/private/data/blocklist/defaultEmailAddressBlocklistService')
vi.mock('../../src/private/data/common/apiClient')
vi.mock('@sudoplatform/sudo-web-crypto-provider')
vi.mock('@sudoplatform/sudo-user')
vi.mock('../../src/private/data/common/deviceKeyWorker')

export class SudoEmailClientTestBase {
  private ViMockDefaultConfigurationDataService =
    DefaultConfigurationDataService as MockedClass<
      typeof DefaultConfigurationDataService
    >
  private ViMockDefaultEmailAccountService =
    DefaultEmailAccountService as MockedClass<typeof DefaultEmailAccountService>
  private ViMockDefaultEmailDomainService =
    DefaultEmailDomainService as MockedClass<typeof DefaultEmailDomainService>
  private ViMockDefaultEmailFolderService =
    DefaultEmailFolderService as MockedClass<typeof DefaultEmailFolderService>
  private ViMockDefaultEmailMessageService =
    DefaultEmailMessageService as MockedClass<typeof DefaultEmailMessageService>
  private ViMockDefaultEmailAddressBlocklistService =
    DefaultEmailAddressBlocklistService as MockedClass<
      typeof DefaultEmailAddressBlocklistService
    >
  private ViMockApiClient = ApiClient as MockedClass<typeof ApiClient>
  private ViMockWebSudoCryptoProvider = WebSudoCryptoProvider as MockedClass<
    typeof WebSudoCryptoProvider
  >
  private ViMockUserConfig = userSdk as Mocked<typeof userSdk>
  private ViMockDeviceKeyWorker = DefaultDeviceKeyWorker as MockedClass<
    typeof DefaultDeviceKeyWorker
  >
  private mockSudoUserClient: SudoUserClient
  private mockSudoCryptoProvider: SudoCryptoProvider
  private mockSudoKeyManager: SudoKeyManager
  private mockApiClient: ApiClient

  private mockEmailAccountService: DefaultEmailAccountService
  private mockEmailDomainService: DefaultEmailDomainService
  private mockEmailFolderService: DefaultEmailFolderService
  private mockEmailMessageService: DefaultEmailMessageService
  private mockConfigurationDataService: DefaultConfigurationDataService
  private mockEmailAddressBlocklistService: DefaultEmailAddressBlocklistService

  private mockIdentityServiceConfig: userSdk.IdentityServiceConfig = {
    region: 'region',
    poolId: 'poolId',
    clientId: 'clientId',
    identityPoolId: 'identityPoolId',
    apiUrl: 'apiUrl',
    transientBucket: 'transientBucket',
    registrationMethods: [],
    bucket: 'bucket',
  }

  private mockEmailServiceConfig: EmailServiceConfig = {
    region: 'region',
    apiUrl: 'apiUrl',
    transientBucket: 'transientBucket',
    bucket: 'bucket',
  }

  public constructor() {
    this.mockSudoUserClient = mock<SudoUserClient>()
    this.mockSudoCryptoProvider = mock<SudoCryptoProvider>()
    this.mockSudoKeyManager = mock<SudoKeyManager>()
    this.mockApiClient = mock<ApiClient>()

    this.mockEmailAccountService = mock<DefaultEmailAccountService>()
    this.mockEmailDomainService = mock<DefaultEmailDomainService>()
    this.mockEmailFolderService = mock<DefaultEmailFolderService>()
    this.mockEmailMessageService = mock<DefaultEmailMessageService>()
    this.mockConfigurationDataService = mock<DefaultConfigurationDataService>()
    this.mockEmailAddressBlocklistService =
      mock<DefaultEmailAddressBlocklistService>()
    DefaultConfigurationManager.getInstance().setConfig(
      JSON.stringify({
        identityService: this.mockIdentityServiceConfig,
        emService: this.mockEmailServiceConfig,
      }),
    )
  }

  public getInstanceUnderTest(): SudoEmailClient {
    this.resetMocks()
    const options: PrivateSudoEmailClientOptions = {
      sudoUserClient: instance(this.mockSudoUserClient),
      sudoCryptoProvider: instance(this.mockSudoCryptoProvider),
      sudoKeyManager: instance(this.mockSudoKeyManager),
      apiClient: instance(this.mockApiClient),
      identityServiceConfig: this.mockIdentityServiceConfig,
      emailServiceConfig: this.mockEmailServiceConfig,
    }
    return new DefaultSudoEmailClient(options)
  }

  public resetMocks(): void {
    reset(this.mockSudoUserClient)
    reset(this.mockSudoCryptoProvider)
    reset(this.mockSudoKeyManager)
    reset(this.mockApiClient)
    reset(this.mockEmailAccountService)
    reset(this.mockEmailDomainService)
    reset(this.mockEmailFolderService)
    reset(this.mockEmailMessageService)
    reset(this.mockConfigurationDataService)
    reset(this.mockEmailAddressBlocklistService)

    this.ViMockDefaultEmailAccountService.mockClear()
    this.ViMockDefaultEmailDomainService.mockClear()
    this.ViMockDefaultEmailFolderService.mockClear()
    this.ViMockDefaultEmailMessageService.mockClear()
    this.ViMockDefaultConfigurationDataService.mockClear()
    this.ViMockDefaultEmailAddressBlocklistService.mockClear()
    this.ViMockApiClient.mockClear()
    this.ViMockWebSudoCryptoProvider.mockClear()
    this.ViMockDeviceKeyWorker.mockClear()
    this.ViMockUserConfig.getIdentityServiceConfig.mockClear()

    const mockConfigurationDataServiceInstance = instance(
      this.mockConfigurationDataService,
    )
    const mockEmailAccountServiceInstance = instance(
      this.mockEmailAccountService,
    )
    const mockEmailDomainServiceInstance = instance(this.mockEmailDomainService)
    const mockEmailFolderServiceInstance = instance(this.mockEmailFolderService)
    const mockEmailMessageServiceInstance = instance(
      this.mockEmailMessageService,
    )
    const mockEmailAddressBlocklistServiceInstance = instance(
      this.mockEmailAddressBlocklistService,
    )
    const mockApiClientInstance = instance(this.mockApiClient)

    this.ViMockDefaultConfigurationDataService.mockImplementation(function () {
      return mockConfigurationDataServiceInstance
    })
    this.ViMockDefaultEmailAccountService.mockImplementation(function () {
      return mockEmailAccountServiceInstance
    })
    this.ViMockDefaultEmailDomainService.mockImplementation(function () {
      return mockEmailDomainServiceInstance
    })
    this.ViMockDefaultEmailFolderService.mockImplementation(function () {
      return mockEmailFolderServiceInstance
    })
    this.ViMockDefaultEmailMessageService.mockImplementation(function () {
      return mockEmailMessageServiceInstance
    })
    this.ViMockDefaultEmailAddressBlocklistService.mockImplementation(
      function () {
        return mockEmailAddressBlocklistServiceInstance
      },
    )
    this.ViMockApiClient.mockImplementation(function () {
      return mockApiClientInstance
    })
    this.ViMockUserConfig.getIdentityServiceConfig.mockImplementation(() => ({
      identityService: this.mockIdentityServiceConfig,
    }))
  }
}
