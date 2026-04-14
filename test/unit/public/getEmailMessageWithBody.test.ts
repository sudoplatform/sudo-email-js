/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

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
import { SudoEmailClient } from '../../../src'
import { GetEmailMessageWithBodyUseCase } from '../../../src/private/domain/use-cases/message/getEmailMessageWithBodyUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock(
  '../../../src/private/domain/use-cases/message/getEmailMessageWithBodyUseCase',
)
const ViMockGetEmailMessageWithBodyUseCase =
  GetEmailMessageWithBodyUseCase as MockedClass<
    typeof GetEmailMessageWithBodyUseCase
  >

describe('SudoEmailClient.getEmailMessageWithBody Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockGetEmailMessageWithBodyUseCase =
    mock<GetEmailMessageWithBodyUseCase>()
  const id = 'mockId'
  const body = 'mockBody'

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockGetEmailMessageWithBodyUseCase)
    ViMockGetEmailMessageWithBodyUseCase.mockClear()

    ViMockGetEmailMessageWithBodyUseCase.mockImplementation(function () {
      return instance(mockGetEmailMessageWithBodyUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

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
    expect(ViMockGetEmailMessageWithBodyUseCase).toHaveBeenCalledTimes(1)
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
