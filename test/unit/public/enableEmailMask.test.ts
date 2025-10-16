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
import { EnableEmailMaskUseCase } from '../../../src/private/domain/use-cases/mask/enableEmailMaskUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock('../../../src/private/domain/use-cases/mask/enableEmailMaskUseCase')
const JestMockEnableEmailMaskUseCase =
  EnableEmailMaskUseCase as jest.MockedClass<typeof EnableEmailMaskUseCase>

describe('SudoEmailClient.enableEmailMask Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockEnableEmailMaskUseCase = mock<EnableEmailMaskUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockEnableEmailMaskUseCase)
    JestMockEnableEmailMaskUseCase.mockClear()
    JestMockEnableEmailMaskUseCase.mockImplementation(() =>
      instance(mockEnableEmailMaskUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockEnableEmailMaskUseCase.execute(anything())).thenResolve(
      EntityDataFactory.emailMask,
    )
  })

  it('generates use case', async () => {
    await instanceUnderTest.enableEmailMask({
      emailMaskId: 'test-id',
    })
    expect(JestMockEnableEmailMaskUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    const input = {
      emailMaskId: v4(),
    }

    await instanceUnderTest.enableEmailMask(input)

    verify(mockEnableEmailMaskUseCase.execute(anything())).once()
    const [args] = capture(mockEnableEmailMaskUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>(input)
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.enableEmailMask({
        emailMaskId: 'test-id',
      }),
    ).resolves.toEqual(APIDataFactory.emailMask)
  })
})
