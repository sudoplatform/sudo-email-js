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
import { GetEmailMessageRfc822DataUseCase } from '../../../src/private/domain/use-cases/message/getEmailMessageRfc822DataUseCase'
import { stringToArrayBuffer } from '../../../src/private/util/buffer'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock(
  '../../../src/private/domain/use-cases/message/getEmailMessageRfc822DataUseCase',
)
const ViMockGetEmailMessageRfc822DataUseCase =
  GetEmailMessageRfc822DataUseCase as MockedClass<
    typeof GetEmailMessageRfc822DataUseCase
  >

describe('SudoEmailClient.getEmailMessageRfc822Data Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockGetEmailMessageRfc822DataUseCase =
    mock<GetEmailMessageRfc822DataUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockGetEmailMessageRfc822DataUseCase)
    ViMockGetEmailMessageRfc822DataUseCase.mockClear()

    ViMockGetEmailMessageRfc822DataUseCase.mockImplementation(function () {
      return instance(mockGetEmailMessageRfc822DataUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockGetEmailMessageRfc822DataUseCase.execute(anything())).thenResolve({
      id: 'emailMessageId',
      rfc822Data: stringToArrayBuffer('data'),
    })
  })
  it('generates use case', async () => {
    await instanceUnderTest.getEmailMessageRfc822Data({
      id: '',
      emailAddressId: 'emailAddressId',
    })
    expect(ViMockGetEmailMessageRfc822DataUseCase).toHaveBeenCalledTimes(1)
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
    when(mockGetEmailMessageRfc822DataUseCase.execute(anything())).thenResolve(
      undefined,
    )
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
