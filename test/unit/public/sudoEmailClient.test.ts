/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CachePolicy,
  DefaultConfigurationManager,
  PublicKeyFormat,
  SudoCryptoProvider,
  SudoKeyManager,
} from '@sudoplatform/sudo-common'
import { SudoUserClient, internal as userSdk } from '@sudoplatform/sudo-user'
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

import {
  BlockedEmailAddressAction,
  EmailMessage,
  EmailMessageDateRange,
  InvalidArgumentError,
  UnsealedBlockedAddress,
} from '../../../src'
import { UpdateEmailMessagesStatus } from '../../../src/gen/graphqlTypes'
import { DefaultEmailAccountService } from '../../../src/private/data/account/defaultEmailAccountService'
import { DefaultEmailAddressBlocklistService } from '../../../src/private/data/blocklist/defaultEmailAddressBlocklistService'
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
import { GetSupportedEmailDomainsUseCase } from '../../../src/private/domain/use-cases/emailDomain/getSupportedEmailDomainsUseCase'
import { ListEmailAccountsForSudoIdUseCase } from '../../../src/private/domain/use-cases/account/listEmailAccountsForSudoIdUseCase'
import { ListEmailAccountsUseCase } from '../../../src/private/domain/use-cases/account/listEmailAccountsUseCase'
import { LookupEmailAddressesPublicInfoUseCase } from '../../../src/private/domain/use-cases/account/lookupEmailAddressesPublicInfoUseCase'
import { ProvisionEmailAccountUseCase } from '../../../src/private/domain/use-cases/account/provisionEmailAccountUseCase'
import { UpdateEmailAccountMetadataUseCase } from '../../../src/private/domain/use-cases/account/updateEmailAccountMetadataUseCase'
import {
  BlockEmailAddressesUseCase,
  BlockEmailAddressesUseCaseInput,
} from '../../../src/private/domain/use-cases/blocklist/blockEmailAddresses'
import { GetEmailAddressBlocklistUseCase } from '../../../src/private/domain/use-cases/blocklist/getEmailAddressBlocklist'
import {
  UnblockEmailAddressesUseCase,
  UnblockEmailAddressesUseCaseInput,
} from '../../../src/private/domain/use-cases/blocklist/unblockEmailAddresses'
import {
  UnblockEmailAddressesByHashedValueUseCase,
  UnblockEmailAddressesByHashedValueUseCaseInput,
} from '../../../src/private/domain/use-cases/blocklist/unblockEmailAddressesByHashedValue'
import { GetConfigurationDataUseCase } from '../../../src/private/domain/use-cases/configuration/getConfigurationDataUseCase'
import { DeleteDraftEmailMessagesUseCase } from '../../../src/private/domain/use-cases/draft/deleteDraftEmailMessagesUseCase'
import { GetDraftEmailMessageUseCase } from '../../../src/private/domain/use-cases/draft/getDraftEmailMessageUseCase'
import { ListDraftEmailMessageMetadataForEmailAddressIdUseCase } from '../../../src/private/domain/use-cases/draft/listDraftEmailMessageMetadataForEmailAddressIdUseCase'
import { ListDraftEmailMessageMetadataUseCase } from '../../../src/private/domain/use-cases/draft/listDraftEmailMessageMetadataUseCase'
import { ListDraftEmailMessagesForEmailAddressIdUseCase } from '../../../src/private/domain/use-cases/draft/listDraftEmailMessagesForEmailAddressIdUseCase'
import { ListDraftEmailMessagesUseCase } from '../../../src/private/domain/use-cases/draft/listDraftEmailMessagesUseCase'
import { SaveDraftEmailMessageUseCase } from '../../../src/private/domain/use-cases/draft/saveDraftEmailMessageUseCase'
import { UpdateDraftEmailMessageUseCase } from '../../../src/private/domain/use-cases/draft/updateDraftEmailMessageUseCase'
import { CreateCustomEmailFolderUseCase } from '../../../src/private/domain/use-cases/folder/createCustomEmailFolderUseCase'
import { ListEmailFoldersForEmailAddressIdUseCase } from '../../../src/private/domain/use-cases/folder/listEmailFoldersForEmailAddressIdUseCase'
import { DeleteEmailMessagesUseCase } from '../../../src/private/domain/use-cases/message/deleteEmailMessagesUseCase'
import { GetEmailMessageRfc822DataUseCase } from '../../../src/private/domain/use-cases/message/getEmailMessageRfc822DataUseCase'
import { GetEmailMessageUseCase } from '../../../src/private/domain/use-cases/message/getEmailMessageUseCase'
import { GetEmailMessageWithBodyUseCase } from '../../../src/private/domain/use-cases/message/getEmailMessageWithBodyUseCase'
import { ListEmailMessagesForEmailAddressIdUseCase } from '../../../src/private/domain/use-cases/message/listEmailMessagesForEmailAddressIdUseCase'
import { ListEmailMessagesForEmailFolderIdUseCase } from '../../../src/private/domain/use-cases/message/listEmailMessagesForEmailFolderIdUseCase'
import { ListEmailMessagesUseCase } from '../../../src/private/domain/use-cases/message/listEmailMessagesUseCase'
import { SendEmailMessageUseCase } from '../../../src/private/domain/use-cases/message/sendEmailMessageUseCase'
import { SubscribeToEmailMessagesUseCase } from '../../../src/private/domain/use-cases/message/subscribeToEmailMessagesUseCase'
import { UnsubscribeFromEmailMessagesUseCase } from '../../../src/private/domain/use-cases/message/unsubscribeFromEmailMessagesUseCase'
import { UpdateEmailMessagesUseCase } from '../../../src/private/domain/use-cases/message/updateEmailMessagesUseCase'
import { stringToArrayBuffer } from '../../../src/private/util/buffer'
import {
  DefaultSudoEmailClient,
  InternetMessageFormatHeader,
  SudoEmailClient,
} from '../../../src/public/sudoEmailClient'
import { BatchOperationResultStatus } from '../../../src/public/typings/batchOperationResult'
import { DraftEmailMessage } from '../../../src/public/typings/draftEmailMessage'
import { DraftEmailMessageMetadata } from '../../../src/public/typings/draftEmailMessageMetadata'
import { EmailAddressPublicInfo } from '../../../src/public/typings/emailAddressPublicInfo'
import { SortOrder } from '../../../src/public/typings/sortOrder'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { GetConfiguredEmailDomainsUseCase } from '../../../src/private/domain/use-cases/emailDomain/getConfiguredEmailDomainsUseCase'
import { DefaultEmailDomainService } from '../../../src/private/data/emailDomain/defaultEmailDomainService'
import { DeleteCustomEmailFolderUseCase } from '../../../src/private/domain/use-cases/folder/deleteCustomEmailFolderUseCase'
import { UpdateCustomEmailFolderUseCase } from '../../../src/private/domain/use-cases/folder/updateCustomEmailFolderUseCase'

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
  '../../../src/private/domain/use-cases/folder/deleteCustomEmailFolderUseCase',
)
const JestMockDeleteCustomEmailFolderUseCase =
  DeleteCustomEmailFolderUseCase as jest.MockedClass<
    typeof DeleteCustomEmailFolderUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/folder/updateCustomEmailFolderUseCase',
)
const JestMockUpdateCustomEmailFolderUseCase =
  UpdateCustomEmailFolderUseCase as jest.MockedClass<
    typeof UpdateCustomEmailFolderUseCase
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
  '../../../src/private/domain/use-cases/emailDomain/getSupportedEmailDomainsUseCase',
)
const JestMockGetSupportedEmailDomainsUseCase =
  GetSupportedEmailDomainsUseCase as jest.MockedClass<
    typeof GetSupportedEmailDomainsUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/emailDomain/getConfiguredEmailDomainsUseCase',
)
const JestMockGetConfiguredEmailDomainsUseCase =
  GetConfiguredEmailDomainsUseCase as jest.MockedClass<
    typeof GetConfiguredEmailDomainsUseCase
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
  '../../../src/private/domain/use-cases/draft/listDraftEmailMessagesUseCase',
)
const JestMockListDraftEmailMessagesUseCase =
  ListDraftEmailMessagesUseCase as jest.MockedClass<
    typeof ListDraftEmailMessagesUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/draft/listDraftEmailMessagesForEmailAddressIdUseCase',
)
const JestMockListDraftEmailMessagesForEmailAddressIdUseCase =
  ListDraftEmailMessagesForEmailAddressIdUseCase as jest.MockedClass<
    typeof ListDraftEmailMessagesForEmailAddressIdUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/draft/listDraftEmailMessageMetadataUseCase',
)
const JestMockListDraftEmailMessageMetadataUseCase =
  ListDraftEmailMessageMetadataUseCase as jest.MockedClass<
    typeof ListDraftEmailMessageMetadataUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/draft/listDraftEmailMessageMetadataForEmailAddressIdUseCase',
)
const JestMockListDraftEmailMessageMetadataForEmailAddressIdUseCase =
  ListDraftEmailMessageMetadataForEmailAddressIdUseCase as jest.MockedClass<
    typeof ListDraftEmailMessageMetadataForEmailAddressIdUseCase
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
const JestMockListEmailMessagesUseCase =
  ListEmailMessagesUseCase as jest.MockedClass<typeof ListEmailMessagesUseCase>
