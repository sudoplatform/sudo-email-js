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
import { DraftEmailMessage, SudoEmailClient } from '../../../src'
import { GetDraftEmailMessageUseCase } from '../../../src/private/domain/use-cases/draft/getDraftEmailMessageUseCase'
import { stringToArrayBuffer } from '../../../src/private/util/buffer'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock(
  '../../../src/private/domain/use-cases/draft/getDraftEmailMessageUseCase',
)
const ViMockGetDraftEmailMessageUseCase =
  GetDraftEmailMessageUseCase as MockedClass<typeof GetDraftEmailMessageUseCase>

describe('SudoEmailClient.getDraftEmailMessage Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockGetDraftEmailMessageUseCase = mock<GetDraftEmailMessageUseCase>()
  const updatedAt = new Date()
  const rfc822Data = stringToArrayBuffer('data')

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockGetDraftEmailMessageUseCase)

    ViMockGetDraftEmailMessageUseCase.mockClear()

    ViMockGetDraftEmailMessageUseCase.mockImplementation(function () {
      return instance(mockGetDraftEmailMessageUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

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
    expect(ViMockGetDraftEmailMessageUseCase).toHaveBeenCalledTimes(1)
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

  it('properly passes email mask id if provided', async () => {
    const id = v4()
    const emailAddressId = v4()
    const emailMaskId = v4()
    await instanceUnderTest.getDraftEmailMessage({
      id,
      emailAddressId,
      emailMaskId,
    })
    verify(mockGetDraftEmailMessageUseCase.execute(anything())).once()
    const [actualArgs] = capture(
      mockGetDraftEmailMessageUseCase.execute,
    ).first()
    expect(actualArgs).toEqual<typeof actualArgs>({
      id,
      emailAddressId,
      emailMaskId,
    })
  })
})
