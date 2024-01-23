/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CachePolicy,
  DefaultConfigurationManager,
  SudoCryptoProvider,
  SudoKeyManager,
} from '@sudoplatform/sudo-common'
import { SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { internal as userSdk, SudoUserClient } from '@sudoplatform/sudo-user'
import { WebSudoCryptoProvider } from '@sudoplatform/sudo-web-crypto-provider'
import {
  anything,
  capture,
  instance,
  mock,
  reset,
  verify,
  when,
} from 'ts-mockito'
import { v4 } from 'uuid'

import { UpdateEmailMessagesStatus } from '../../../src/gen/graphqlTypes'
import { DefaultEmailAccountService } from '../../../src/private/data/account/defaultEmailAccountService'
import { ApiClient } from '../../../src/private/data/common/apiClient'
import { EmailServiceConfig } from '../../../src/private/data/common/config'
import { DefaultDeviceKeyWorker } from '../../../src/private/data/common/deviceKeyWorker'
import { PrivateSudoEmailClientOptions } from '../../../src/private/data/common/privateSudoEmailClientOptions'
import { DefaultConfigurationDataService } from '../../../src/private/data/configuration/defaultConfigurationDataService'
import { DefaultEmailFolderService } from '../../../src/private/data/folder/defaultEmailFolderService'
import { DefaultEmailMessageService } from '../../../src/private/data/message/defaultEmailMessageService'
import { CheckEmailAddressAvailabilityUseCase } from '../../../src/private/domain/use-cases/account/checkEmailAddressAvailabilityUseCase'
import { DeprovisionEmailAccountUseCase } from '../../../src/private/domain/use-cases/account/deprovisionEmailAccountUseCase'
import { GetEmailAccountUseCase } from '../../../src/private/domain/use-cases/account/getEmailAccountUseCase'
import { GetSupportedEmailDomainsUseCase } from '../../../src/private/domain/use-cases/account/getSupportedEmailDomainsUseCase'
import { ListEmailAccountsForSudoIdUseCase } from '../../../src/private/domain/use-cases/account/listEmailAccountsForSudoIdUseCase'
import { ListEmailAccountsUseCase } from '../../../src/private/domain/use-cases/account/listEmailAccountsUseCase'
import { ProvisionEmailAccountUseCase } from '../../../src/private/domain/use-cases/account/provisionEmailAccountUseCase'
import { UpdateEmailAccountMetadataUseCase } from '../../../src/private/domain/use-cases/account/updateEmailAccountMetadataUseCase'
import { GetConfigurationDataUseCase } from '../../../src/private/domain/use-cases/configuration/getConfigurationDataUseCase'
import { DeleteDraftEmailMessagesUseCase } from '../../../src/private/domain/use-cases/draft/deleteDraftEmailMessagesUseCase'
import { GetDraftEmailMessageUseCase } from '../../../src/private/domain/use-cases/draft/getDraftEmailMessageUseCase'
import { ListDraftEmailMessageMetadataUseCase } from '../../../src/private/domain/use-cases/draft/listDraftEmailMessageMetadataUseCase'
import { SaveDraftEmailMessageUseCase } from '../../../src/private/domain/use-cases/draft/saveDraftEmailMessageUseCase'
import { UpdateDraftEmailMessageUseCase } from '../../../src/private/domain/use-cases/draft/updateDraftEmailMessageUseCase'
import { ListEmailFoldersForEmailAddressIdUseCase } from '../../../src/private/domain/use-cases/folder/listEmailFoldersForEmailAddressIdUseCase'
import { DeleteEmailMessagesUseCase } from '../../../src/private/domain/use-cases/message/deleteEmailMessagesUseCase'
import { GetEmailMessageRfc822DataUseCase } from '../../../src/private/domain/use-cases/message/getEmailMessageRfc822DataUseCase'
import { GetEmailMessageUseCase } from '../../../src/private/domain/use-cases/message/getEmailMessageUseCase'
import { ListEmailMessagesForEmailAddressIdUseCase } from '../../../src/private/domain/use-cases/message/listEmailMessagesForEmailAddressIdUseCase'
import { ListEmailMessagesForEmailFolderIdUseCase } from '../../../src/private/domain/use-cases/message/listEmailMessagesForEmailFolderIdUseCase'
import { SendEmailMessageUseCase } from '../../../src/private/domain/use-cases/message/sendEmailMessageUseCase'
import { UpdateEmailMessagesUseCase } from '../../../src/private/domain/use-cases/message/updateEmailMessagesUseCase'
import { SubscribeToEmailMessagesUseCase } from '../../../src/private/domain/use-cases/message/subscribeToEmailMessagesUseCase'
import { UnsubscribeFromEmailMessagesUseCase } from '../../../src/private/domain/use-cases/message/unsubscribeFromEmailMessagesUseCase'
import {
  DefaultSudoEmailClient,
  SudoEmailClient,
} from '../../../src/public/sudoEmailClient'
import { BatchOperationResultStatus } from '../../../src/public/typings/batchOperationResult'
import { DraftEmailMessage } from '../../../src/public/typings/draftEmailMessage'
import { DraftEmailMessageMetadata } from '../../../src/public/typings/draftEmailMessageMetadata'
import { SortOrder } from '../../../src/public/typings/sortOrder'
import { str2ab } from '../../util/buffer'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { EmailMessage, InvalidArgumentError } from '../../../src'
import { CreateCustomEmailFolderUseCase } from '../../../src/private/domain/use-cases/folder/createCustomEmailFolderUseCase'
import { LookupEmailAddressesPublicInfoUseCase } from '../../../src/private/domain/use-cases/account/lookupEmailAddressesPublicInfoUseCase'
import { EmailAddressPublicInfo } from '../../../src/public/typings/emailAddressPublicInfo'
import { DefaultEmailAddressBlocklistService } from '../../../src/private/data/blocklist/defaultEmailAddressBlocklistService'
import {
  BlockEmailAddressesUseCase,
  BlockEmailAddressesUseCaseInput,
} from '../../../src/private/domain/use-cases/blocklist/blockEmailAddresses'
import {
  UnblockEmailAddressesUseCase,
  UnblockEmailAddressesUseCaseInput,
} from '../../../src/private/domain/use-cases/blocklist/unblockEmailAddresses'
import { GetEmailAddressBlocklistUseCase } from '../../../src/private/domain/use-cases/blocklist/getEmailAddressBlocklist'

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

// Use case Mocks
jest.mock(
  '../../../src/private/domain/use-cases/configuration/getConfigurationDataUseCase',
)
const JestMockGetConfigurationDataUseCase =
  GetConfigurationDataUseCase as jest.MockedClass<
    typeof GetConfigurationDataUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/account/provisionEmailAccountUseCase',
)
const JestMockProvisionEmailAccountUseCase =
  ProvisionEmailAccountUseCase as jest.MockedClass<
    typeof ProvisionEmailAccountUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/folder/createCustomEmailFolderUseCase',
)
const JestMockCreateCustomEmailFolderUseCase =
  CreateCustomEmailFolderUseCase as jest.MockedClass<
    typeof CreateCustomEmailFolderUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/account/deprovisionEmailAccountUseCase',
)
const JestMockDeprovisionEmailAccountUseCase =
  DeprovisionEmailAccountUseCase as jest.MockedClass<
    typeof DeprovisionEmailAccountUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/account/updateEmailAccountMetadataUseCase',
)
const JestMockUpdateEmailAccountMetadataUseCase =
  UpdateEmailAccountMetadataUseCase as jest.MockedClass<
    typeof UpdateEmailAccountMetadataUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/message/sendEmailMessageUseCase',
)
const JestMockSendEmailMessageUseCase =
  SendEmailMessageUseCase as jest.MockedClass<typeof SendEmailMessageUseCase>
jest.mock(
  '../../../src/private/domain/use-cases/message/deleteEmailMessagesUseCase',
)
const JestMockDeleteEmailMessagesUseCase =
  DeleteEmailMessagesUseCase as jest.MockedClass<
    typeof DeleteEmailMessagesUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/account/getSupportedEmailDomainsUseCase',
)
const JestMockGetSupportedEmailDomainsUseCase =
  GetSupportedEmailDomainsUseCase as jest.MockedClass<
    typeof GetSupportedEmailDomainsUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/account/checkEmailAddressAvailabilityUseCase',
)
const JestMockCheckEmailAddressAvailabilityUseCase =
  CheckEmailAddressAvailabilityUseCase as jest.MockedClass<
    typeof CheckEmailAddressAvailabilityUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/account/getEmailAccountUseCase',
)
const JestMockGetEmailAccountUseCase =
  GetEmailAccountUseCase as jest.MockedClass<typeof GetEmailAccountUseCase>
jest.mock(
  '../../../src/private/domain/use-cases/account/listEmailAccountsUseCase',
)
const JestMockListEmailAccountsUseCase =
  ListEmailAccountsUseCase as jest.MockedClass<typeof ListEmailAccountsUseCase>
