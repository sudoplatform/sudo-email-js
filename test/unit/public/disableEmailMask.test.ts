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
import { DisableEmailMaskUseCase } from '../../../src/private/domain/use-cases/mask/disableEmailMaskUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock('../../../src/private/domain/use-cases/mask/disableEmailMaskUseCase')
const JestMockDisableEmailMaskUseCase =
  DisableEmailMaskUseCase as jest.MockedClass<typeof DisableEmailMaskUseCase>

describe('SudoEmailClient.disableEmailMask Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockDisableEmailMaskUseCase = mock<DisableEmailMaskUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockDisableEmailMaskUseCase)
    JestMockDisableEmailMaskUseCase.mockClear()
    JestMockDisableEmailMaskUseCase.mockImplementation(() =>
      instance(mockDisableEmailMaskUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockDisableEmailMaskUseCase.execute(anything())).thenResolve(
      EntityDataFactory.emailMask,
    )
  })

  it('generates use case', async () => {
    await instanceUnderTest.disableEmailMask({
      emailMaskId: 'test-id',
    })
    expect(JestMockDisableEmailMaskUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    const input = {
      emailMaskId: v4(),
    }

    await instanceUnderTest.disableEmailMask(input)

    verify(mockDisableEmailMaskUseCase.execute(anything())).once()
    const [args] = capture(mockDisableEmailMaskUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>(input)
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.disableEmailMask({
        emailMaskId: 'test-id',
      }),
    ).resolves.toEqual(APIDataFactory.emailMask)
  })
})
