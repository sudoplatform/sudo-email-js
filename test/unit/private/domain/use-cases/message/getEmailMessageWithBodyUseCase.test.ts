/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { anything, instance, mock, reset, when } from 'ts-mockito'
import { EmailMessageService } from '../../../../../../src/private/domain/entities/message/emailMessageService'
import { GetEmailMessageWithBodyUseCase } from '../../../../../../src/private/domain/use-cases/message/getEmailMessageWithBodyUseCase'
import { stringToArrayBuffer } from '../../../../../../src/private/util/buffer'

describe('GetEmailMessageWithBodyUseCase', () => {
  const mockEmailMessageService = mock<EmailMessageService>()
  const implementationUnderTest = new GetEmailMessageWithBodyUseCase(
    instance(mockEmailMessageService),
  )
  const id = 'mockId'
  const body = 'mockBody'

  beforeEach(() => {
    reset(mockEmailMessageService)
  })

  it('returns undefined when the service returns undefined', async () => {
    when(
      mockEmailMessageService.getEmailMessageWithBody(anything()),
    ).thenResolve(undefined)
    await expect(
      implementationUnderTest.execute({
        id,
        emailAddressId: 'email-address-of-message',
      }),
    ).resolves.toBeUndefined()
  })

  it('returns data from the service', async () => {
    when(
      mockEmailMessageService.getEmailMessageWithBody(anything()),
    ).thenResolve({
      id,
      body,
      attachments: [],
      inlineAttachments: [],
    })
    await expect(
      implementationUnderTest.execute({
        id,
        emailAddressId: 'email-address-of-message',
      }),
    ).resolves.toStrictEqual({
      id,
      body,
      attachments: [],
      inlineAttachments: [],
    })
  })
})
