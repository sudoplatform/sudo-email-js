/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { anything, instance, mock, reset, when } from 'ts-mockito'
import { EmailMessageService } from '../../../../../../src/private/domain/entities/message/emailMessageService'
import { GetEmailMessageRfc822DataUseCase } from '../../../../../../src/private/domain/use-cases/message/getEmailMessageRfc822DataUseCase'
import { stringToArrayBuffer } from '../../../../../../src/private/util/buffer'

describe('GetEmailMessageRfc822DataUseCase', () => {
  const mockEmailMessageService = mock<EmailMessageService>()
  const implementationUnderTest = new GetEmailMessageRfc822DataUseCase(
    instance(mockEmailMessageService),
  )

  beforeEach(() => {
    reset(mockEmailMessageService)
  })

  it('returns undefined when the service returns undefined', async () => {
    when(
      mockEmailMessageService.getEmailMessageRfc822Data(anything()),
    ).thenResolve(undefined)
    await expect(
      implementationUnderTest.execute({
        id: 'messageToGet',
        emailAddressId: 'email-address-of-message',
      }),
    ).resolves.toBeUndefined()
  })

  it('returns data from the service', async () => {
    when(
      mockEmailMessageService.getEmailMessageRfc822Data(anything()),
    ).thenResolve(stringToArrayBuffer('test'))
    await expect(
      implementationUnderTest.execute({
        id: 'messageToGet',
        emailAddressId: 'email-address-of-message',
      }),
    ).resolves.toStrictEqual({
      id: 'messageToGet',
      rfc822Data: stringToArrayBuffer('test'),
    })
  })
})
