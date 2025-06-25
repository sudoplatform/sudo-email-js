/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { SudoUserClient, internal as userSdk } from '@sudoplatform/sudo-user'
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

jest.mock(
  '../../src/private/data/configuration/defaultConfigurationDataService',
)
jest.mock('../../src/private/data/account/defaultEmailAccountService')
jest.mock('../../src/private/data/emailDomain/defaultEmailDomainService')
jest.mock('../../src/private/data/folder/defaultEmailFolderService')
jest.mock('../../src/private/data/message/defaultEmailMessageService')
jest.mock(
  '../../src/private/data/blocklist/defaultEmailAddressBlocklistService',
)
jest.mock('../../src/private/data/common/apiClient')
jest.mock('@sudoplatform/sudo-web-crypto-provider')
jest.mock('@sudoplatform/sudo-user')
jest.mock('../../src/private/data/common/deviceKeyWorker')

export class SudoEmailClientTestBase {
  private JestMockDefaultConfigurationDataService =
    DefaultConfigurationDataService as jest.MockedClass<
      typeof DefaultConfigurationDataService
    >
  private JestMockDefaultEmailAccountService =
    DefaultEmailAccountService as jest.MockedClass<
      typeof DefaultEmailAccountService
    >
  private JestMockDefaultEmailDomainService =
    DefaultEmailDomainService as jest.MockedClass<
      typeof DefaultEmailDomainService
    >
  private JestMockDefaultEmailFolderService =
    DefaultEmailFolderService as jest.MockedClass<
      typeof DefaultEmailFolderService
    >
  private JestMockDefaultEmailMessageService =
    DefaultEmailMessageService as jest.MockedClass<
      typeof DefaultEmailMessageService
    >
  private JestMockDefaultEmailAddressBlocklistService =
    DefaultEmailAddressBlocklistService as jest.MockedClass<
      typeof DefaultEmailAddressBlocklistService
    >
  private JestMockApiClient = ApiClient as jest.MockedClass<typeof ApiClient>
  private JestMockWebSudoCryptoProvider =
    WebSudoCryptoProvider as jest.MockedClass<typeof WebSudoCryptoProvider>
  private JestMockUserConfig = userSdk as jest.Mocked<typeof userSdk>
  private JestMockDeviceKeyWorker = DefaultDeviceKeyWorker as jest.MockedClass<
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
    apiKey: 'apiKey',
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

    this.JestMockDefaultEmailAccountService.mockClear()
    this.JestMockDefaultEmailDomainService.mockClear()
    this.JestMockDefaultEmailFolderService.mockClear()
    this.JestMockDefaultEmailMessageService.mockClear()
    this.JestMockDefaultConfigurationDataService.mockClear()
    this.JestMockDefaultEmailAddressBlocklistService.mockClear()
    this.JestMockApiClient.mockClear()
    this.JestMockWebSudoCryptoProvider.mockClear()
    this.JestMockDeviceKeyWorker.mockClear()
    this.JestMockUserConfig.getIdentityServiceConfig.mockClear()

    this.JestMockDefaultConfigurationDataService.mockImplementation(() =>
      instance(this.mockConfigurationDataService),
    )
    this.JestMockDefaultEmailAccountService.mockImplementation(() =>
      instance(this.mockEmailAccountService),
    )
    this.JestMockDefaultEmailDomainService.mockImplementation(() =>
      instance(this.mockEmailDomainService),
    )
    this.JestMockDefaultEmailFolderService.mockImplementation(() =>
      instance(this.mockEmailFolderService),
    )
    this.JestMockDefaultEmailMessageService.mockImplementation(() =>
      instance(this.mockEmailMessageService),
    )
    this.JestMockDefaultEmailAddressBlocklistService.mockImplementation(() =>
      instance(this.mockEmailAddressBlocklistService),
    )
    this.JestMockApiClient.mockImplementation(() =>
      instance(this.mockApiClient),
    )
    this.JestMockUserConfig.getIdentityServiceConfig.mockImplementation(() => ({
      identityService: this.mockIdentityServiceConfig,
    }))
  }
}
