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
import { DeprovisionEmailMaskUseCase } from '../../../src/private/domain/use-cases/mask/deprovisionEmailMaskUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/mask/deprovisionEmailMaskUseCase',
)
const JestMockDeprovisionEmailMaskUseCase =
  DeprovisionEmailMaskUseCase as jest.MockedClass<
    typeof DeprovisionEmailMaskUseCase
  >

describe('SudoEmailClient.deprovisionEmailMask Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockDeprovisionEmailMaskUseCase = mock<DeprovisionEmailMaskUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockDeprovisionEmailMaskUseCase)
    JestMockDeprovisionEmailMaskUseCase.mockClear()
    JestMockDeprovisionEmailMaskUseCase.mockImplementation(() =>
      instance(mockDeprovisionEmailMaskUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockDeprovisionEmailMaskUseCase.execute(anything())).thenResolve(
      EntityDataFactory.emailMask,
    )
  })

  it('generates use case', async () => {
    await instanceUnderTest.deprovisionEmailMask({
      emailMaskId: 'test-id',
    })
    expect(JestMockDeprovisionEmailMaskUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    const input = {
      emailMaskId: v4(),
    }

    await instanceUnderTest.deprovisionEmailMask(input)

    verify(mockDeprovisionEmailMaskUseCase.execute(anything())).once()
    const [args] = capture(mockDeprovisionEmailMaskUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>(input)
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.deprovisionEmailMask({
        emailMaskId: 'test-id',
      }),
    ).resolves.toEqual(APIDataFactory.emailMask)
  })
})
