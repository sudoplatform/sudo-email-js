/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { internal as userSdk } from '@sudoplatform/sudo-user'
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
import { Mocked, MockedClass } from 'vitest'
import { SudoEmailClient, UpdateEmailAddressMetadataInput } from '../../../src'
import { DefaultEmailAccountService } from '../../../src/private/data/account/defaultEmailAccountService'
import { DefaultEmailAddressBlocklistService } from '../../../src/private/data/blocklist/defaultEmailAddressBlocklistService'
import { ApiClient } from '../../../src/private/data/common/apiClient'
import { DefaultDeviceKeyWorker } from '../../../src/private/data/common/deviceKeyWorker'
import { DefaultConfigurationDataService } from '../../../src/private/data/configuration/defaultConfigurationDataService'
import { DefaultEmailDomainService } from '../../../src/private/data/emailDomain/defaultEmailDomainService'
import { DefaultEmailFolderService } from '../../../src/private/data/folder/defaultEmailFolderService'
import { DefaultEmailMessageService } from '../../../src/private/data/message/defaultEmailMessageService'
import { UpdateEmailAccountMetadataUseCase } from '../../../src/private/domain/use-cases/account/updateEmailAccountMetadataUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock('@sudoplatform/sudo-user')
const ViMockUserConfig = userSdk as Mocked<typeof userSdk>
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
  '../../../src/private/data/configuration/defaultConfigurationDataService',
)
const ViMockDefaultConfigurationDataService =
  DefaultConfigurationDataService as MockedClass<
    typeof DefaultConfigurationDataService
  >
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
vi.mock('../../../src/private/data/common/deviceKeyWorker')
const ViMockDeviceKeyWorker = DefaultDeviceKeyWorker as MockedClass<
  typeof DefaultDeviceKeyWorker
>
vi.mock(
  '../../../src/private/domain/use-cases/account/updateEmailAccountMetadataUseCase',
)
const ViMockUpdateEmailAccountMetadataUseCase =
  UpdateEmailAccountMetadataUseCase as MockedClass<
    typeof UpdateEmailAccountMetadataUseCase
  >

describe('SudoEmailClient.updateEmailAccountMetadata Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockUpdateEmailAccountMetadataUseCase =
    mock<UpdateEmailAccountMetadataUseCase>()
  const updateInput: UpdateEmailAddressMetadataInput = {
    id: 'id',
    values: {
      alias: 'Some Alias',
    },
  }

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockUpdateEmailAccountMetadataUseCase)

    ViMockUpdateEmailAccountMetadataUseCase.mockClear()

    ViMockUpdateEmailAccountMetadataUseCase.mockImplementation(function () {
      return instance(mockUpdateEmailAccountMetadataUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockUpdateEmailAccountMetadataUseCase.execute(anything())).thenResolve(
      'id',
    )
  })

  it('generates use case', async () => {
    await instanceUnderTest.updateEmailAddressMetadata({
      id: '',
      values: {
        alias: null,
      },
    })
    expect(ViMockUpdateEmailAccountMetadataUseCase).toHaveBeenCalledTimes(1)
  })
  it('calls use case as expected', async () => {
    await instanceUnderTest.updateEmailAddressMetadata(updateInput)
    verify(mockUpdateEmailAccountMetadataUseCase.execute(anything())).once()
    const [inputArgs] = capture(
      mockUpdateEmailAccountMetadataUseCase.execute,
    ).first()
    expect(inputArgs).toEqual(updateInput)
  })
  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.updateEmailAddressMetadata(updateInput),
    ).resolves.toEqual('id')
  })
})
