/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
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
import { v4 } from 'uuid'
import { SudoEmailClient } from '../../../src'
import { GetEmailMessageWithBodyUseCase } from '../../../src/private/domain/use-cases/message/getEmailMessageWithBodyUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/message/getEmailMessageWithBodyUseCase',
)
const JestMockGetEmailMessageWithBodyUseCase =
  GetEmailMessageWithBodyUseCase as jest.MockedClass<
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
    JestMockGetEmailMessageWithBodyUseCase.mockClear()

    JestMockGetEmailMessageWithBodyUseCase.mockImplementation(() =>
      instance(mockGetEmailMessageWithBodyUseCase),
    )

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
