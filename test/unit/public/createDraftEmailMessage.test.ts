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
import { SaveDraftEmailMessageUseCase } from '../../../src/private/domain/use-cases/draft/saveDraftEmailMessageUseCase'
import { stringToArrayBuffer } from '../../../src/private/util/buffer'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock(
  '../../../src/private/domain/use-cases/draft/saveDraftEmailMessageUseCase',
)
const ViMockSaveDraftEmailMessageUseCase =
  SaveDraftEmailMessageUseCase as MockedClass<
    typeof SaveDraftEmailMessageUseCase
  >

describe('SudoEmailClient.createDraftEmailMessage Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockSaveDraftEmailMessageUseCase = mock<SaveDraftEmailMessageUseCase>()
  const updatedAt = new Date()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockSaveDraftEmailMessageUseCase)

    ViMockSaveDraftEmailMessageUseCase.mockClear()

    ViMockSaveDraftEmailMessageUseCase.mockImplementation(function () {
      return instance(mockSaveDraftEmailMessageUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockSaveDraftEmailMessageUseCase.execute(anything())).thenResolve({
      id: 'draftId',
      emailAddressId: 'emailAddressId',
      updatedAt,
    })
  })

  it('generates use case', async () => {
    await instanceUnderTest.createDraftEmailMessage({
      rfc822Data: stringToArrayBuffer(''),
      senderEmailAddressId: '',
    })
    expect(ViMockSaveDraftEmailMessageUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    const rfc822Data = stringToArrayBuffer(v4())
    const senderEmailAddressId = v4()
    await instanceUnderTest.createDraftEmailMessage({
      rfc822Data,
      senderEmailAddressId,
    })
    verify(mockSaveDraftEmailMessageUseCase.execute(anything())).once()
    const [actualArgs] = capture(
      mockSaveDraftEmailMessageUseCase.execute,
    ).first()
    expect(actualArgs).toEqual<typeof actualArgs>({
      rfc822Data,
      senderEmailAddressId,
    })
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.createDraftEmailMessage({
        rfc822Data: stringToArrayBuffer(''),
        senderEmailAddressId: '',
      }),
    ).resolves.toEqual({
      id: 'draftId',
      emailAddressId: 'emailAddressId',
      updatedAt,
    })
  })

  it('properly passes email mask id if provided', async () => {
    const emailMaskId = v4()
    await instanceUnderTest.createDraftEmailMessage({
      rfc822Data: stringToArrayBuffer(''),
      senderEmailAddressId: '',
      emailMaskId,
    })
    verify(mockSaveDraftEmailMessageUseCase.execute(anything())).once()
    const [actualArgs] = capture(
      mockSaveDraftEmailMessageUseCase.execute,
    ).first()
    expect(actualArgs).toEqual<typeof actualArgs>({
      rfc822Data: stringToArrayBuffer(''),
      senderEmailAddressId: '',
      emailMaskId,
    })
  })
})
