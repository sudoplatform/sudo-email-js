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
import { MockedClass } from 'vitest'
import { v4 } from 'uuid'
import { InternetMessageFormatHeader, SudoEmailClient } from '../../../src'
import { DefaultEmailAccountService } from '../../../src/private/data/account/defaultEmailAccountService'
import { DefaultEmailAddressBlocklistService } from '../../../src/private/data/blocklist/defaultEmailAddressBlocklistService'
import { ApiClient } from '../../../src/private/data/common/apiClient'
import { DefaultDeviceKeyWorker } from '../../../src/private/data/common/deviceKeyWorker'
import { DefaultConfigurationDataService } from '../../../src/private/data/configuration/defaultConfigurationDataService'
import { DefaultEmailDomainService } from '../../../src/private/data/emailDomain/defaultEmailDomainService'
import { DefaultEmailFolderService } from '../../../src/private/data/folder/defaultEmailFolderService'
import { DefaultEmailMessageService } from '../../../src/private/data/message/defaultEmailMessageService'
import { SendEmailMessageUseCase } from '../../../src/private/domain/use-cases/message/sendEmailMessageUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock('../../../src/private/domain/use-cases/message/sendEmailMessageUseCase')
const ViMockSendEmailMessageUseCase = SendEmailMessageUseCase as MockedClass<
  typeof SendEmailMessageUseCase
>

describe('SudoEmailClient.sendEmailMessage Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockSendEmailMessageUseCase = mock<SendEmailMessageUseCase>()
  let timestamp: Date

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockSendEmailMessageUseCase)

    ViMockSendEmailMessageUseCase.mockClear()

    ViMockSendEmailMessageUseCase.mockImplementation(function () {
      return instance(mockSendEmailMessageUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

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
    expect(ViMockSendEmailMessageUseCase).toHaveBeenCalledTimes(1)
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