jest.mock(
  '../../../src/private/domain/use-cases/message/listEmailMessagesUseCase',
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
const JestMockGetEmailMessageWithBodyUseCase =
  GetEmailMessageWithBodyUseCase as jest.MockedClass<
    typeof GetEmailMessageWithBodyUseCase
  >
jest.mock(
  '../../../src/private/domain/use-cases/message/getEmailMessageWithBodyUseCase',
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
  '../../../src/private/domain/use-cases/blocklist/unblockEmailAddressesByHashedValue',
)
const JestMockUnblockEmailAddressesByHashedValueUseCase =
  UnblockEmailAddressesByHashedValueUseCase as jest.MockedClass<
    typeof UnblockEmailAddressesByHashedValueUseCase
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

  // Use case Mocks
  const mockGetConfigurationDataUseCase = mock<GetConfigurationDataUseCase>()
  const mockProvisionEmailAccountUseCase = mock<ProvisionEmailAccountUseCase>()
  const mockCreateCustomEmailFolderUseCase =
    mock<CreateCustomEmailFolderUseCase>()
  const mockDeleteCustomEmailFolderUseCase =
    mock<DeleteCustomEmailFolderUseCase>()
  const mockUpdateCustomEmailFolderUseCase =
    mock<UpdateCustomEmailFolderUseCase>()
  const mockDeprovisionEmailAccountUseCase =
    mock<DeprovisionEmailAccountUseCase>()
  const mockUpdateEmailAccountMetadataUseCase =
    mock<UpdateEmailAccountMetadataUseCase>()
  const mockSendEmailMessageUseCase = mock<SendEmailMessageUseCase>()
  const mockDeleteEmailMessagesUseCase = mock<DeleteEmailMessagesUseCase>()
  const mockGetSupportedEmailDomainsUseCase =
    mock<GetSupportedEmailDomainsUseCase>()
  const mockGetConfiguredEmailDomainsUseCase =
    mock<GetConfiguredEmailDomainsUseCase>()
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
  const mockListDraftEmailMessagesUseCase =
    mock<ListDraftEmailMessagesUseCase>()
  const mockListDraftEmailMessagesForEmailAddressIdUseCase =
    mock<ListDraftEmailMessagesForEmailAddressIdUseCase>()
  const mockListDraftEmailMessageMetadataUseCase =
    mock<ListDraftEmailMessageMetadataUseCase>()
  const mockListDraftEmailMessageMetadataForEmailAddressIdUseCase =
    mock<ListDraftEmailMessageMetadataForEmailAddressIdUseCase>()
  const mockUpdateEmailMessagesUseCase = mock<UpdateEmailMessagesUseCase>()
  const mockGetEmailMessageUseCase = mock<GetEmailMessageUseCase>()
  const mockListEmailMessagesUseCase = mock<ListEmailMessagesUseCase>()
  const mockListEmailMessagesForEmailAddressIdUseCase =
    mock<ListEmailMessagesForEmailAddressIdUseCase>()
  const mockListEmailMessagesForEmailFolderIdUseCase =
    mock<ListEmailMessagesForEmailFolderIdUseCase>()
  const mockGetEmailMessageWithBodyUseCase =
    mock<GetEmailMessageWithBodyUseCase>()
  const mockGetEmailMessageRfc822DataUseCase =
    mock<GetEmailMessageRfc822DataUseCase>()
  const mockSubscribeToEmailMessagesUseCase =
    mock<SubscribeToEmailMessagesUseCase>()
  const mockUnsubscribeFromEmailMessagesUseCase =
    mock<UnsubscribeFromEmailMessagesUseCase>()
  const mockBlockEmailAddressesUseCase = mock<BlockEmailAddressesUseCase>()
  const mockUnblockEmailAddressesUseCase = mock<UnblockEmailAddressesUseCase>()
  const mockUnblockEmailAddressesByHashedValueUseCase =
    mock<UnblockEmailAddressesByHashedValueUseCase>()
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
    reset(mockSudoCryptoProvider)
    reset(mockSudoKeyManager)
    reset(mockApiClient)
    reset(mockEmailAccountService)
    reset(mockEmailDomainService)
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
    reset(mockGetConfiguredEmailDomainsUseCase)
    reset(mockCheckEmailAddressAvailabilityUseCase)
    reset(mockGetEmailAccountUseCase)
    reset(mockListEmailAccountsUseCase)
    reset(mockListEmailAccountsForSudoIdUseCase)
    reset(mockListEmailFoldersForEmailAddressIdUseCase)
    reset(mockCreateCustomEmailFolderUseCase)
    reset(mockDeleteCustomEmailFolderUseCase)
    reset(mockUpdateCustomEmailFolderUseCase)
    reset(mockSaveDraftEmailMessageUseCase)
    reset(mockUpdateDraftEmailMessageUseCase)
    reset(mockDeleteDraftEmailMessagesUseCase)
    reset(mockGetDraftEmailMessageUseCase)
    reset(mockListDraftEmailMessagesUseCase)
    reset(mockListDraftEmailMessagesForEmailAddressIdUseCase)
    reset(mockListDraftEmailMessageMetadataUseCase)
    reset(mockListDraftEmailMessageMetadataForEmailAddressIdUseCase)
    reset(mockUpdateEmailMessagesUseCase)
    reset(mockGetEmailMessageUseCase)
    reset(mockListEmailMessagesUseCase)
    reset(mockListEmailMessagesForEmailAddressIdUseCase)
    reset(mockListEmailMessagesForEmailFolderIdUseCase)
    reset(mockGetEmailMessageWithBodyUseCase)
    reset(mockGetEmailMessageRfc822DataUseCase)
    reset(mockSubscribeToEmailMessagesUseCase)
    reset(mockUnsubscribeFromEmailMessagesUseCase)
    reset(mockGetConfigurationDataUseCase)
    reset(mockBlockEmailAddressesUseCase)
    reset(mockUnblockEmailAddressesUseCase)
    reset(mockUnblockEmailAddressesByHashedValueUseCase)
    reset(mockGetEmailAddressBlocklistUseCase)

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

    JestMockGetConfigurationDataUseCase.mockClear()
    JestMockProvisionEmailAccountUseCase.mockClear()
    JestMockDeprovisionEmailAccountUseCase.mockClear()
    JestMockUpdateEmailAccountMetadataUseCase.mockClear()
    JestMockSendEmailMessageUseCase.mockClear()
    JestMockDeleteEmailMessagesUseCase.mockClear()
    JestMockGetSupportedEmailDomainsUseCase.mockClear()
    JestMockGetConfiguredEmailDomainsUseCase.mockClear()
    JestMockCheckEmailAddressAvailabilityUseCase.mockClear()
    JestMockGetEmailAccountUseCase.mockClear()
    JestMockListEmailAccountsUseCase.mockClear()
    JestMockListEmailAccountsForSudoIdUseCase.mockClear()
    JestMockLookupEmailAddressesPublicInfoUseCase.mockClear()
    JestMockListEmailFoldersForEmailAddressIdUseCase.mockClear()
    JestMockCreateCustomEmailFolderUseCase.mockClear()
    JestMockDeleteCustomEmailFolderUseCase.mockClear()
    JestMockUpdateCustomEmailFolderUseCase.mockClear()
    JestMockSaveDraftEmailMessageUseCase.mockClear()
    JestMockUpdateDraftEmailMessageUseCase.mockClear()
    JestMockDeleteDraftEmailMessagesUseCase.mockClear()
    JestMockGetDraftEmailMessageUseCase.mockClear()
    JestMockListDraftEmailMessagesUseCase.mockClear()
    JestMockListDraftEmailMessagesForEmailAddressIdUseCase.mockClear()
    JestMockListDraftEmailMessageMetadataUseCase.mockClear()
    JestMockListDraftEmailMessageMetadataForEmailAddressIdUseCase.mockClear()
    JestMockUpdateEmailMessagesUseCase.mockClear()
    JestMockGetEmailMessageUseCase.mockClear()
    JestMockListEmailMessagesUseCase.mockClear()
    JestMockListEmailMessagesForEmailAddressIdUseCase.mockClear()
    JestMockListEmailMessagesForEmailFolderIdUseCase.mockClear()
    JestMockGetEmailMessageRfc822DataUseCase.mockClear()
    JestMockSubscribeToEmailMessagesUseCase.mockClear()
    JestMockUnsubscribeFromEmailMessagesUseCase.mockClear()
    JestMockBlockEmailAddressesUseCase.mockClear()
    JestMockUnblockEmailAddressesUseCase.mockClear()
    JestMockUnblockEmailAddressesByHashedValueUseCase.mockClear()
    JestMockGetEmailAddressBlocklistUseCase.mockClear()

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
    JestMockGetConfiguredEmailDomainsUseCase.mockImplementation(() =>
      instance(mockGetConfiguredEmailDomainsUseCase),
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
    JestMockDeleteCustomEmailFolderUseCase.mockImplementation(() =>
      instance(mockDeleteCustomEmailFolderUseCase),
    )
    JestMockUpdateCustomEmailFolderUseCase.mockImplementation(() =>
      instance(mockUpdateCustomEmailFolderUseCase),
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
    JestMockListDraftEmailMessagesUseCase.mockImplementation(() =>
      instance(mockListDraftEmailMessagesUseCase),
    )
    JestMockListDraftEmailMessagesForEmailAddressIdUseCase.mockImplementation(
      () => instance(mockListDraftEmailMessagesForEmailAddressIdUseCase),
    )
    JestMockListDraftEmailMessageMetadataUseCase.mockImplementation(() =>
      instance(mockListDraftEmailMessageMetadataUseCase),
    )
    JestMockListDraftEmailMessageMetadataForEmailAddressIdUseCase.mockImplementation(
      () => instance(mockListDraftEmailMessageMetadataForEmailAddressIdUseCase),
    )
    JestMockUpdateEmailMessagesUseCase.mockImplementation(() =>
      instance(mockUpdateEmailMessagesUseCase),
    )
    JestMockGetEmailMessageUseCase.mockImplementation(() =>
      instance(mockGetEmailMessageUseCase),
    )
    JestMockListEmailMessagesUseCase.mockImplementation(() =>
      instance(mockListEmailMessagesUseCase),
    )
    JestMockListEmailMessagesForEmailAddressIdUseCase.mockImplementation(() =>
      instance(mockListEmailMessagesForEmailAddressIdUseCase),
    )
    JestMockListEmailMessagesForEmailFolderIdUseCase.mockImplementation(() =>
      instance(mockListEmailMessagesForEmailFolderIdUseCase),
    )
    JestMockGetEmailMessageWithBodyUseCase.mockImplementation(() =>
      instance(mockGetEmailMessageWithBodyUseCase),
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
    JestMockUnblockEmailAddressesByHashedValueUseCase.mockImplementation(() =>
      instance(mockUnblockEmailAddressesByHashedValueUseCase),
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
      expect(JestMockDefaultEmailDomainService).toHaveBeenCalledTimes(1)
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

  describe('deleteCustomEmailFolder', () => {
    beforeEach(() => {
      when(mockDeleteCustomEmailFolderUseCase.execute(anything())).thenResolve(
        EntityDataFactory.emailFolderWithCustomEmailFolderName,
      )
    })

    it('generates use case', async () => {
      await instanceUnderTest.deleteCustomEmailFolder({
        emailFolderId: '',
        emailAddressId: '',
      })
      expect(JestMockDeleteCustomEmailFolderUseCase).toHaveBeenCalledTimes(1)
    })

    it('calls use case as expected', async () => {
      await instanceUnderTest.deleteCustomEmailFolder({
        emailFolderId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
        emailAddressId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.emailAddressId,
      })
      verify(mockDeleteCustomEmailFolderUseCase.execute(anything())).once()
      const [args] = capture(mockDeleteCustomEmailFolderUseCase.execute).first()
      expect(args).toEqual({
        emailFolderId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
        emailAddressId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.emailAddressId,
      })
    })

    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.deleteCustomEmailFolder({
          emailFolderId:
            EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
          emailAddressId:
            EntityDataFactory.emailFolderWithCustomEmailFolderName
              .emailAddressId,
        }),
      ).resolves.toEqual(APIDataFactory.emailFolderWithCustomFolderName)
    })

    it('accepts and returns undefined as a result', async () => {
      when(mockDeleteCustomEmailFolderUseCase.execute(anything())).thenResolve(
        undefined,
      )
      await expect(
        instanceUnderTest.deleteCustomEmailFolder({
          emailFolderId:
            EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
          emailAddressId:
            EntityDataFactory.emailFolderWithCustomEmailFolderName
              .emailAddressId,
        }),
      ).resolves.toEqual(undefined)
    })
  })

  describe('updateCustomEmailFolder', () => {
    beforeEach(() => {
      when(mockUpdateCustomEmailFolderUseCase.execute(anything())).thenResolve(
        EntityDataFactory.emailFolderWithCustomEmailFolderName,
      )
    })

    it('generates use case', async () => {
      await instanceUnderTest.updateCustomEmailFolder({
        emailFolderId: '',
        emailAddressId: '',
        values: { customFolderName: 'CUSTOM' },
      })
      expect(JestMockUpdateCustomEmailFolderUseCase).toHaveBeenCalledTimes(1)
    })

    it('calls use case as expected', async () => {
      await instanceUnderTest.updateCustomEmailFolder({
        emailFolderId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
        emailAddressId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.emailAddressId,
        values: { customFolderName: 'CUSTOM' },
      })
      verify(mockUpdateCustomEmailFolderUseCase.execute(anything())).once()
      const [args] = capture(mockUpdateCustomEmailFolderUseCase.execute).first()
      expect(args).toEqual({
        emailFolderId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
        emailAddressId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.emailAddressId,
        values: { customFolderName: 'CUSTOM' },
      })
    })

    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.updateCustomEmailFolder({
          emailFolderId:
            EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
          emailAddressId:
            EntityDataFactory.emailFolderWithCustomEmailFolderName
              .emailAddressId,
          values: { customFolderName: 'CUSTOM' },
        }),
      ).resolves.toEqual(APIDataFactory.emailFolderWithCustomFolderName)
    })
  })

  describe('blockEmailAddresses', () => {
    beforeEach(() => {
      when(mockBlockEmailAddressesUseCase.execute(anything())).thenResolve({
        status: UpdateEmailMessagesStatus.Success,
      })
    })

    it('generates use case', async () => {
      await instanceUnderTest.blockEmailAddresses({
        addressesToBlock: [`spammyMcSpamface${v4()}@spambot.com`],
      })
      expect(JestMockBlockEmailAddressesUseCase).toHaveBeenCalledTimes(1)
    })

    it('calls use case as expected with default action', async () => {
      const addressesToBlock = [
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
      ]
      await instanceUnderTest.blockEmailAddresses({
        addressesToBlock,
      })
      verify(mockBlockEmailAddressesUseCase.execute(anything())).once()
      const [args] = capture(mockBlockEmailAddressesUseCase.execute).first()
      expect(args).toEqual({
        blockedAddresses: addressesToBlock,
        action: BlockedEmailAddressAction.DROP,
      })
    })

    it('calls use case as expected with explicit DROP action', async () => {
      const addressesToBlock = [
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
      ]
      await instanceUnderTest.blockEmailAddresses({
        addressesToBlock,
        action: BlockedEmailAddressAction.DROP,
      })
      verify(mockBlockEmailAddressesUseCase.execute(anything())).once()
      const [args] = capture(mockBlockEmailAddressesUseCase.execute).first()
      expect(args).toEqual({
        blockedAddresses: addressesToBlock,
        action: BlockedEmailAddressAction.DROP,
      })
    })

    it('calls use case as expected with SPAM action', async () => {
      const addressesToBlock = [
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
      ]
      await instanceUnderTest.blockEmailAddresses({
        addressesToBlock,
        action: BlockedEmailAddressAction.SPAM,
      })
      verify(mockBlockEmailAddressesUseCase.execute(anything())).once()
      const [args] = capture(mockBlockEmailAddressesUseCase.execute).first()
      expect(args).toEqual({
        blockedAddresses: addressesToBlock,
        action: BlockedEmailAddressAction.SPAM,
      })
    })

    it('calls use case as expected with emailAddressId', async () => {
      const addressesToBlock = [
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
        `spammyMcSpamface${v4()}@spambot.com`,
      ]
      await instanceUnderTest.blockEmailAddresses({
        addressesToBlock,
        emailAddressId: 'mockEmailAddressId',
      })
      verify(mockBlockEmailAddressesUseCase.execute(anything())).once()
      const [args] = capture(mockBlockEmailAddressesUseCase.execute).first()
      expect(args).toEqual({
        blockedAddresses: addressesToBlock,
        action: BlockedEmailAddressAction.DROP,
        emailAddressId: 'mockEmailAddressId',
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
          addressesToBlock,
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
          addressesToBlock,
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
          addressesToBlock,
        }),
      ).resolves.toEqual({
        status: BatchOperationResultStatus.Partial,
        failureValues: [addressesToBlock[0]],
        successValues: [addressesToBlock[1], addressesToBlock[2]],
      })
    })
  })

  describe('unblockEmailAddresses', () => {
    beforeEach(() => {
      when(mockUnblockEmailAddressesUseCase.execute(anything())).thenResolve({
        status: UpdateEmailMessagesStatus.Success,
      })
    })

    it('generates use case', async () => {
      await instanceUnderTest.unblockEmailAddresses({
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
        addresses: addressesToBlock,
      })
      verify(mockUnblockEmailAddressesUseCase.execute(anything())).once()
      const [args] = capture(mockUnblockEmailAddressesUseCase.execute).first()
      expect(args).toEqual({
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
          addresses: addressesToBlock,
        }),
      ).resolves.toEqual({
        status: BatchOperationResultStatus.Partial,
        failureValues: [addressesToBlock[0]],
        successValues: [addressesToBlock[1], addressesToBlock[2]],
      })
    })
  })

  describe('unblockEmailAddressesByHashedValue', () => {
    beforeEach(() => {
      when(
        mockUnblockEmailAddressesByHashedValueUseCase.execute(anything()),
      ).thenResolve({
        status: UpdateEmailMessagesStatus.Success,
      })
    })

    it('generates use case', async () => {
      await instanceUnderTest.unblockEmailAddressesByHashedValue({
        hashedValues: [`hashedValue-${v4()}`],
      })
      expect(
        JestMockUnblockEmailAddressesByHashedValueUseCase,
      ).toHaveBeenCalledTimes(1)
    })

    it('calls use case as expected', async () => {
      const hashedValues = [
        `hashedValue-${v4()}`,
        `hashedValue-${v4()}`,
        `hashedValue-${v4()}`,
      ]
      await instanceUnderTest.unblockEmailAddressesByHashedValue({
        hashedValues,
      })
      verify(
        mockUnblockEmailAddressesByHashedValueUseCase.execute(anything()),
      ).once()
      const [args] = capture(
        mockUnblockEmailAddressesByHashedValueUseCase.execute,
      ).first()
      expect(args).toEqual({
        hashedValues,
      })
    })

    it('returns expected result on success', async () => {
      const hashedValues = [
        `hashedValue-${v4()}`,
        `hashedValue-${v4()}`,
        `hashedValue-${v4()}`,
      ]
      await expect(
        instanceUnderTest.unblockEmailAddressesByHashedValue({
          hashedValues,
        }),
      ).resolves.toEqual({ status: BatchOperationResultStatus.Success })
    })

    it('returns expected result on failure', async () => {
      when(
        mockUnblockEmailAddressesByHashedValueUseCase.execute(anything()),
      ).thenResolve({
        status: UpdateEmailMessagesStatus.Failed,
      })
      const hashedValues = [
        `hashedValue-${v4()}`,
        `hashedValue-${v4()}`,
        `hashedValue-${v4()}`,
      ]
      await expect(
        instanceUnderTest.unblockEmailAddressesByHashedValue({
          hashedValues,
        }),
      ).resolves.toEqual({ status: BatchOperationResultStatus.Failure })
    })

    it('returns expected result on partial success', async () => {
      when(
        mockUnblockEmailAddressesByHashedValueUseCase.execute(anything()),
      ).thenCall((input: UnblockEmailAddressesByHashedValueUseCaseInput) => {
        const [first, ...rest] = input.hashedValues
        return Promise.resolve({
          status: UpdateEmailMessagesStatus.Partial,
          failedAddresses: [first],
          successAddresses: rest,
        })
      })
      const hashedValues = [
        `hashedValue-${v4()}`,
        `hashedValue-${v4()}`,
        `hashedValue-${v4()}`,
      ]
      await expect(
        instanceUnderTest.unblockEmailAddressesByHashedValue({
          hashedValues,
        }),
      ).resolves.toEqual({
        status: BatchOperationResultStatus.Partial,
        failureValues: [hashedValues[0]],
        successValues: [hashedValues[1], hashedValues[2]],
      })
    })
  })

  describe('getEmailAddressBlocklist', () => {
    const blockedAddresses: UnsealedBlockedAddress[] = [
      {
        address: `spammyMcSpamface-${v4()}@spambot.com`,
        hashedBlockedValue: 'dummyHashedValue',
        status: { type: 'Completed' },
        action: BlockedEmailAddressAction.DROP,
      },
      {
        address: `spammyMcSpamface-${v4()}@spambot.com`,
        hashedBlockedValue: 'dummyHashedValue',
        status: { type: 'Completed' },
        action: BlockedEmailAddressAction.DROP,
      },
    ]
    beforeEach(() => {
      when(mockGetEmailAddressBlocklistUseCase.execute()).thenResolve(
        blockedAddresses,
      )
    })

    it('generates use case', async () => {
      await instanceUnderTest.getEmailAddressBlocklist()
      expect(JestMockGetEmailAddressBlocklistUseCase).toHaveBeenCalledTimes(1)
    })

    it('calls use case as expected', async () => {
      await instanceUnderTest.getEmailAddressBlocklist()
      verify(mockGetEmailAddressBlocklistUseCase.execute()).once()
      const [args] = capture(
        mockGetEmailAddressBlocklistUseCase.execute,
      ).first()
    })

    it('returns expected list of blocked addresses', async () => {
      await expect(
        instanceUnderTest.getEmailAddressBlocklist(),
      ).resolves.toEqual(blockedAddresses)
    })

    it('returns expected list of blocked addresses including emailAddressId', async () => {
      const expected = blockedAddresses.map((blockedAddress) => ({
        ...blockedAddress,
        emailAddressId: 'mockEmailAddressId',
      }))
      when(mockGetEmailAddressBlocklistUseCase.execute()).thenResolve(expected)
      await expect(
        instanceUnderTest.getEmailAddressBlocklist(),
      ).resolves.toEqual(expected)
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
    let timestamp: Date
    beforeEach(() => {
      timestamp = new Date()
      when(mockSendEmailMessageUseCase.execute(anything())).thenResolve({
        id: 'id',
        createdAt: timestamp,
      })
    })
    it('generates use case', async () => {
      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: '',
        emailMessageHeader: {} as unknown as InternetMessageFormatHeader,
        body: '',
        attachments: [],
        inlineAttachments: [],
      })
      expect(JestMockSendEmailMessageUseCase).toHaveBeenCalledTimes(1)
    })
    it('calls use case as expected', async () => {
      const senderEmailAddressId = v4()
      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId,
        emailMessageHeader: {} as unknown as InternetMessageFormatHeader,
        body: '',
        attachments: [],
        inlineAttachments: [],
      })
      verify(mockSendEmailMessageUseCase.execute(anything())).once()
      const [actualInput] = capture(mockSendEmailMessageUseCase.execute).first()
      expect(actualInput.senderEmailAddressId).toEqual(senderEmailAddressId)
    })
    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.sendEmailMessage({
          senderEmailAddressId: '',
          emailMessageHeader: {} as unknown as InternetMessageFormatHeader,
          body: '',
          attachments: [],
          inlineAttachments: [],
        }),
      ).resolves.toEqual({ id: 'id', createdAt: timestamp })
    })
  })

  describe('updateEmailMessages', () => {
    beforeEach(() => {
      when(mockUpdateEmailMessagesUseCase.execute(anything())).thenResolve({
        status: UpdateEmailMessagesStatus.Partial,
        successMessages: [
          {
            id: 'successId',
            createdAt: new Date(1.0),
            updatedAt: new Date(2.0),
          },
        ],
        failureMessages: [{ id: 'failureId', errorType: 'UnknownError' }],
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
      ).resolves.toEqual({
        status: BatchOperationResultStatus.Success,
        successValues: [],
        failureValues: [],
      })
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
      ).resolves.toEqual({
        status: BatchOperationResultStatus.Failure,
        successValues: [],
        failureValues: [],
      })
    })
    it('returns partial success when use case returns partial update status', async () => {
      const duplicateInputArray = ['id1', 'id1', 'id2', 'id3', 'id2']
      when(mockUpdateEmailMessagesUseCase.execute(anything())).thenResolve({
        status: UpdateEmailMessagesStatus.Partial,
        successMessages: [
          {
            id: 'id1',
            createdAt: new Date(1.0),
            updatedAt: new Date(2.0),
          },
        ],
        failureMessages: [
          { id: 'id2', errorType: 'UnknownError' },
          { id: 'id3', errorType: 'UnknownError' },
        ],
      })
      await expect(
        instanceUnderTest.updateEmailMessages({
          ids: duplicateInputArray,
          values: { folderId: 'folderId', seen: true },
        }),
      ).resolves.toEqual({
        status: BatchOperationResultStatus.Partial,
        successValues: [
          {
            id: 'id1',
            createdAt: new Date(1.0),
            updatedAt: new Date(2.0),
          },
        ],
        failureValues: [
          { id: 'id2', errorType: 'UnknownError' },
          { id: 'id3', errorType: 'UnknownError' },
        ],
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

  describe('getConfiguredEmailDomains', () => {
    beforeEach(() => {
      when(
        mockGetConfiguredEmailDomainsUseCase.execute(anything()),
      ).thenResolve([{ domain: 'domain.com' }])
    })
    it('generates use case', async () => {
      await instanceUnderTest.getConfiguredEmailDomains(CachePolicy.CacheOnly)
      expect(JestMockGetConfiguredEmailDomainsUseCase).toHaveBeenCalledTimes(1)
    })
    it('calls use case as expected', async () => {
      await instanceUnderTest.getConfiguredEmailDomains(CachePolicy.CacheOnly)
      verify(mockGetConfiguredEmailDomainsUseCase.execute(anything())).once()
      const [actualCachePolicy] = capture(
        mockGetConfiguredEmailDomainsUseCase.execute,
      ).first()
      expect(actualCachePolicy).toEqual(CachePolicy.CacheOnly)
    })
    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.getConfiguredEmailDomains(CachePolicy.CacheOnly),
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
        emailAddressId: 'emailAddressId',
        updatedAt,
      })
    })

    it('generates use case', async () => {
      await instanceUnderTest.createDraftEmailMessage({
        rfc822Data: stringToArrayBuffer(''),
        senderEmailAddressId: '',
      })
      expect(JestMockSaveDraftEmailMessageUseCase).toHaveBeenCalledTimes(1)
    })

    it('calls use case as expected', async () => {
      const rfc822Data = stringToArrayBuffer(v4())
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
          rfc822Data: stringToArrayBuffer(''),
          senderEmailAddressId: '',
        }),
      ).resolves.toEqual<DraftEmailMessageMetadata>({
        id: 'draftId',
        emailAddressId: 'emailAddressId',
        updatedAt,
      })
    })
  })

  describe('updateDraftEmailMessage', () => {
    const updatedAt = new Date()

    beforeEach(() => {
      when(mockUpdateDraftEmailMessageUseCase.execute(anything())).thenResolve({
        id: 'draftId',
        emailAddressId: 'emailAddressId',
        updatedAt,
      })
    })

    it('generates use case', async () => {
      await instanceUnderTest.updateDraftEmailMessage({
        id: '',
        rfc822Data: stringToArrayBuffer(''),
        senderEmailAddressId: '',
      })
      expect(JestMockUpdateDraftEmailMessageUseCase).toHaveBeenCalledTimes(1)
    })

    it('calls use case as expected', async () => {
      const id = v4()
      const rfc822Data = stringToArrayBuffer(v4())
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
          rfc822Data: stringToArrayBuffer(''),
          senderEmailAddressId: '',
        }),
      ).resolves.toEqual({
        id: 'draftId',
        emailAddressId: 'emailAddressId',
        updatedAt,
      })
    })
  })

  describe('deleteDraftEmailMessages', () => {
    beforeEach(() => {
      when(mockDeleteDraftEmailMessagesUseCase.execute(anything())).thenResolve(
        {
          successIds: [],
          failureMessages: [],
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
      const successValues = uniqueArray.map((id) => ({ id }))
      when(mockDeleteDraftEmailMessagesUseCase.execute(anything())).thenResolve(
        {
          successIds: uniqueArray,
          failureMessages: [],
        },
      )
      await expect(
        instanceUnderTest.deleteDraftEmailMessages({
          ids: duplicateInputArray,
          emailAddressId: '',
        }),
      ).resolves.toEqual({
        status: BatchOperationResultStatus.Success,
        successValues: successValues,
        failureValues: [],
      })
    })
    it('returns failure when all failure ids equal the unique set of input ids', async () => {
      const duplicateInputArray = ['id1', 'id1', 'id2', 'id3', 'id2']
      const uniqueArray = Array.from(new Set(duplicateInputArray))
      when(mockDeleteDraftEmailMessagesUseCase.execute(anything())).thenResolve(
        {
          successIds: [],
          failureMessages: uniqueArray.map((id) => ({
            id,
            errorType: 'error',
          })),
        },
      )
      await expect(
        instanceUnderTest.deleteDraftEmailMessages({
          ids: duplicateInputArray,
          emailAddressId: '',
        }),
      ).resolves.toEqual({
        status: BatchOperationResultStatus.Failure,
        failureValues: [
          { id: 'id1', errorType: 'error' },
          { id: 'id2', errorType: 'error' },
          { id: 'id3', errorType: 'error' },
        ],
        successValues: [],
      })
    })
    it('returns partial success when there is a mix of success and failure ids', async () => {
      const duplicateInputArray = ['id1', 'id1', 'id2', 'id3', 'id2']
      when(mockDeleteDraftEmailMessagesUseCase.execute(anything())).thenResolve(
        {
          successIds: ['id1'],
          failureMessages: [
            { id: 'id2', errorType: 'error' },
            { id: 'id3', errorType: 'error' },
          ],
        },
      )
      await expect(
        instanceUnderTest.deleteDraftEmailMessages({
          ids: duplicateInputArray,
          emailAddressId: '',
        }),
      ).resolves.toEqual({
        status: BatchOperationResultStatus.Partial,
        failureValues: [
          { id: 'id2', errorType: 'error' },
          { id: 'id3', errorType: 'error' },
        ],
        successValues: [{ id: 'id1' }],
      })
    })
  })

  describe('getDraftEmailMessage', () => {
    const updatedAt = new Date()
    const rfc822Data = stringToArrayBuffer('data')

    beforeEach(() => {
      when(mockGetDraftEmailMessageUseCase.execute(anything())).thenResolve({
        id: 'id',
        emailAddressId: 'emailAddressId',
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
        emailAddressId: 'emailAddressId',
        updatedAt,
        rfc822Data,
      })
    })
  })

  describe('listDraftEmailMessages', () => {
    const updatedAt = new Date()
    const rfc822Data = stringToArrayBuffer('data')

    beforeEach(() => {
      when(mockListDraftEmailMessagesUseCase.execute()).thenResolve({
        draftMessages: [
          { id: 'id', emailAddressId: 'emailAddressId', updatedAt, rfc822Data },
        ],
      })
    })

    it('generates use case', async () => {
      await instanceUnderTest.listDraftEmailMessages()
      expect(JestMockListDraftEmailMessagesUseCase).toHaveBeenCalledTimes(1)
    })

    it('calls use case as expected', async () => {
      await instanceUnderTest.listDraftEmailMessages()
      verify(mockListDraftEmailMessagesUseCase.execute()).once()
    })

    it('returns empty list when use case returns empty list', async () => {
      when(mockListDraftEmailMessagesUseCase.execute()).thenResolve({
        draftMessages: [],
      })
      await expect(
        instanceUnderTest.listDraftEmailMessages(),
      ).resolves.toHaveLength(0)
    })

    it('returns expected result', async () => {
      await expect(instanceUnderTest.listDraftEmailMessages()).resolves.toEqual<
        DraftEmailMessage[]
      >([{ id: 'id', emailAddressId: 'emailAddressId', updatedAt, rfc822Data }])
    })
  })

  describe('listDraftEmailMessagesForEmailAddressId', () => {
    const updatedAt = new Date()
    const rfc822Data = stringToArrayBuffer('data')

    beforeEach(() => {
      when(
        mockListDraftEmailMessagesForEmailAddressIdUseCase.execute(anything()),
      ).thenResolve({
        draftMessages: [
          { id: 'id', emailAddressId: 'emailAddressId', updatedAt, rfc822Data },
        ],
      })
    })

    it('generates use case', async () => {
      await instanceUnderTest.listDraftEmailMessagesForEmailAddressId('')
      expect(
        JestMockListDraftEmailMessagesForEmailAddressIdUseCase,
      ).toHaveBeenCalledTimes(1)
    })

    it('calls use case as expected', async () => {
      const emailAddressId = v4()
      await instanceUnderTest.listDraftEmailMessagesForEmailAddressId(
        emailAddressId,
      )
      verify(
        mockListDraftEmailMessagesForEmailAddressIdUseCase.execute(anything()),
      ).once()
      const [actualArgs] = capture(
        mockListDraftEmailMessagesForEmailAddressIdUseCase.execute,
      ).first()
      expect(actualArgs).toEqual<typeof actualArgs>({
        emailAddressId,
      })
    })

    it('returns empty list when use case returns empty list', async () => {
      when(
        mockListDraftEmailMessagesForEmailAddressIdUseCase.execute(anything()),
      ).thenResolve({
        draftMessages: [],
      })
      await expect(
        instanceUnderTest.listDraftEmailMessagesForEmailAddressId(''),
      ).resolves.toHaveLength(0)
    })

    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.listDraftEmailMessagesForEmailAddressId(''),
      ).resolves.toEqual<DraftEmailMessage[]>([
        { id: 'id', emailAddressId: 'emailAddressId', updatedAt, rfc822Data },
      ])
    })
  })

  describe('listDraftEmailMessageMetadata', () => {
    const updatedAt = new Date()
    beforeEach(() => {
      when(mockListDraftEmailMessageMetadataUseCase.execute()).thenResolve({
        metadata: [{ id: 'id', emailAddressId: 'emailAddressId', updatedAt }],
      })
    })

    it('generates use case', async () => {
      await instanceUnderTest.listDraftEmailMessageMetadata()
      expect(
        JestMockListDraftEmailMessageMetadataUseCase,
      ).toHaveBeenCalledTimes(1)
    })

    it('calls use case as expected', async () => {
      const emailAddressId = v4()
      await instanceUnderTest.listDraftEmailMessageMetadata()
      verify(mockListDraftEmailMessageMetadataUseCase.execute()).once()
    })

    it('returns empty list when use case returns empty list', async () => {
      when(mockListDraftEmailMessageMetadataUseCase.execute()).thenResolve({
        metadata: [],
      })
      await expect(
        instanceUnderTest.listDraftEmailMessageMetadata(),
      ).resolves.toHaveLength(0)
    })

    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.listDraftEmailMessageMetadata(),
      ).resolves.toEqual<DraftEmailMessageMetadata[]>([
        { id: 'id', emailAddressId: 'emailAddressId', updatedAt },
      ])
    })
  })

  describe('listDraftEmailMessageMetadataForEmailAddressId', () => {
    const updatedAt = new Date()
    beforeEach(() => {
      when(
        mockListDraftEmailMessageMetadataForEmailAddressIdUseCase.execute(
          anything(),
        ),
      ).thenResolve({
        metadata: [{ id: 'id', emailAddressId: 'emailAddressId', updatedAt }],
      })
    })

    it('generates use case', async () => {
      await instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId('')
      expect(
        JestMockListDraftEmailMessageMetadataForEmailAddressIdUseCase,
      ).toHaveBeenCalledTimes(1)
    })

    it('calls use case as expected', async () => {
      const emailAddressId = v4()
      await instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId(
        emailAddressId,
      )
      verify(
        mockListDraftEmailMessageMetadataForEmailAddressIdUseCase.execute(
          anything(),
        ),
      ).once()
      const [actualArgs] = capture(
        mockListDraftEmailMessageMetadataForEmailAddressIdUseCase.execute,
      ).first()
      expect(actualArgs).toEqual<typeof actualArgs>({
        emailAddressId,
      })
    })

    it('returns empty list when use case returns empty list', async () => {
      when(
        mockListDraftEmailMessageMetadataForEmailAddressIdUseCase.execute(
          anything(),
        ),
      ).thenResolve({
        metadata: [],
      })
      await expect(
        instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId(''),
      ).resolves.toHaveLength(0)
    })

    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId(''),
      ).resolves.toEqual<DraftEmailMessageMetadata[]>([
        { id: 'id', emailAddressId: 'emailAddressId', updatedAt },
      ])
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

  describe('getEmailMessageWithBody', () => {
    const id = 'mockId'
    const body = 'mockBody'
    beforeEach(() => {
      when(mockGetEmailMessageWithBodyUseCase.execute(anything())).thenResolve({
        id,
        body,
        attachments: [],
        inlineAttachments: [],
      })
    })
    it('generates use case', async () => {
      await instanceUnderTest.getEmailMessageWithBody({
        id: '',
        emailAddressId: 'emailAddressId',
      })
      expect(JestMockGetEmailMessageWithBodyUseCase).toHaveBeenCalledTimes(1)
    })
    it('calls use case as expected', async () => {
      const id = v4()
      await instanceUnderTest.getEmailMessageWithBody({
        id,
        emailAddressId: 'emailAddressId',
      })
      verify(mockGetEmailMessageWithBodyUseCase.execute(anything())).once()
      const [actualArgs] = capture(
        mockGetEmailMessageWithBodyUseCase.execute,
      ).first()
      expect(actualArgs).toEqual<typeof actualArgs>({
        id,
        emailAddressId: 'emailAddressId',
      })
    })
    it('returns undefined if use case returns undefined', async () => {
      when(mockGetEmailMessageWithBodyUseCase.execute(anything())).thenResolve(
        undefined,
      )
      await expect(
        instanceUnderTest.getEmailMessageWithBody({
          id: '',
          emailAddressId: 'emailAddressId',
        }),
      ).resolves.toBeUndefined()
    })
    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.getEmailMessageWithBody({
          id: 'emailMessageId',
          emailAddressId: 'emailAddressId',
        }),
      ).resolves.toEqual({
        id,
        body,
        attachments: [],
        inlineAttachments: [],
      })
    })
  })

  describe('getEmailMessageRfc822Data', () => {
    beforeEach(() => {
      when(
        mockGetEmailMessageRfc822DataUseCase.execute(anything()),
      ).thenResolve({
        id: 'emailMessageId',
        rfc822Data: stringToArrayBuffer('data'),
      })
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
        rfc822Data: stringToArrayBuffer('data'),
      })
    })
  })

  describe('listEmailMessages', () => {
    beforeEach(() => {
      when(mockListEmailMessagesUseCase.execute(anything())).thenResolve({
        emailMessages: [EntityDataFactory.emailMessage],
        nextToken: 'nextToken',
      })
    })
    it('generates use case', async () => {
      await instanceUnderTest.listEmailMessages({
        cachePolicy: CachePolicy.CacheOnly,
        limit: 0,
        sortOrder: SortOrder.Desc,
        nextToken: '',
      })
      expect(JestMockListEmailMessagesUseCase).toHaveBeenCalledTimes(1)
    })
    it('calls use case as expected', async () => {
      const cachePolicy = CachePolicy.CacheOnly
      const dateRange = {
        sortDate: {
          startDate: new Date(1.0),
          endDate: new Date(2.0),
        },
      }
      const limit = 100
      const sortOrder = SortOrder.Desc
      const nextToken = v4()
      await instanceUnderTest.listEmailMessages({
        dateRange,
        cachePolicy,
        limit,
        sortOrder,
        nextToken,
      })
      verify(mockListEmailMessagesUseCase.execute(anything())).once()
      const [actualArgs] = capture(mockListEmailMessagesUseCase.execute).first()
      expect(actualArgs).toEqual<typeof actualArgs>({
        dateRange,
        cachePolicy,
        limit,
        sortOrder,
        nextToken,
      })
    })
    it('returns empty list if use case result is empty list', async () => {
      when(mockListEmailMessagesUseCase.execute(anything())).thenResolve({
        emailMessages: [],
        nextToken: undefined,
      })
      await expect(
        instanceUnderTest.listEmailMessages({
          cachePolicy: CachePolicy.CacheOnly,
        }),
      ).resolves.toEqual({ status: 'Success', items: [], nextToken: undefined })
    })
    it('returns expected result', async () => {
      await expect(
        instanceUnderTest.listEmailMessages({
          cachePolicy: CachePolicy.CacheOnly,
        }),
      ).resolves.toEqual({
        status: 'Success',
        items: [APIDataFactory.emailMessage],
        nextToken: 'nextToken',
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
      const dateRange: EmailMessageDateRange = {
        sortDate: {
          startDate: new Date(1.0),
          endDate: new Date(2.0),
        },
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
      const dateRange: EmailMessageDateRange = {
        sortDate: {
          startDate: new Date(1.0),
          endDate: new Date(2.0),
        },
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
            repliedTo: EntityDataFactory.emailMessage.repliedTo,
            forwarded: EntityDataFactory.emailMessage.forwarded,
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
            encryptionStatus: EntityDataFactory.emailMessage.encryptionStatus,
            date: EntityDataFactory.emailMessage.date,
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
              repliedTo: EntityDataFactory.emailMessage.repliedTo,
              forwarded: EntityDataFactory.emailMessage.forwarded,
              direction: EntityDataFactory.emailMessage.direction,
              state: EntityDataFactory.emailMessage.state,
              clientRefId: EntityDataFactory.emailMessage.clientRefId,
              sortDate: EntityDataFactory.emailMessage.sortDate,
              size: 12345,
              encryptionStatus: EntityDataFactory.emailMessage.encryptionStatus,
              date: EntityDataFactory.emailMessage.date,
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
        failureMessages: [],
      })
      await expect(instanceUnderTest.deleteEmailMessage('1')).resolves.toEqual({
        id: '1',
      })
    })
    it('returns undefined when single delete fails', async () => {
      when(mockDeleteEmailMessagesUseCase.execute(anything())).thenResolve({
        successIds: [],
        failureMessages: [],
      })
      await expect(
        instanceUnderTest.deleteEmailMessage('1'),
      ).resolves.toBeUndefined()
    })
    it('deletes multiple messages successfully', async () => {
      const messageIds = ['1', '2', '3']
      const successResult = messageIds.map((id) => ({ id }))
      when(mockDeleteEmailMessagesUseCase.execute(anything())).thenResolve({
        successIds: messageIds,
        failureMessages: [],
      })
      await expect(
        instanceUnderTest.deleteEmailMessages(messageIds),
      ).resolves.toEqual({
        status: BatchOperationResultStatus.Success,
        successValues: successResult,
        failureValues: [],
      })
    })
    it('returns failure when no messages are deleted', async () => {
      const messageIds = ['1', '2', '3']
      const failureResult = messageIds.map((id) => ({ id, errorType: '' }))
      when(mockDeleteEmailMessagesUseCase.execute(anything())).thenResolve({
        successIds: [],
        failureMessages: failureResult,
      })
      await expect(
        instanceUnderTest.deleteEmailMessages(messageIds),
      ).resolves.toEqual({
        status: BatchOperationResultStatus.Failure,
        successValues: [],
        failureValues: failureResult,
      })
    })
    it('returns partial when some of the messages fail to delete', async () => {
      const idsToDelete = ['1', '2', '3', '4', '5']
      const successIds = ['2', '3', '4']
      const successResult = successIds.map((id) => ({ id }))
      const failureIds = ['1', '5']
      const failureResult = failureIds.map((id) => ({ id, errorType: '' }))
      when(mockDeleteEmailMessagesUseCase.execute(anything())).thenResolve({
        successIds: successIds,
        failureMessages: failureResult,
      })
      await expect(
        instanceUnderTest.deleteEmailMessages(idsToDelete),
      ).resolves.toEqual({
        status: BatchOperationResultStatus.Partial,
        successValues: successResult,
        failureValues: failureResult,
      })
    })
  })

  describe('subscribeToEmailMessages', () => {
    it('generates use case', async () => {
      await instanceUnderTest.subscribeToEmailMessages('subscriber-id', {
        emailMessageDeleted(emailMessage: EmailMessage): void {},
        emailMessageCreated(emailMessage: EmailMessage): void {},
        emailMessageUpdated(emailMessage: EmailMessage): void {},
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
