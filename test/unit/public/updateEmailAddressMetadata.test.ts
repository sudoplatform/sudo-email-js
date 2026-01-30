/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
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

jest.mock('@sudoplatform/sudo-user')
const JestMockUserConfig = userSdk as jest.Mocked<typeof userSdk>
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
  '../../../src/private/data/configuration/defaultConfigurationDataService',
)
const JestMockDefaultConfigurationDataService =
  DefaultConfigurationDataService as jest.MockedClass<
    typeof DefaultConfigurationDataService
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
jest.mock('../../../src/private/data/common/deviceKeyWorker')
const JestMockDeviceKeyWorker = DefaultDeviceKeyWorker as jest.MockedClass<
  typeof DefaultDeviceKeyWorker
>
jest.mock(
  '../../../src/private/domain/use-cases/account/updateEmailAccountMetadataUseCase',
)
const JestMockUpdateEmailAccountMetadataUseCase =
  UpdateEmailAccountMetadataUseCase as jest.MockedClass<
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

    JestMockUpdateEmailAccountMetadataUseCase.mockClear()

    JestMockUpdateEmailAccountMetadataUseCase.mockImplementation(() =>
      instance(mockUpdateEmailAccountMetadataUseCase),
    )

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
    expect(JestMockUpdateEmailAccountMetadataUseCase).toHaveBeenCalledTimes(1)
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
