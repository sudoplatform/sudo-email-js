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
import { UpdateDraftEmailMessageUseCase } from '../../../src/private/domain/use-cases/draft/updateDraftEmailMessageUseCase'
import { stringToArrayBuffer } from '../../../src/private/util/buffer'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock(
  '../../../src/private/domain/use-cases/draft/updateDraftEmailMessageUseCase',
)
const ViMockUpdateDraftEmailMessageUseCase =
  UpdateDraftEmailMessageUseCase as MockedClass<
    typeof UpdateDraftEmailMessageUseCase
  >

describe('SudoEmailClient.updateDraftEmailMessage Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockUpdateDraftEmailMessageUseCase =
    mock<UpdateDraftEmailMessageUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockUpdateDraftEmailMessageUseCase)

    ViMockUpdateDraftEmailMessageUseCase.mockClear()

    ViMockUpdateDraftEmailMessageUseCase.mockImplementation(function () {
      return instance(mockUpdateDraftEmailMessageUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockUpdateDraftEmailMessageUseCase.execute(anything())).thenResolve({
      id: 'draftId',
      emailAddressId: 'emailAddressId',
      updatedAt,
    })
  })
  const updatedAt = new Date()

  it('generates use case', async () => {
    await instanceUnderTest.updateDraftEmailMessage({
      id: '',
      rfc822Data: stringToArrayBuffer(''),
      senderEmailAddressId: '',
    })
    expect(ViMockUpdateDraftEmailMessageUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    const id = v4()
    const rfc822Data = stringToArrayBuffer(v4())
    const senderEmailAddressId = v4()
    await instanceUnderTest.updateDraftEmailMessage({
      id,
      rfc822Data,
      senderEmailAddressId,
    })
    verify(mockUpdateDraftEmailMessageUseCase.execute(anything())).once()
    const [actualArgs] = capture(
      mockUpdateDraftEmailMessageUseCase.execute,
    ).first()
    expect(actualArgs).toEqual<typeof actualArgs>({
      id,
      rfc822Data,
      senderEmailAddressId,
    })
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.updateDraftEmailMessage({
        id: '',
        rfc822Data: stringToArrayBuffer(''),
        senderEmailAddressId: '',
      }),
    ).resolves.toEqual({
      id: 'draftId',
      emailAddressId: 'emailAddressId',
      updatedAt,
    })
  })

  it('properly passed email mask id if provided', async () => {
    const id = v4()
    const rfc822Data = stringToArrayBuffer(v4())
    const senderEmailAddressId = v4()
    const emailMaskId = v4()
    await instanceUnderTest.updateDraftEmailMessage({
      id,
      rfc822Data,
      senderEmailAddressId,
      emailMaskId,
    })
    verify(mockUpdateDraftEmailMessageUseCase.execute(anything())).once()
    const [actualArgs] = capture(
      mockUpdateDraftEmailMessageUseCase.execute,
    ).first()
    expect(actualArgs).toEqual<typeof actualArgs>({
      id,
      rfc822Data,
      senderEmailAddressId,
      emailMaskId,
    })
  })
})