jest.mock(
  '../../../src/private/domain/use-cases/account/listEmailAccountsForSudoIdUseCase',
)
const JestMockListEmailAccountsForSudoIdUseCase =
  ListEmailAccountsForSudoIdUseCase as jest.MockedClass<
    typeof ListEmailAccountsForSudoIdUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/folder/listEmailFoldersForEmailAddressIdUseCase',
)
const JestMockLookupEmailAddressesPublicInfoUseCase =
  LookupEmailAddressesPublicInfoUseCase as jest.MockedClass<
    typeof LookupEmailAddressesPublicInfoUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/account/lookupEmailAddressesPublicInfoUseCase',
)
const JestMockListEmailFoldersForEmailAddressIdUseCase =
  ListEmailFoldersForEmailAddressIdUseCase as jest.MockedClass<
    typeof ListEmailFoldersForEmailAddressIdUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/draft/saveDraftEmailMessageUseCase',
)
const JestMockSaveDraftEmailMessageUseCase =
  SaveDraftEmailMessageUseCase as jest.MockedClass<
    typeof SaveDraftEmailMessageUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/draft/deleteDraftEmailMessagesUseCase',
)
const JestMockUpdateDraftEmailMessageUseCase =
  UpdateDraftEmailMessageUseCase as jest.MockedClass<
    typeof UpdateDraftEmailMessageUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/draft/updateDraftEmailMessageUseCase',
)
const JestMockDeleteDraftEmailMessagesUseCase =
  DeleteDraftEmailMessagesUseCase as jest.MockedClass<
    typeof DeleteDraftEmailMessagesUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/draft/getDraftEmailMessageUseCase',
)
const JestMockGetDraftEmailMessageUseCase =
  GetDraftEmailMessageUseCase as jest.MockedClass<
    typeof GetDraftEmailMessageUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/draft/listDraftEmailMessageMetadataUseCase',
)
const JestMockListDraftEmailMessageMetadataUseCase =
  ListDraftEmailMessageMetadataUseCase as jest.MockedClass<
    typeof ListDraftEmailMessageMetadataUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/message/getEmailMessageUseCase',
)
const JestMockUpdateEmailMessagesUseCase =
  UpdateEmailMessagesUseCase as jest.MockedClass<
    typeof UpdateEmailMessagesUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/message/updateEmailMessagesUseCase',
)
const JestMockGetEmailMessageUseCase =
  GetEmailMessageUseCase as jest.MockedClass<typeof GetEmailMessageUseCase>
jest.mock(
  '../../../src/private/domain/use-cases/message/getEmailMessageUseCase',
)
const JestMockListEmailMessagesForEmailAddressIdUseCase =
  ListEmailMessagesForEmailAddressIdUseCase as jest.MockedClass<
    typeof ListEmailMessagesForEmailAddressIdUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/message/listEmailMessagesForEmailAddressIdUseCase',
)
const JestMockListEmailMessagesForEmailFolderIdUseCase =
  ListEmailMessagesForEmailFolderIdUseCase as jest.MockedClass<
    typeof ListEmailMessagesForEmailFolderIdUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/message/listEmailMessagesForEmailFolderIdUseCase',
)
const JestMockGetEmailMessageRfc822DataUseCase =
  GetEmailMessageRfc822DataUseCase as jest.MockedClass<
    typeof GetEmailMessageRfc822DataUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/message/getEmailMessageRfc822DataUseCase',
)
const JestMockSubscribeToEmailMessagesUseCase =
  SubscribeToEmailMessagesUseCase as jest.MockedClass<
    typeof SubscribeToEmailMessagesUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/message/subscribeToEmailMessagesUseCase',
)
const JestMockUnsubscribeFromEmailMessagesUseCase =
  UnsubscribeFromEmailMessagesUseCase as jest.MockedClass<
    typeof UnsubscribeFromEmailMessagesUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/message/unsubscribeFromEmailMessagesUseCase',
)
const JestMockBlockEmailAddressesUseCase =
  BlockEmailAddressesUseCase as jest.MockedClass<
    typeof BlockEmailAddressesUseCase
  >
jest.mock('../../../src/private/domain/use-cases/blocklist/blockEmailAddresses')
const JestMockUnblockEmailAddressesUseCase =
  UnblockEmailAddressesUseCase as jest.MockedClass<
    typeof UnblockEmailAddressesUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/blocklist/unblockEmailAddresses',
)
const JestMockGetEmailAddressBlocklistUseCase =
  GetEmailAddressBlocklistUseCase as jest.MockedClass<
    typeof GetEmailAddressBlocklistUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/blocklist/getEmailAddressBlocklist',
)

