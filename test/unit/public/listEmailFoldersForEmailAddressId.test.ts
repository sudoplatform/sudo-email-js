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
import { ListEmailFoldersForEmailAddressIdUseCase } from '../../../src/private/domain/use-cases/folder/listEmailFoldersForEmailAddressIdUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/folder/listEmailFoldersForEmailAddressIdUseCase',
)
const JestMockListEmailFoldersForEmailAddressIdUseCase =
  ListEmailFoldersForEmailAddressIdUseCase as jest.MockedClass<
    typeof ListEmailFoldersForEmailAddressIdUseCase
  >

describe('SudoEmailClient.listEmailFoldersForEmailAddressId Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockListEmailFoldersForEmailAddressIdUseCase =
    mock<ListEmailFoldersForEmailAddressIdUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockListEmailFoldersForEmailAddressIdUseCase)

    JestMockListEmailFoldersForEmailAddressIdUseCase.mockClear()

    JestMockListEmailFoldersForEmailAddressIdUseCase.mockImplementation(() =>
      instance(mockListEmailFoldersForEmailAddressIdUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

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
