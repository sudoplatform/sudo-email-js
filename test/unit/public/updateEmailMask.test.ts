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
import { DateTime } from 'luxon'
import { v4 } from 'uuid'
import { SudoEmailClient } from '../../../src'
import { UpdateEmailMaskUseCase } from '../../../src/private/domain/use-cases/mask/updateEmailMaskUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock('../../../src/private/domain/use-cases/mask/updateEmailMaskUseCase')
const ViMockUpdateEmailMaskUseCase = UpdateEmailMaskUseCase as MockedClass<
  typeof UpdateEmailMaskUseCase
>

describe('SudoEmailClient.updateEmailMask Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockUpdateEmailMaskUseCase = mock<UpdateEmailMaskUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockUpdateEmailMaskUseCase)
    ViMockUpdateEmailMaskUseCase.mockClear()
    ViMockUpdateEmailMaskUseCase.mockImplementation(function () {
      return instance(mockUpdateEmailMaskUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockUpdateEmailMaskUseCase.execute(anything())).thenResolve(
      EntityDataFactory.emailMask,
    )
  })

  it('generates use case', async () => {
    await instanceUnderTest.updateEmailMask({
      emailMaskId: 'test-id',
    })
    expect(ViMockUpdateEmailMaskUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    const input = {
      emailMaskId: v4(),
    }

    await instanceUnderTest.updateEmailMask(input)

    verify(mockUpdateEmailMaskUseCase.execute(anything())).once()
    const [args] = capture(mockUpdateEmailMaskUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      metadata: undefined,
      expiresAt: undefined,
    })
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.updateEmailMask({
        emailMaskId: 'test-id',
      }),
    ).resolves.toEqual(APIDataFactory.emailMask)
  })

  it('passes metadata properly', async () => {
    const input = {
      emailMaskId: v4(),
      metadata: { test: 'updated data' },
    }

    await instanceUnderTest.updateEmailMask(input)

    verify(mockUpdateEmailMaskUseCase.execute(anything())).once()
    const [args] = capture(mockUpdateEmailMaskUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      expiresAt: undefined,
    })
  })

  it('passes null metadata properly', async () => {
    const input = {
      emailMaskId: v4(),
      metadata: null,
    }

    await instanceUnderTest.updateEmailMask(input)

    verify(mockUpdateEmailMaskUseCase.execute(anything())).once()
    const [args] = capture(mockUpdateEmailMaskUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      expiresAt: undefined,
    })
  })

  it('passes expiresAt properly', async () => {
    const input = {
      emailMaskId: v4(),
      expiresAt: DateTime.now().plus({ days: 30 }).toJSDate(),
    }

    await instanceUnderTest.updateEmailMask(input)

    verify(mockUpdateEmailMaskUseCase.execute(anything())).once()
    const [args] = capture(mockUpdateEmailMaskUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      metadata: undefined,
    })
  })

  it('passes null expiresAt properly', async () => {
    const input = {
      emailMaskId: v4(),
      expiresAt: null,
    }

    await instanceUnderTest.updateEmailMask(input)

    verify(mockUpdateEmailMaskUseCase.execute(anything())).once()
    const [args] = capture(mockUpdateEmailMaskUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      metadata: undefined,
    })
  })

  it('passes all optional parameters properly', async () => {
    const input = {
      emailMaskId: v4(),
      metadata: { test: 'updated data' },
      expiresAt: DateTime.now().plus({ days: 30 }).toJSDate(),
    }

    await instanceUnderTest.updateEmailMask(input)

    verify(mockUpdateEmailMaskUseCase.execute(anything())).once()
    const [args] = capture(mockUpdateEmailMaskUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>(input)
  })

  it('passes all optional parameters as null properly', async () => {
    const input = {
      emailMaskId: v4(),
      metadata: null,
      expiresAt: null,
    }

    await instanceUnderTest.updateEmailMask(input)

    verify(mockUpdateEmailMaskUseCase.execute(anything())).once()
    const [args] = capture(mockUpdateEmailMaskUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>(input)
  })
})