describe('SudoEmailClient Test Suite', () => {
  // Opt Mocks
  const mockSudoUserClient = mock<SudoUserClient>()
  const mockSudoProfilesClient = mock<SudoProfilesClient>()
  const mockSudoCryptoProvider = mock<SudoCryptoProvider>()
  const mockSudoKeyManager = mock<SudoKeyManager>()
  const mockApiClient = mock<ApiClient>()

  // Mocks generated inside of constructor
  const mockEmailAccountService = mock<DefaultEmailAccountService>()
  const mockEmailFolderService = mock<DefaultEmailFolderService>()
  const mockEmailMessageService = mock<DefaultEmailMessageService>()
  const mockConfigurationDataService = mock<DefaultConfigurationDataService>()
  const mockEmailAddressBlocklistService =
    mock<DefaultEmailAddressBlocklistService>()

  // Use case Mocks
  const mockGetConfigurationDataUseCase = mock<GetConfigurationDataUseCase>()
  const mockProvisionEmailAccountUseCase = mock<ProvisionEmailAccountUseCase>()
  const mockCreateCustomEmailFolderUseCase =
    mock<CreateCustomEmailFolderUseCase>()
  const mockDeprovisionEmailAccountUseCase =
    mock<DeprovisionEmailAccountUseCase>()
  const mockUpdateEmailAccountMetadataUseCase =
    mock<UpdateEmailAccountMetadataUseCase>()
  const mockSendEmailMessageUseCase = mock<SendEmailMessageUseCase>()
  const mockDeleteEmailMessagesUseCase = mock<DeleteEmailMessagesUseCase>()
  const mockGetSupportedEmailDomainsUseCase =
    mock<GetSupportedEmailDomainsUseCase>()
  const mockCheckEmailAddressAvailabilityUseCase =
    mock<CheckEmailAddressAvailabilityUseCase>()
  const mockGetEmailAccountUseCase = mock<GetEmailAccountUseCase>()
  const mockListEmailAccountsUseCase = mock<ListEmailAccountsUseCase>()
  const mockListEmailAccountsForSudoIdUseCase =
    mock<ListEmailAccountsForSudoIdUseCase>()
  const mockLookupEmailAddressesPublicInfoUseCase =
    mock<LookupEmailAddressesPublicInfoUseCase>()
  const mockListEmailFoldersForEmailAddressIdUseCase =
    mock<ListEmailFoldersForEmailAddressIdUseCase>()
  const mockSaveDraftEmailMessageUseCase = mock<SaveDraftEmailMessageUseCase>()
  const mockUpdateDraftEmailMessageUseCase =
    mock<UpdateDraftEmailMessageUseCase>()
  const mockDeleteDraftEmailMessagesUseCase =
    mock<DeleteDraftEmailMessagesUseCase>()
  const mockGetDraftEmailMessageUseCase = mock<GetDraftEmailMessageUseCase>()
  const mockListDraftEmailMessageMetadataUseCase =
    mock<ListDraftEmailMessageMetadataUseCase>()
  const mockUpdateEmailMessagesUseCase = mock<UpdateEmailMessagesUseCase>()
  const mockGetEmailMessageUseCase = mock<GetEmailMessageUseCase>()
  const mockListEmailMessagesForEmailAddressIdUseCase =
    mock<ListEmailMessagesForEmailAddressIdUseCase>()
  const mockListEmailMessagesForEmailFolderIdUseCase =
    mock<ListEmailMessagesForEmailFolderIdUseCase>()
  const mockGetEmailMessageRfc822DataUseCase =
    mock<GetEmailMessageRfc822DataUseCase>()
  const mockSubscribeToEmailMessagesUseCase =
    mock<SubscribeToEmailMessagesUseCase>()
  const mockUnsubscribeFromEmailMessagesUseCase =
    mock<UnsubscribeFromEmailMessagesUseCase>()
  const mockBlockEmailAddressesUseCase = mock<BlockEmailAddressesUseCase>()
  const mockUnblockEmailAddressesUseCase = mock<UnblockEmailAddressesUseCase>()
  const mockGetEmailAddressBlocklistUseCase =
    mock<GetEmailAddressBlocklistUseCase>()

  let instanceUnderTest: SudoEmailClient

  const mockIdentityServiceConfig: userSdk.IdentityServiceConfig = {
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

  const mockEmailServiceConfig: EmailServiceConfig = {
    region: 'region',
    apiUrl: 'apiUrl',
    transientBucket: 'transientBucket',
    bucket: 'bucket',
  }

  const resetMocks = (): void => {
    reset(mockSudoUserClient)
    reset(mockSudoProfilesClient)
    reset(mockSudoCryptoProvider)
    reset(mockSudoKeyManager)
    reset(mockApiClient)
    reset(mockEmailAccountService)
    reset(mockEmailFolderService)
    reset(mockEmailMessageService)
    reset(mockConfigurationDataService)
    reset(mockEmailAddressBlocklistService)

    reset(mockProvisionEmailAccountUseCase)
    reset(mockDeprovisionEmailAccountUseCase)
    reset(mockUpdateEmailAccountMetadataUseCase)
    reset(mockSendEmailMessageUseCase)
    reset(mockDeleteEmailMessagesUseCase)
    reset(mockGetSupportedEmailDomainsUseCase)
    reset(mockCheckEmailAddressAvailabilityUseCase)
    reset(mockGetEmailAccountUseCase)
    reset(mockListEmailAccountsUseCase)
    reset(mockListEmailAccountsForSudoIdUseCase)
    reset(mockListEmailFoldersForEmailAddressIdUseCase)
    reset(mockCreateCustomEmailFolderUseCase)
    reset(mockSaveDraftEmailMessageUseCase)
    reset(mockUpdateDraftEmailMessageUseCase)
    reset(mockDeleteDraftEmailMessagesUseCase)
    reset(mockGetDraftEmailMessageUseCase)
    reset(mockListDraftEmailMessageMetadataUseCase)
    reset(mockUpdateEmailMessagesUseCase)
    reset(mockGetEmailMessageUseCase)
    reset(mockListEmailMessagesForEmailAddressIdUseCase)
    reset(mockListEmailMessagesForEmailFolderIdUseCase)
    reset(mockGetEmailMessageRfc822DataUseCase)
    reset(mockSubscribeToEmailMessagesUseCase)
    reset(mockUnsubscribeFromEmailMessagesUseCase)
    reset(mockGetConfigurationDataUseCase)
    reset(mockBlockEmailAddressesUseCase)
    reset(mockUnblockEmailAddressesUseCase)
    reset(mockGetEmailAddressBlocklistUseCase)

    JestMockDefaultEmailAccountService.mockClear()
    JestMockDefaultEmailFolderService.mockClear()
    JestMockDefaultEmailMessageService.mockClear()
    JestMockDefaultConfigurationDataService.mockClear()
    JestMockDefaultEmailAddressBlocklistService.mockClear()
    JestMockApiClient.mockClear()
    JestMockWebSudoCryptoProvider.mockClear()
    JestMockDeviceKeyWorker.mockClear()
    JestMockUserConfig.getIdentityServiceConfig.mockClear()

    JestMockGetConfigurationDataUseCase.mockClear()
    JestMockProvisionEmailAccountUseCase.mockClear()
    JestMockDeprovisionEmailAccountUseCase.mockClear()
    JestMockUpdateEmailAccountMetadataUseCase.mockClear()
    JestMockSendEmailMessageUseCase.mockClear()
    JestMockDeleteEmailMessagesUseCase.mockClear()
    JestMockGetSupportedEmailDomainsUseCase.mockClear()
    JestMockCheckEmailAddressAvailabilityUseCase.mockClear()
    JestMockGetEmailAccountUseCase.mockClear()
    JestMockListEmailAccountsUseCase.mockClear()
    JestMockListEmailAccountsForSudoIdUseCase.mockClear()
    JestMockLookupEmailAddressesPublicInfoUseCase.mockClear()
    JestMockListEmailFoldersForEmailAddressIdUseCase.mockClear()
    JestMockCreateCustomEmailFolderUseCase.mockClear()
    JestMockSaveDraftEmailMessageUseCase.mockClear()
    JestMockUpdateDraftEmailMessageUseCase.mockClear()
    JestMockDeleteDraftEmailMessagesUseCase.mockClear()
    JestMockGetDraftEmailMessageUseCase.mockClear()
    JestMockListDraftEmailMessageMetadataUseCase.mockClear()
    JestMockUpdateEmailMessagesUseCase.mockClear()
    JestMockGetEmailMessageUseCase.mockClear()
    JestMockListEmailMessagesForEmailAddressIdUseCase.mockClear()
    JestMockListEmailMessagesForEmailFolderIdUseCase.mockClear()
    JestMockGetEmailMessageRfc822DataUseCase.mockClear()
    JestMockSubscribeToEmailMessagesUseCase.mockClear()
    JestMockUnsubscribeFromEmailMessagesUseCase.mockClear()
    JestMockBlockEmailAddressesUseCase.mockClear()
    JestMockUnblockEmailAddressesUseCase.mockClear()
    JestMockGetEmailAddressBlocklistUseCase.mockClear()

    JestMockDefaultConfigurationDataService.mockImplementation(() =>
      instance(mockConfigurationDataService),
    )
    JestMockDefaultEmailAccountService.mockImplementation(() =>
      instance(mockEmailAccountService),
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
    JestMockGetConfigurationDataUseCase.mockImplementation(() =>
      instance(mockGetConfigurationDataUseCase),
    )
    JestMockProvisionEmailAccountUseCase.mockImplementation(() =>
      instance(mockProvisionEmailAccountUseCase),
    )
    JestMockDeprovisionEmailAccountUseCase.mockImplementation(() =>
      instance(mockDeprovisionEmailAccountUseCase),
    )
    JestMockUpdateEmailAccountMetadataUseCase.mockImplementation(() =>
      instance(mockUpdateEmailAccountMetadataUseCase),
    )
    JestMockSendEmailMessageUseCase.mockImplementation(() =>
      instance(mockSendEmailMessageUseCase),
    )
    JestMockDeleteEmailMessagesUseCase.mockImplementation(() =>
      instance(mockDeleteEmailMessagesUseCase),
    )
    JestMockGetSupportedEmailDomainsUseCase.mockImplementation(() =>
      instance(mockGetSupportedEmailDomainsUseCase),
    )
    JestMockCheckEmailAddressAvailabilityUseCase.mockImplementation(() =>
      instance(mockCheckEmailAddressAvailabilityUseCase),
    )
    JestMockGetEmailAccountUseCase.mockImplementation(() =>
      instance(mockGetEmailAccountUseCase),
    )
    JestMockListEmailAccountsUseCase.mockImplementation(() =>
      instance(mockListEmailAccountsUseCase),
    )
    JestMockListEmailAccountsForSudoIdUseCase.mockImplementation(() =>
      instance(mockListEmailAccountsForSudoIdUseCase),
    )
    JestMockLookupEmailAddressesPublicInfoUseCase.mockImplementation(() =>
      instance(mockLookupEmailAddressesPublicInfoUseCase),
    )
    JestMockListEmailFoldersForEmailAddressIdUseCase.mockImplementation(() =>
      instance(mockListEmailFoldersForEmailAddressIdUseCase),
    )
    JestMockCreateCustomEmailFolderUseCase.mockImplementation(() =>
      instance(mockCreateCustomEmailFolderUseCase),
    )
    JestMockSaveDraftEmailMessageUseCase.mockImplementation(() =>
      instance(mockSaveDraftEmailMessageUseCase),
    )
    JestMockUpdateDraftEmailMessageUseCase.mockImplementation(() =>
      instance(mockUpdateDraftEmailMessageUseCase),
    )
    JestMockDeleteDraftEmailMessagesUseCase.mockImplementation(() =>
      instance(mockDeleteDraftEmailMessagesUseCase),
    )
    JestMockGetDraftEmailMessageUseCase.mockImplementation(() =>
      instance(mockGetDraftEmailMessageUseCase),
    )
    JestMockListDraftEmailMessageMetadataUseCase.mockImplementation(() =>
      instance(mockListDraftEmailMessageMetadataUseCase),
    )
    JestMockUpdateEmailMessagesUseCase.mockImplementation(() =>
      instance(mockUpdateEmailMessagesUseCase),
    )
    JestMockGetEmailMessageUseCase.mockImplementation(() =>
      instance(mockGetEmailMessageUseCase),
    )
    JestMockListEmailMessagesForEmailAddressIdUseCase.mockImplementation(() =>
      instance(mockListEmailMessagesForEmailAddressIdUseCase),
    )
    JestMockListEmailMessagesForEmailFolderIdUseCase.mockImplementation(() =>
      instance(mockListEmailMessagesForEmailFolderIdUseCase),
    )
    JestMockGetEmailMessageRfc822DataUseCase.mockImplementation(() =>
      instance(mockGetEmailMessageRfc822DataUseCase),
    )
    JestMockSubscribeToEmailMessagesUseCase.mockImplementation(() =>
      instance(mockSubscribeToEmailMessagesUseCase),
    )
    JestMockUnsubscribeFromEmailMessagesUseCase.mockImplementation(() =>
      instance(mockUnsubscribeFromEmailMessagesUseCase),
    )
    JestMockBlockEmailAddressesUseCase.mockImplementation(() =>
      instance(mockBlockEmailAddressesUseCase),
    )
    JestMockUnblockEmailAddressesUseCase.mockImplementation(() =>
      instance(mockUnblockEmailAddressesUseCase),
    )
    JestMockGetEmailAddressBlocklistUseCase.mockImplementation(() =>
      instance(mockGetEmailAddressBlocklistUseCase),
    )
  }

  beforeEach(() => {
    resetMocks()
    const options: PrivateSudoEmailClientOptions = {
      sudoUserClient: instance(mockSudoUserClient),
      sudoCryptoProvider: instance(mockSudoCryptoProvider),
      sudoKeyManager: instance(mockSudoKeyManager),
      apiClient: instance(mockApiClient),
      identityServiceConfig: mockIdentityServiceConfig,
      emailServiceConfig: mockEmailServiceConfig,
    }

    instanceUnderTest = new DefaultSudoEmailClient(options)
  })

  describe('constructor', () => {
    beforeEach(() => {
      resetMocks()
    })
    it('constructs itself correctly', () => {
      DefaultConfigurationManager.getInstance().setConfig(
        JSON.stringify({
          identityService: mockIdentityServiceConfig,
          emService: mockEmailServiceConfig,
        }),
      )

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
      expect(JestMockDefaultEmailFolderService).toHaveBeenCalledTimes(1)
      expect(JestMockDefaultEmailMessageService).toHaveBeenCalledTimes(1)
      expect(JestMockDefaultEmailAddressBlocklistService).toHaveBeenCalledTimes(
        1,
      )
    })
  })

  describe('provisionEmailAddress', () => {
    beforeEach(() => {
      when(mockProvisionEmailAccountUseCase.execute(anything())).thenResolve(
        EntityDataFactory.emailAccount,
      )
    })
    it('generates use case', async () => {
      await instanceUnderTest.provisionEmailAddress({
        emailAddress: '',
        ownershipProofToken: '',
      })
      expect(JestMockProvisionEmailAccountUseCase).toHaveBeenCalledTimes(1)
    })
    it('calls use case as expected', async () => {
      const emailAddress = v4()
      const ownershipProofToken = v4()
      await instanceUnderTest.provisionEmailAddress({
        emailAddress,
        ownershipProofToken,
      })
      verify(mockProvisionEmailAccountUseCase.execute(anything())).once()
      const [args] = capture(mockProvisionEmailAccountUseCase.execute).first()
      expect(args).toEqual({
        emailAddressEntity: { emailAddress },
        ownershipProofToken: ownershipProofToken,
      })
    })

    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.provisionEmailAddress({
          emailAddress: '',
          ownershipProofToken: '',
        }),
      ).resolves.toEqual(APIDataFactory.emailAddress)
    })
  })

  describe('createCustomEmailFolder', () => {
    beforeEach(() => {
      when(mockCreateCustomEmailFolderUseCase.execute(anything())).thenResolve(
        EntityDataFactory.emailFolderWithCustomEmailFolderName,
      )
    })
    it('generates use case', async () => {
      await instanceUnderTest.createCustomEmailFolder({
        emailAddressId: '',
        customFolderName: '',
      })
      expect(JestMockCreateCustomEmailFolderUseCase).toHaveBeenCalledTimes(1)
    })
    it('calls use case as expected', async () => {
      const emailAddressId = v4()
      const customFolderName = 'CUSTOM'
      await instanceUnderTest.createCustomEmailFolder({
        emailAddressId,
        customFolderName,
      })
      verify(mockCreateCustomEmailFolderUseCase.execute(anything())).once()
      const [args] = capture(mockCreateCustomEmailFolderUseCase.execute).first()
      expect(args).toEqual({
        emailAddressId: emailAddressId,
        customFolderName: customFolderName,
      })
    })

    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.createCustomEmailFolder({
          emailAddressId: '',
          customFolderName: '',
        }),
      ).resolves.toEqual(APIDataFactory.emailFolderWithCustomFolderName)
    })
  })

  describe('blockEmailAddresses', () => {
    const mockOwner = 'mockOwner'
    beforeEach(() => {
      when(mockBlockEmailAddressesUseCase.execute(anything())).thenResolve({
        status: UpdateEmailMessagesStatus.Success,
      })
    })

    it('generates use case', async () => {
      await instanceUnderTest.blockEmailAddresses({
        owner: mockOwner,
        addresses: [`spammyMcSpamface${v4()}@spambot.com`],
      })
      expect(JestMockBlockEmailAddressesUseCase).toHaveBeenCalledTimes(1)
    })

    it('calls use case as expected', async () => {
      const addressesToBlock = [
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
      ]
      await instanceUnderTest.blockEmailAddresses({
        owner: mockOwner,
        addresses: addressesToBlock,
      })
      verify(mockBlockEmailAddressesUseCase.execute(anything())).once()
      const [args] = capture(mockBlockEmailAddressesUseCase.execute).first()
      expect(args).toEqual({
        owner: mockOwner,
        blockedAddresses: addressesToBlock,
      })
    })

    it('returns expected result on success', async () => {
      const addressesToBlock = [
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
      ]
      await expect(
        instanceUnderTest.blockEmailAddresses({
          owner: mockOwner,
          addresses: addressesToBlock,
        }),
      ).resolves.toEqual({ status: BatchOperationResultStatus.Success })
    })

    it('returns expected result on failure', async () => {
      when(mockBlockEmailAddressesUseCase.execute(anything())).thenResolve({
        status: UpdateEmailMessagesStatus.Failed,
      })
      const addressesToBlock = [
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
      ]
      await expect(
        instanceUnderTest.blockEmailAddresses({
          owner: mockOwner,
          addresses: addressesToBlock,
        }),
      ).resolves.toEqual({ status: BatchOperationResultStatus.Failure })
    })

    it('returns expected result on partial success', async () => {
      when(mockBlockEmailAddressesUseCase.execute(anything())).thenCall(
        (input: BlockEmailAddressesUseCaseInput) => {
          const [first, ...rest] = input.blockedAddresses
          return Promise.resolve({
            status: UpdateEmailMessagesStatus.Partial,
            failedAddresses: [first],
            successAddresses: rest,
          })
        },
      )
      const addressesToBlock = [
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
      ]
      await expect(
        instanceUnderTest.blockEmailAddresses({
          owner: mockOwner,
          addresses: addressesToBlock,
        }),
      ).resolves.toEqual({
        status: BatchOperationResultStatus.Partial,
        failureValues: [addressesToBlock[0]],
        successValues: [addressesToBlock[1], addressesToBlock[2]],
      })
    })
  })

  describe('unblockEmailAddresses', () => {
    const mockOwner = 'mockOwner'
    beforeEach(() => {
      when(mockUnblockEmailAddressesUseCase.execute(anything())).thenResolve({
        status: UpdateEmailMessagesStatus.Success,
      })
    })

    it('generates use case', async () => {
      await instanceUnderTest.unblockEmailAddresses({
        owner: mockOwner,
        addresses: [`spammyMcSpamface${v4()}@spambot.com`],
      })
      expect(JestMockUnblockEmailAddressesUseCase).toHaveBeenCalledTimes(1)
    })

    it('calls use case as expected', async () => {
      const addressesToBlock = [
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
      ]
      await instanceUnderTest.unblockEmailAddresses({
        owner: mockOwner,
        addresses: addressesToBlock,
      })
      verify(mockUnblockEmailAddressesUseCase.execute(anything())).once()
      const [args] = capture(mockUnblockEmailAddressesUseCase.execute).first()
      expect(args).toEqual({
        owner: mockOwner,
        unblockedAddresses: addressesToBlock,
      })
    })

    it('returns expected result on success', async () => {
      const addressesToBlock = [
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
      ]
      await expect(
        instanceUnderTest.unblockEmailAddresses({
          owner: mockOwner,
          addresses: addressesToBlock,
        }),
      ).resolves.toEqual({ status: BatchOperationResultStatus.Success })
    })

    it('returns expected result on failure', async () => {
      when(mockUnblockEmailAddressesUseCase.execute(anything())).thenResolve({
        status: UpdateEmailMessagesStatus.Failed,
      })
      const addressesToBlock = [
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
      ]
      await expect(
        instanceUnderTest.unblockEmailAddresses({
          owner: mockOwner,
          addresses: addressesToBlock,
        }),
      ).resolves.toEqual({ status: BatchOperationResultStatus.Failure })
    })

    it('returns expected result on partial success', async () => {
      when(mockUnblockEmailAddressesUseCase.execute(anything())).thenCall(
        (input: UnblockEmailAddressesUseCaseInput) => {
          const [first, ...rest] = input.unblockedAddresses
          return Promise.resolve({
            status: UpdateEmailMessagesStatus.Partial,
            failedAddresses: [first],
            successAddresses: rest,
          })
        },
      )
      const addressesToBlock = [
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
      ]
      await expect(
        instanceUnderTest.unblockEmailAddresses({
          owner: mockOwner,
          addresses: addressesToBlock,
        }),
      ).resolves.toEqual({
        status: BatchOperationResultStatus.Partial,
        failureValues: [addressesToBlock[0]],
        successValues: [addressesToBlock[1], addressesToBlock[2]],
      })
    })
  })

  describe('getEmailAddressBlocklist', () => {
    const mockOwner = 'mockOwner'
    const blockedAddresses = [
      `spammyMcSpamface-${v4()}@spambot.com`,
      `spammyMcSpamface-${v4()}@spambot.com`,
    ]
    beforeEach(() => {
      when(mockGetEmailAddressBlocklistUseCase.execute(anything())).thenResolve(
        blockedAddresses,
      )
    })

    it('generates use case', async () => {
      await instanceUnderTest.getEmailAddressBlocklist({
        owner: mockOwner,
      })
      expect(JestMockGetEmailAddressBlocklistUseCase).toHaveBeenCalledTimes(1)
    })

    it('calls use case as expected', async () => {
      await instanceUnderTest.getEmailAddressBlocklist({
        owner: mockOwner,
      })
      verify(mockGetEmailAddressBlocklistUseCase.execute(anything())).once()
      const [args] = capture(
        mockGetEmailAddressBlocklistUseCase.execute,
      ).first()
      expect(args).toEqual({
        owner: mockOwner,
      })
    })

    it('returns expected list of blocked addresses', async () => {
      await expect(
        instanceUnderTest.getEmailAddressBlocklist({ owner: mockOwner }),
      ).resolves.toEqual(blockedAddresses)
    })
  })

  describe('deprovisionEmailAddress', () => {
    beforeEach(() => {
      when(mockDeprovisionEmailAccountUseCase.execute(anything())).thenResolve(
        EntityDataFactory.emailAccount,
      )
    })
    it('generates use case', async () => {
      await instanceUnderTest.deprovisionEmailAddress('')
      expect(JestMockDeprovisionEmailAccountUseCase).toHaveBeenCalledTimes(1)
    })
    it('calls use case as expected', async () => {
      const id = v4()
      await instanceUnderTest.deprovisionEmailAddress(id)
      verify(mockDeprovisionEmailAccountUseCase.execute(anything())).once()
      const [actualId] = capture(
        mockDeprovisionEmailAccountUseCase.execute,
      ).first()
      expect(actualId).toEqual(id)
    })
    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.deprovisionEmailAddress(''),
      ).resolves.toEqual(APIDataFactory.emailAddress)
    })
  })

  describe('updateEmailAddressMetadata', () => {
    beforeEach(() => {
      when(
        mockUpdateEmailAccountMetadataUseCase.execute(anything()),
      ).thenResolve('id')
    })
    const input = {
      id: 'id',
      values: {
        alias: 'Some Alias',
      },
    }
    it('generates use case', async () => {
      await instanceUnderTest.updateEmailAddressMetadata({
        id: '',
        values: {
          alias: '',
        },
      })
      expect(JestMockUpdateEmailAccountMetadataUseCase).toHaveBeenCalledTimes(1)
    })
    it('calls use case as expected', async () => {
      await instanceUnderTest.updateEmailAddressMetadata(input)
      verify(mockUpdateEmailAccountMetadataUseCase.execute(anything())).once()
      const [inputArgs] = capture(
        mockUpdateEmailAccountMetadataUseCase.execute,
      ).first()
      expect(inputArgs).toEqual(input)
    })
    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.updateEmailAddressMetadata(input),
      ).resolves.toEqual('id')
    })
  })

  describe('sendEmailMessage', () => {
    beforeEach(() => {
      when(mockSendEmailMessageUseCase.execute(anything())).thenResolve('id')
    })
    it('generates use case', async () => {
      await instanceUnderTest.sendEmailMessage({
        rfc822Data: str2ab(''),
        senderEmailAddressId: '',
      })
      expect(JestMockSendEmailMessageUseCase).toHaveBeenCalledTimes(1)
    })
    it('calls use case as expected', async () => {
      const rfc822Data = str2ab(v4())
      const senderEmailAddressId = v4()
      await instanceUnderTest.sendEmailMessage({
        rfc822Data,
        senderEmailAddressId,
      })
      verify(mockSendEmailMessageUseCase.execute(anything())).once()
      const [actualInput] = capture(mockSendEmailMessageUseCase.execute).first()
      expect(actualInput.rfc822Data).toEqual(rfc822Data)
      expect(actualInput.senderEmailAddressId).toEqual(senderEmailAddressId)
    })
    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.sendEmailMessage({
          rfc822Data: str2ab(''),
          senderEmailAddressId: '',
        }),
      ).resolves.toEqual('id')
    })
  })

  describe('updateEmailMessages', () => {
    beforeEach(() => {
      when(mockUpdateEmailMessagesUseCase.execute(anything())).thenResolve({
        status: UpdateEmailMessagesStatus.Partial,
        successIds: ['successId'],
        failureIds: ['failureId'],
      })
    })
    it('generates use case', async () => {
      await instanceUnderTest.updateEmailMessages({ ids: [], values: {} })
      expect(JestMockUpdateEmailMessagesUseCase).toHaveBeenCalledTimes(1)
    })
    it('calls use case with unique input set', async () => {
      await instanceUnderTest.updateEmailMessages({
        ids: ['id1', 'id1', 'id2', 'id3', 'id2'],
        values: { seen: true },
      })
      verify(mockUpdateEmailMessagesUseCase.execute(anything())).once()
      const [actualArgs] = capture(
        mockUpdateEmailMessagesUseCase.execute,
      ).first()
      const actualArray = Array.from(actualArgs.ids)
      expect(actualArgs.values).toEqual({ seen: true })
      expect(actualArray).toHaveLength(3)
      expect(actualArray).toContain('id1')
      expect(actualArray).toContain('id2')
      expect(actualArray).toContain('id3')
    })
    it('returns success when use case returns success update status', async () => {
      const inputArray = ['id1', 'id1', 'id2', 'id3', 'id2']
      when(mockUpdateEmailMessagesUseCase.execute(anything())).thenResolve({
        status: UpdateEmailMessagesStatus.Success,
      })
      await expect(
        instanceUnderTest.updateEmailMessages({
          ids: inputArray,
          values: { seen: true },
        }),
      ).resolves.toEqual({ status: BatchOperationResultStatus.Success })
    })
    it('returns failure when use case returns failure update status', async () => {
      const inputArray = ['id1', 'id1', 'id2', 'id3', 'id2']
      when(mockUpdateEmailMessagesUseCase.execute(anything())).thenResolve({
        status: UpdateEmailMessagesStatus.Failed,
      })
      await expect(
        instanceUnderTest.updateEmailMessages({
          ids: inputArray,
          values: { seen: true },
        }),
      ).resolves.toEqual({ status: BatchOperationResultStatus.Failure })
    })
    it('returns partial success when use case returns partial update status', async () => {
      const duplicateInputArray = ['id1', 'id1', 'id2', 'id3', 'id2']
      when(mockUpdateEmailMessagesUseCase.execute(anything())).thenResolve({
        status: UpdateEmailMessagesStatus.Partial,
        successIds: ['id1'],
        failureIds: ['id2', 'id3'],
      })
      await expect(
        instanceUnderTest.updateEmailMessages({
          ids: duplicateInputArray,
          values: { folderId: 'folderId', seen: true },
        }),
      ).resolves.toEqual({
        status: BatchOperationResultStatus.Partial,
        failureValues: ['id2', 'id3'],
        successValues: ['id1'],
      })
    })
  })

  describe('getSupportedEmailDomains', () => {
    beforeEach(() => {
      when(mockGetSupportedEmailDomainsUseCase.execute(anything())).thenResolve(
        [{ domain: 'domain.com' }],
      )
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

  describe('checkEmailAddressAvailability', () => {
    beforeEach(() => {
      when(
        mockCheckEmailAddressAvailabilityUseCase.execute(anything()),
      ).thenResolve([{ emailAddress: 'test@example.com' }])
    })
    it('generates use case', async () => {
      await instanceUnderTest.checkEmailAddressAvailability({
        localParts: new Set(['']),
        domains: new Set(['']),
      })
      expect(
        JestMockCheckEmailAddressAvailabilityUseCase,
      ).toHaveBeenCalledTimes(1)
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
      verify(
        mockCheckEmailAddressAvailabilityUseCase.execute(anything()),
      ).once()
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

  describe('getEmailAddress', () => {
    beforeEach(() => {
      when(mockGetEmailAccountUseCase.execute(anything())).thenResolve(
        EntityDataFactory.emailAccount,
      )
    })
    it('generates use case', async () => {
      await instanceUnderTest.getEmailAddress({
        id: '',
        cachePolicy: CachePolicy.CacheOnly,
      })
      expect(JestMockGetEmailAccountUseCase).toHaveBeenCalledTimes(1)
    })
    it('calls use case as expected', async () => {
      const id = v4()
      const cachePolicy = CachePolicy.CacheOnly
      await instanceUnderTest.getEmailAddress({ id, cachePolicy })
      verify(mockGetEmailAccountUseCase.execute(anything())).once()
      const [actualArgs] = capture(mockGetEmailAccountUseCase.execute).first()
      expect(actualArgs).toEqual<typeof actualArgs>({ id, cachePolicy })
    })

    it('returns undefined if use case result is undefined', async () => {
      when(mockGetEmailAccountUseCase.execute(anything())).thenResolve(
        undefined,
      )
      await expect(
        instanceUnderTest.getEmailAddress({
          id: '',
          cachePolicy: CachePolicy.CacheOnly,
        }),
      ).resolves.toBeUndefined()
    })
    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.getEmailAddress({
          id: '',
          cachePolicy: CachePolicy.CacheOnly,
        }),
      ).resolves.toEqual(APIDataFactory.emailAddress)
    })
  })

  describe('listEmailAddresses', () => {
    beforeEach(() => {
      when(mockListEmailAccountsUseCase.execute(anything())).thenResolve({
        emailAccounts: [EntityDataFactory.emailAccount],
        nextToken: 'nextToken',
      })
    })
    it('generates use case', async () => {
      await instanceUnderTest.listEmailAddresses({
        cachePolicy: CachePolicy.CacheOnly,
        limit: 0,
        nextToken: '',
      })
      expect(JestMockListEmailAccountsUseCase).toHaveBeenCalledTimes(1)
    })
    it('calls use case as expected', async () => {
      const cachePolicy = CachePolicy.CacheOnly
      const limit = 100
      const nextToken = v4()
      await instanceUnderTest.listEmailAddresses({
        cachePolicy,
        limit,
        nextToken,
      })
      verify(mockListEmailAccountsUseCase.execute(anything())).once()
      const [actualArgs] = capture(mockListEmailAccountsUseCase.execute).first()
      expect(actualArgs).toEqual<typeof actualArgs>({
        cachePolicy,
        limit,
        nextToken,
      })
    })

    it('returns empty list if use case result is empty list', async () => {
      when(mockListEmailAccountsUseCase.execute(anything())).thenResolve({
        emailAccounts: [],
        nextToken: undefined,
      })
      await expect(
        instanceUnderTest.listEmailAddresses({
          cachePolicy: CachePolicy.CacheOnly,
        }),
      ).resolves.toStrictEqual({
        status: 'Success',
        items: [],
        nextToken: undefined,
      })
    })
    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.listEmailAddresses({
          cachePolicy: CachePolicy.CacheOnly,
        }),
      ).resolves.toStrictEqual({
        status: 'Success',
        items: [APIDataFactory.emailAddress],
        nextToken: 'nextToken',
      })
    })
    it('returns partial result', async () => {
      when(mockListEmailAccountsUseCase.execute(anything())).thenResolve({
        emailAccounts: [
          EntityDataFactory.emailAccount,
          {
            ...EntityDataFactory.emailAccount,
            status: { type: 'Failed', cause: new Error('dummy_error') },
          },
        ],
        nextToken: 'nextToken',
      })
      await expect(
        instanceUnderTest.listEmailAddresses({
          cachePolicy: CachePolicy.CacheOnly,
        }),
      ).resolves.toStrictEqual({
        status: 'Partial',
        items: [APIDataFactory.emailAddress],
        failed: [
          {
            item: APIDataFactory.emailAddress,
            cause: new Error('dummy_error'),
          },
        ],
        nextToken: 'nextToken',
      })
    })
  })

  describe('listEmailAddressesForSudoId', () => {
    beforeEach(() => {
      when(
        mockListEmailAccountsForSudoIdUseCase.execute(anything()),
      ).thenResolve({
        emailAccounts: [EntityDataFactory.emailAccount],
        nextToken: 'nextToken',
      })
    })
    it('generates use case', async () => {
      const sudoId = v4()
      await instanceUnderTest.listEmailAddressesForSudoId({
        sudoId,
        cachePolicy: CachePolicy.CacheOnly,
        limit: 0,
        nextToken: '',
      })
      expect(JestMockListEmailAccountsForSudoIdUseCase).toHaveBeenCalledTimes(1)
    })
    it('calls use case as expected', async () => {
      const sudoId = v4()
      const cachePolicy = CachePolicy.CacheOnly
      const limit = 100
      const nextToken = v4()
      await instanceUnderTest.listEmailAddressesForSudoId({
        sudoId,
        cachePolicy,
        limit,
        nextToken,
      })
      verify(mockListEmailAccountsForSudoIdUseCase.execute(anything())).once()
      const [actualArgs] = capture(
        mockListEmailAccountsForSudoIdUseCase.execute,
      ).first()
      expect(actualArgs).toEqual<typeof actualArgs>({
        sudoId,
        cachePolicy,
        limit,
        nextToken,
      })
    })
    it('returns empty list if use case result is empty list', async () => {
      const sudoId = v4()
      when(
        mockListEmailAccountsForSudoIdUseCase.execute(anything()),
      ).thenResolve({
        emailAccounts: [],
        nextToken: undefined,
      })
      await expect(
        instanceUnderTest.listEmailAddressesForSudoId({
          sudoId,
          cachePolicy: CachePolicy.CacheOnly,
        }),
      ).resolves.toStrictEqual({
        status: 'Success',
        items: [],
        nextToken: undefined,
      })
    })
    it('returns expected result', async () => {
      const sudoId = v4()
      await expect(
        instanceUnderTest.listEmailAddressesForSudoId({
          sudoId,
          cachePolicy: CachePolicy.CacheOnly,
        }),
      ).resolves.toStrictEqual({
        status: 'Success',
        items: [APIDataFactory.emailAddress],
        nextToken: 'nextToken',
      })
    })
  })

  describe('lookupEmailAddressesPublicInfo', () => {
    const emailAddresses = ['test1@email.com', 'test2@email.com']
    const publicKeys = ['testPublicKey-1', 'testPublicKey-2']
    const publicInfo: EmailAddressPublicInfo[] = [
      {
        emailAddress: emailAddresses[0],
        publicKey: publicKeys[0],
      },
      {
        emailAddress: emailAddresses[1],
        publicKey: publicKeys[1],
      },
    ]

    beforeEach(() => {
      when(
        mockLookupEmailAddressesPublicInfoUseCase.execute(anything()),
      ).thenResolve(publicInfo)
    })

    it('generates use case', async () => {
      await instanceUnderTest.lookupEmailAddressesPublicInfo({
        emailAddresses,
      })

      expect(
        JestMockLookupEmailAddressesPublicInfoUseCase,
      ).toHaveBeenCalledTimes(1)
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

  describe('listEmailFoldersForEmailAddressId', () => {
    beforeEach(() => {
      when(
        mockListEmailFoldersForEmailAddressIdUseCase.execute(anything()),
      ).thenResolve({
        folders: [EntityDataFactory.emailFolder],
        nextToken: 'nextToken',
      })
    })
    it('generates use case', async () => {
      const emailAddressId = v4()
      await instanceUnderTest.listEmailFoldersForEmailAddressId({
        emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
      })
      expect(
        JestMockListEmailFoldersForEmailAddressIdUseCase,
      ).toHaveBeenCalledTimes(1)
    })
    it('calls use case as expected', async () => {
      const emailAddressId = v4()
      const cachePolicy = CachePolicy.CacheOnly
      const limit = 100
      const nextToken = v4()
      await instanceUnderTest.listEmailFoldersForEmailAddressId({
        emailAddressId,
        cachePolicy,
        limit,
        nextToken,
      })
      verify(
        mockListEmailFoldersForEmailAddressIdUseCase.execute(anything()),
      ).once()
      const [actualArgs] = capture(
        mockListEmailFoldersForEmailAddressIdUseCase.execute,
      ).first()
      expect(actualArgs).toEqual<typeof actualArgs>({
        emailAddressId,
        cachePolicy,
        limit,
        nextToken,
      })
    })
    it('returns empty list if use case result is empty list', async () => {
      const emailAddressId = v4()
      when(
        mockListEmailFoldersForEmailAddressIdUseCase.execute(anything()),
      ).thenResolve({
        folders: [],
        nextToken: undefined,
      })
      await expect(
        instanceUnderTest.listEmailFoldersForEmailAddressId({
          emailAddressId,
          cachePolicy: CachePolicy.CacheOnly,
        }),
      ).resolves.toEqual({ items: [], nextToken: undefined })
    })
    it('returns expected result', async () => {
      const emailAddressId = v4()
      await expect(
        instanceUnderTest.listEmailFoldersForEmailAddressId({
          emailAddressId,
          cachePolicy: CachePolicy.CacheOnly,
        }),
      ).resolves.toEqual({
        items: [APIDataFactory.emailFolder],
        nextToken: 'nextToken',
      })
    })
  })

  describe('createDraftEmailMessage', () => {
    const updatedAt = new Date()

    beforeEach(() => {
      when(mockSaveDraftEmailMessageUseCase.execute(anything())).thenResolve({
        id: 'draftId',
        updatedAt,
      })
    })

    it('generates use case', async () => {
      await instanceUnderTest.createDraftEmailMessage({
        rfc822Data: str2ab(''),
        senderEmailAddressId: '',
      })
      expect(JestMockSaveDraftEmailMessageUseCase).toHaveBeenCalledTimes(1)
    })

    it('calls use case as expected', async () => {
      const rfc822Data = str2ab(v4())
      const senderEmailAddressId = v4()
      await instanceUnderTest.createDraftEmailMessage({
        rfc822Data,
        senderEmailAddressId,
      })
      verify(mockSaveDraftEmailMessageUseCase.execute(anything())).once()
      const [actualArgs] = capture(
        mockSaveDraftEmailMessageUseCase.execute,
      ).first()
      expect(actualArgs).toEqual<typeof actualArgs>({
        rfc822Data,
        senderEmailAddressId,
      })
    })

    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.createDraftEmailMessage({
          rfc822Data: str2ab(''),
          senderEmailAddressId: '',
        }),
      ).resolves.toEqual<DraftEmailMessageMetadata>({
        id: 'draftId',
        updatedAt,
      })
    })
  })

  describe('updateDraftEmailMessage', () => {
    const updatedAt = new Date()

    beforeEach(() => {
      when(mockUpdateDraftEmailMessageUseCase.execute(anything())).thenResolve({
        id: 'draftId',
        updatedAt,
      })
    })

    it('generates use case', async () => {
      await instanceUnderTest.updateDraftEmailMessage({
        id: '',
        rfc822Data: str2ab(''),
        senderEmailAddressId: '',
      })
      expect(JestMockUpdateDraftEmailMessageUseCase).toHaveBeenCalledTimes(1)
    })

    it('calls use case as expected', async () => {
      const id = v4()
      const rfc822Data = str2ab(v4())
      const senderEmailAddressId = v4()
      await instanceUnderTest.updateDraftEmailMessage({
        id,
        rfc822Data,
        senderEmailAddressId,
      })
      verify(mockUpdateDraftEmailMessageUseCase.execute(anything())).once()
      const [actualArgs] = capture(
        mockUpdateDraftEmailMessageUseCase.execute,
      ).first()
      expect(actualArgs).toEqual<typeof actualArgs>({
        id,
        rfc822Data,
        senderEmailAddressId,
      })
    })

    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.updateDraftEmailMessage({
          id: '',
          rfc822Data: str2ab(''),
          senderEmailAddressId: '',
        }),
      ).resolves.toEqual({ id: 'draftId', updatedAt })
    })
  })

  describe('deleteDraftEmailMessages', () => {
    beforeEach(() => {
      when(mockDeleteDraftEmailMessagesUseCase.execute(anything())).thenResolve(
        {
          successIds: [],
          failureIds: [],
        },
      )
    })
    it('generates use case', async () => {
      await instanceUnderTest.deleteDraftEmailMessages({
        ids: [],
        emailAddressId: '',
      })
      expect(JestMockDeleteDraftEmailMessagesUseCase).toHaveBeenCalledTimes(1)
    })
    it('calls use case with unique input set', async () => {
      const emailAddressId = v4()
      await instanceUnderTest.deleteDraftEmailMessages({
        ids: ['id1', 'id1', 'id2', 'id3', 'id2'],
        emailAddressId,
      })
      verify(mockDeleteDraftEmailMessagesUseCase.execute(anything())).once()
      const [actualArgs] = capture(
        mockDeleteDraftEmailMessagesUseCase.execute,
      ).first()
      const actualArray = Array.from(actualArgs.ids)
      expect(actualArgs.emailAddressId).toEqual(emailAddressId)
      expect(actualArray).toHaveLength(3)
      expect(actualArray).toContain('id1')
      expect(actualArray).toContain('id2')
      expect(actualArray).toContain('id3')
    })
    it('returns success when success ids equal the unique set of input ids', async () => {
      const duplicateInputArray = ['id1', 'id1', 'id2', 'id3', 'id2']
      const uniqueArray = Array.from(new Set(duplicateInputArray))
      when(mockDeleteDraftEmailMessagesUseCase.execute(anything())).thenResolve(
        { successIds: uniqueArray, failureIds: [] },
      )
      await expect(
        instanceUnderTest.deleteDraftEmailMessages({
          ids: duplicateInputArray,
          emailAddressId: '',
        }),
      ).resolves.toEqual({ status: BatchOperationResultStatus.Success })
    })
    it('returns failure when all failure ids equal the unique set of input ids', async () => {
      const duplicateInputArray = ['id1', 'id1', 'id2', 'id3', 'id2']
      const uniqueArray = Array.from(new Set(duplicateInputArray))
      when(mockDeleteDraftEmailMessagesUseCase.execute(anything())).thenResolve(
        { successIds: [], failureIds: uniqueArray },
      )
      await expect(
        instanceUnderTest.deleteDraftEmailMessages({
          ids: duplicateInputArray,
          emailAddressId: '',
        }),
      ).resolves.toEqual({ status: BatchOperationResultStatus.Failure })
    })
    it('returns partial success when there is a mix of success and failure ids', async () => {
      const duplicateInputArray = ['id1', 'id1', 'id2', 'id3', 'id2']
      when(mockDeleteDraftEmailMessagesUseCase.execute(anything())).thenResolve(
        { successIds: ['id1'], failureIds: ['id2', 'id3'] },
      )
      await expect(
        instanceUnderTest.deleteDraftEmailMessages({
          ids: duplicateInputArray,
          emailAddressId: '',
        }),
      ).resolves.toEqual({
        status: BatchOperationResultStatus.Partial,
        failureValues: ['id2', 'id3'],
        successValues: ['id1'],
      })
    })
  })

  describe('getDraftEmailMessage', () => {
    const updatedAt = new Date()
    const rfc822Data = str2ab('data')

    beforeEach(() => {
      when(mockGetDraftEmailMessageUseCase.execute(anything())).thenResolve({
        id: 'id',
        updatedAt,
        rfc822Data,
      })
    })

    it('generates use case', async () => {
      await instanceUnderTest.getDraftEmailMessage({
        id: '',
        emailAddressId: '',
      })
      expect(JestMockGetDraftEmailMessageUseCase).toHaveBeenCalledTimes(1)
    })

    it('calls use case as expected', async () => {
      const id = v4()
      const emailAddressId = v4()
      await instanceUnderTest.getDraftEmailMessage({
        id,
        emailAddressId,
      })
      verify(mockGetDraftEmailMessageUseCase.execute(anything())).once()
      const [actualArgs] = capture(
        mockGetDraftEmailMessageUseCase.execute,
      ).first()
      expect(actualArgs).toEqual<typeof actualArgs>({
        id,
        emailAddressId,
      })
    })

    it('returns undefined when use case returns undefined', async () => {
      when(mockGetDraftEmailMessageUseCase.execute(anything())).thenResolve(
        undefined,
      )
      await expect(
        instanceUnderTest.getDraftEmailMessage({ id: '', emailAddressId: '' }),
      ).resolves.toBeUndefined()
    })

    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.getDraftEmailMessage({
          id: '',
          emailAddressId: '',
        }),
      ).resolves.toEqual<DraftEmailMessage>({
        id: 'id',
        updatedAt,
        rfc822Data,
      })
    })
  })

  describe('listDraftEmailMessageMetadata', () => {
    const updatedAt = new Date()
    beforeEach(() => {
      when(
        mockListDraftEmailMessageMetadataUseCase.execute(anything()),
      ).thenResolve({
        metadata: [{ id: 'id', updatedAt }],
      })
    })

    it('generates use case', async () => {
      await instanceUnderTest.listDraftEmailMessageMetadata('')
      expect(
        JestMockListDraftEmailMessageMetadataUseCase,
      ).toHaveBeenCalledTimes(1)
    })

    it('calls use case as expected', async () => {
      const emailAddressId = v4()
      await instanceUnderTest.listDraftEmailMessageMetadata(emailAddressId)
      verify(
        mockListDraftEmailMessageMetadataUseCase.execute(anything()),
      ).once()
      const [actualArgs] = capture(
        mockListDraftEmailMessageMetadataUseCase.execute,
      ).first()
      expect(actualArgs).toEqual<typeof actualArgs>({
        emailAddressId,
      })
    })

    it('returns empty list when use case returns empty list', async () => {
      when(
        mockListDraftEmailMessageMetadataUseCase.execute(anything()),
      ).thenResolve({
        metadata: [],
      })
      await expect(
        instanceUnderTest.listDraftEmailMessageMetadata(''),
      ).resolves.toHaveLength(0)
    })

    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.listDraftEmailMessageMetadata(''),
      ).resolves.toEqual<DraftEmailMessageMetadata[]>([{ id: 'id', updatedAt }])
    })
  })

  describe('getEmailMessage', () => {
    beforeEach(() => {
      when(mockGetEmailMessageUseCase.execute(anything())).thenResolve(
        EntityDataFactory.emailMessage,
      )
    })
    it('generates use case', async () => {
      await instanceUnderTest.getEmailMessage({
        id: '',
        cachePolicy: CachePolicy.CacheOnly,
      })
      expect(JestMockGetEmailMessageUseCase).toHaveBeenCalledTimes(1)
    })
    it('calls use case as expected', async () => {
      const id = v4()
      const cachePolicy = CachePolicy.CacheOnly
      await instanceUnderTest.getEmailMessage({ id, cachePolicy })
      verify(mockGetEmailMessageUseCase.execute(anything())).once()
      const [actualArgs] = capture(mockGetEmailMessageUseCase.execute).first()
      expect(actualArgs).toEqual<typeof actualArgs>({
        id,
        cachePolicy,
      })
    })

    it('returns undefined if use case result is undefined', async () => {
      when(mockGetEmailMessageUseCase.execute(anything())).thenResolve(
        undefined,
      )
      await expect(
        instanceUnderTest.getEmailMessage({
          id: '',
          cachePolicy: CachePolicy.CacheOnly,
        }),
      ).resolves.toBeUndefined()
    })
    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.getEmailMessage({
          id: '',
          cachePolicy: CachePolicy.CacheOnly,
        }),
      ).resolves.toEqual(APIDataFactory.emailMessage)
    })
  })

  describe('getEmailMessageRfc822Data', () => {
    beforeEach(() => {
      when(
        mockGetEmailMessageRfc822DataUseCase.execute(anything()),
      ).thenResolve({ id: 'emailMessageId', rfc822Data: str2ab('data') })
    })
    it('generates use case', async () => {
      await instanceUnderTest.getEmailMessageRfc822Data({
        id: '',
        emailAddressId: 'emailAddressId',
      })
      expect(JestMockGetEmailMessageRfc822DataUseCase).toHaveBeenCalledTimes(1)
    })
    it('calls use case as expected', async () => {
      const id = v4()
      await instanceUnderTest.getEmailMessageRfc822Data({
        id,
        emailAddressId: 'emailAddressId',
      })
      verify(mockGetEmailMessageRfc822DataUseCase.execute(anything())).once()
      const [actualArgs] = capture(
        mockGetEmailMessageRfc822DataUseCase.execute,
      ).first()
      expect(actualArgs).toEqual<typeof actualArgs>({
        id,
        emailAddressId: 'emailAddressId',
      })
    })
    it('returns undefined if use case returns undefined', async () => {
      when(
        mockGetEmailMessageRfc822DataUseCase.execute(anything()),
      ).thenResolve(undefined)
      await expect(
        instanceUnderTest.getEmailMessageRfc822Data({
          id: '',
          emailAddressId: 'emailAddressId',
        }),
      ).resolves.toBeUndefined()
    })
    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.getEmailMessageRfc822Data({
          id: 'emailMessageId',
          emailAddressId: 'emailAddressId',
        }),
      ).resolves.toEqual({
        id: 'emailMessageId',
        rfc822Data: str2ab('data'),
      })
    })
  })

  describe('listEmailMessagesForEmailAddressId', () => {
    beforeEach(() => {
      when(
        mockListEmailMessagesForEmailAddressIdUseCase.execute(anything()),
      ).thenResolve({
        emailMessages: [EntityDataFactory.emailMessage],
        nextToken: 'nextToken',
      })
    })
    it('generates use case', async () => {
      const emailAddressId = v4()
      await instanceUnderTest.listEmailMessagesForEmailAddressId({
        emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
        limit: 0,
        sortOrder: SortOrder.Desc,
        nextToken: '',
      })
      expect(
        JestMockListEmailMessagesForEmailAddressIdUseCase,
      ).toHaveBeenCalledTimes(1)
    })
    it('calls use case as expected', async () => {
      const emailAddressId = v4()
      const cachePolicy = CachePolicy.CacheOnly
      const dateRange = {
        startDate: new Date(1.0),
        endDate: new Date(2.0),
      }
      const limit = 100
      const sortOrder = SortOrder.Desc
      const nextToken = v4()
      await instanceUnderTest.listEmailMessagesForEmailAddressId({
        emailAddressId,
        cachePolicy,
        dateRange,
        limit,
        sortOrder,
        nextToken,
      })
      verify(
        mockListEmailMessagesForEmailAddressIdUseCase.execute(anything()),
      ).once()
      const [actualArgs] = capture(
        mockListEmailMessagesForEmailAddressIdUseCase.execute,
      ).first()
      expect(actualArgs).toEqual<typeof actualArgs>({
        emailAddressId,
        cachePolicy,
        dateRange,
        limit,
        sortOrder,
        nextToken,
      })
    })
    it('returns empty list if use case result is empty list', async () => {
      const emailAddressId = v4()
      when(
        mockListEmailMessagesForEmailAddressIdUseCase.execute(anything()),
      ).thenResolve({
        emailMessages: [],
        nextToken: undefined,
      })
      await expect(
        instanceUnderTest.listEmailMessagesForEmailAddressId({
          emailAddressId,
          cachePolicy: CachePolicy.CacheOnly,
        }),
      ).resolves.toEqual({ status: 'Success', items: [], nextToken: undefined })
    })
    it('returns expected result', async () => {
      const emailAddressId = v4()
      await expect(
        instanceUnderTest.listEmailMessagesForEmailAddressId({
          emailAddressId,
          cachePolicy: CachePolicy.CacheOnly,
        }),
      ).resolves.toEqual({
        status: 'Success',
        items: [APIDataFactory.emailMessage],
        nextToken: 'nextToken',
      })
    })
  })

  describe('listEmailMessagesForEmailFolderId', () => {
    beforeEach(() => {
      when(
        mockListEmailMessagesForEmailFolderIdUseCase.execute(anything()),
      ).thenResolve({
        emailMessages: [EntityDataFactory.emailMessage],
        nextToken: 'nextToken',
      })
    })
    it('generates use case', async () => {
      const folderId = v4()
      await instanceUnderTest.listEmailMessagesForEmailFolderId({
        folderId,
        cachePolicy: CachePolicy.CacheOnly,
        limit: 0,
        sortOrder: SortOrder.Desc,
        nextToken: '',
      })
      expect(
        JestMockListEmailMessagesForEmailFolderIdUseCase,
      ).toHaveBeenCalledTimes(1)
    })
    it('calls use case as expected', async () => {
      const folderId = v4()
      const cachePolicy = CachePolicy.CacheOnly
      const dateRange = {
        startDate: new Date(1.0),
        endDate: new Date(2.0),
      }
      const limit = 100
      const sortOrder = SortOrder.Desc
      const nextToken = v4()
      await instanceUnderTest.listEmailMessagesForEmailFolderId({
        folderId,
        cachePolicy,
        dateRange,
        limit,
        sortOrder,
        nextToken,
      })
      verify(
        mockListEmailMessagesForEmailFolderIdUseCase.execute(anything()),
      ).once()
      const [actualArgs] = capture(
        mockListEmailMessagesForEmailFolderIdUseCase.execute,
      ).first()
      expect(actualArgs).toEqual<typeof actualArgs>({
        folderId,
        cachePolicy,
        dateRange,
        limit,
        sortOrder,
        nextToken,
      })
    })
    it('returns empty list if use case result is empty list', async () => {
      const folderId = v4()
      when(
        mockListEmailMessagesForEmailFolderIdUseCase.execute(anything()),
      ).thenResolve({
        emailMessages: [],
        nextToken: undefined,
      })
      await expect(
        instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId,
          cachePolicy: CachePolicy.CacheOnly,
        }),
      ).resolves.toEqual({ status: 'Success', items: [], nextToken: undefined })
    })
    it('returns expected result', async () => {
      const folderId = v4()
      await expect(
        instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId,
          cachePolicy: CachePolicy.CacheOnly,
        }),
      ).resolves.toEqual({
        items: [APIDataFactory.emailMessage],
        nextToken: 'nextToken',
        status: 'Success',
      })
    })

    it('returns partial result', async () => {
      when(
        mockListEmailMessagesForEmailFolderIdUseCase.execute(anything()),
      ).thenResolve({
        emailMessages: [
          EntityDataFactory.emailMessage,
          {
            ...EntityDataFactory.emailMessage,
            status: { type: 'Failed', cause: new Error('dummy_error') },
          },
        ],
        nextToken: 'nextToken',
      })
      const folderId = v4()
      await expect(
        instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId,
          cachePolicy: CachePolicy.CacheOnly,
        }),
      ).resolves.toStrictEqual({
        items: [
          {
            id: EntityDataFactory.emailMessage.id,
            owner: EntityDataFactory.emailMessage.owner,
            version: EntityDataFactory.emailMessage.version,
            createdAt: EntityDataFactory.emailMessage.createdAt,
            updatedAt: EntityDataFactory.emailMessage.updatedAt,
            owners: EntityDataFactory.emailMessage.owners,
            emailAddressId: EntityDataFactory.emailMessage.emailAddressId,
            folderId: EntityDataFactory.emailMessage.folderId,
            previousFolderId: EntityDataFactory.emailMessage.previousFolderId,
            seen: EntityDataFactory.emailMessage.seen,
            direction: EntityDataFactory.emailMessage.direction,
            state: EntityDataFactory.emailMessage.state,
            clientRefId: EntityDataFactory.emailMessage.clientRefId,
            from: EntityDataFactory.emailMessage.from,
            to: EntityDataFactory.emailMessage.to,
            subject: EntityDataFactory.emailMessage.subject,
            hasAttachments: EntityDataFactory.emailMessage.hasAttachments,
            replyTo: EntityDataFactory.emailMessage.replyTo,
            bcc: EntityDataFactory.emailMessage.bcc,
            cc: EntityDataFactory.emailMessage.cc,
            sortDate: EntityDataFactory.emailMessage.sortDate,
            size: 12345,
          },
        ],
        failed: [
          {
            item: {
              id: EntityDataFactory.emailMessage.id,
              owner: EntityDataFactory.emailMessage.owner,
              version: EntityDataFactory.emailMessage.version,
              createdAt: EntityDataFactory.emailMessage.createdAt,
              updatedAt: EntityDataFactory.emailMessage.updatedAt,
              owners: EntityDataFactory.emailMessage.owners,
              emailAddressId: EntityDataFactory.emailMessage.emailAddressId,
              folderId: EntityDataFactory.emailMessage.folderId,
              previousFolderId: EntityDataFactory.emailMessage.previousFolderId,
              seen: EntityDataFactory.emailMessage.seen,
              direction: EntityDataFactory.emailMessage.direction,
              state: EntityDataFactory.emailMessage.state,
              clientRefId: EntityDataFactory.emailMessage.clientRefId,
              sortDate: EntityDataFactory.emailMessage.sortDate,
              size: 12345,
            },
            cause: new Error('dummy_error'),
          },
        ],
        nextToken: 'nextToken',
        status: 'Partial',
      })
    })
  })

  describe('deleteEmailMessage', () => {
    it('deletes a single message successfully', async () => {
      when(mockDeleteEmailMessagesUseCase.execute(anything())).thenResolve({
        successIds: ['1'],
        failureIds: [],
      })
      await expect(instanceUnderTest.deleteEmailMessage('1')).resolves.toEqual(
        '1',
      )
    })
    it('returns undefined when single delete fails', async () => {
      when(mockDeleteEmailMessagesUseCase.execute(anything())).thenResolve({
        successIds: [],
        failureIds: [],
      })
      await expect(
        instanceUnderTest.deleteEmailMessage('1'),
      ).resolves.toBeUndefined()
    })
    it('deletes multiple messages successfully', async () => {
      const successIds = ['1', '2', '3']
      when(mockDeleteEmailMessagesUseCase.execute(anything())).thenResolve({
        successIds,
        failureIds: [],
      })
      await expect(
        instanceUnderTest.deleteEmailMessages(successIds),
      ).resolves.toEqual({ status: BatchOperationResultStatus.Success })
    })
    it('returns failure when no messages are deleted', async () => {
      const failureIds = ['1', '2', '3']
      when(mockDeleteEmailMessagesUseCase.execute(anything())).thenResolve({
        successIds: [],
        failureIds,
      })
      await expect(
        instanceUnderTest.deleteEmailMessages(failureIds),
      ).resolves.toEqual({ status: BatchOperationResultStatus.Failure })
    })
    it('returns partial when some of the messages fail to delete', async () => {
      const idsToDelete = ['1', '2', '3', '4', '5']
      const successIds = ['2', '3', '4']
      const failureIds = ['1', '5']
      when(mockDeleteEmailMessagesUseCase.execute(anything())).thenResolve({
        successIds,
        failureIds,
      })
      await expect(
        instanceUnderTest.deleteEmailMessages(idsToDelete),
      ).resolves.toEqual({
        status: BatchOperationResultStatus.Partial,
        successValues: successIds,
        failureValues: failureIds,
      })
    })
  })

  describe('subscribeToEmailMessages', () => {
    it('generates use case', async () => {
      await instanceUnderTest.subscribeToEmailMessages('subscriber-id', {
        emailMessageDeleted(emailMessage: EmailMessage): void {},
        emailMessageCreated(emailMessage: EmailMessage): void {},
      })
      expect(JestMockSubscribeToEmailMessagesUseCase).toHaveBeenCalledTimes(1)
    })
  })

  describe('unsubscribeFromEmailMessages', () => {
    it('generates use case', async () => {
      await instanceUnderTest.unsubscribeFromEmailMessages('subscriber-id')

      expect(JestMockUnsubscribeFromEmailMessagesUseCase).toHaveBeenCalledTimes(
        1,
      )
    })
  })

  describe('getConfigurationData', () => {
    beforeEach(() => {
      when(mockGetConfigurationDataUseCase.execute()).thenResolve(
        EntityDataFactory.configurationData,
      )
    })
    it('generates use case', async () => {
      await instanceUnderTest.getConfigurationData()
      expect(JestMockGetConfigurationDataUseCase).toHaveBeenCalledTimes(1)
    })
    it('calls use case as expected', async () => {
      await instanceUnderTest.getConfigurationData()
      verify(mockGetConfigurationDataUseCase.execute()).once()
    })
    it('returns expected result', async () => {
      await expect(instanceUnderTest.getConfigurationData()).resolves.toEqual(
        APIDataFactory.configurationData,
      )
    })
  })

  describe('importKeys', () => {
    it('throws InvalidArgumentError if no data provided to import', async () => {
      await expect(
        instanceUnderTest.importKeys(new ArrayBuffer(0)),
      ).rejects.toThrow(InvalidArgumentError)
    })
  })
})
