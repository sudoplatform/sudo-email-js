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
import { UpdateEmailAliasUseCase } from '../../../src/private/domain/use-cases/alias/updateEmailAliasUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock('../../../src/private/domain/use-cases/alias/updateEmailAliasUseCase')
const ViMockUpdateEmailAliasUseCase = UpdateEmailAliasUseCase as MockedClass<
  typeof UpdateEmailAliasUseCase
>

describe('SudoEmailClient.updateEmailAlias Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockUpdateEmailAliasUseCase = mock<UpdateEmailAliasUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockUpdateEmailAliasUseCase)
    ViMockUpdateEmailAliasUseCase.mockClear()
    ViMockUpdateEmailAliasUseCase.mockImplementation(function () {
      return instance(mockUpdateEmailAliasUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockUpdateEmailAliasUseCase.execute(anything())).thenResolve(
      EntityDataFactory.emailAlias,
    )
  })

  it('generates use case', async () => {
    await instanceUnderTest.updateEmailAlias({
      emailAliasId: 'test-id',
    })
    expect(ViMockUpdateEmailAliasUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    const input = {
      emailAliasId: v4(),
    }

    await instanceUnderTest.updateEmailAlias(input)

    verify(mockUpdateEmailAliasUseCase.execute(anything())).once()
    const [args] = capture(mockUpdateEmailAliasUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      metadata: undefined,
      expiresAt: undefined,
      realAddress: undefined,
    })
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.updateEmailAlias({
        emailAliasId: 'test-id',
      }),
    ).resolves.toEqual(APIDataFactory.emailAlias)
  })

  it('passes metadata properly', async () => {
    const input = {
      emailAliasId: v4(),
      metadata: { test: 'updated data' },
    }

    await instanceUnderTest.updateEmailAlias(input)

    verify(mockUpdateEmailAliasUseCase.execute(anything())).once()
    const [args] = capture(mockUpdateEmailAliasUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      expiresAt: undefined,
      realAddress: undefined,
    })
  })

  it('passes null metadata properly', async () => {
    const input = {
      emailAliasId: v4(),
      metadata: null,
    }

    await instanceUnderTest.updateEmailAlias(input)

    verify(mockUpdateEmailAliasUseCase.execute(anything())).once()
    const [args] = capture(mockUpdateEmailAliasUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      expiresAt: undefined,
      realAddress: undefined,
    })
  })

  it('passes expiresAt properly', async () => {
    const input = {
      emailAliasId: v4(),
      expiresAt: DateTime.now().plus({ days: 30 }).toJSDate(),
    }

    await instanceUnderTest.updateEmailAlias(input)

    verify(mockUpdateEmailAliasUseCase.execute(anything())).once()
    const [args] = capture(mockUpdateEmailAliasUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      metadata: undefined,
      realAddress: undefined,
    })
  })

  it('passes null expiresAt properly', async () => {
    const input = {
      emailAliasId: v4(),
      expiresAt: null,
    }

    await instanceUnderTest.updateEmailAlias(input)

    verify(mockUpdateEmailAliasUseCase.execute(anything())).once()
    const [args] = capture(mockUpdateEmailAliasUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      metadata: undefined,
      realAddress: undefined,
    })
  })

  it('passes realAddress parameter properly', async () => {
    const input = {
      emailAliasId: v4(),
      realAddress: 'new@example.com',
    }

    await instanceUnderTest.updateEmailAlias(input)

    verify(mockUpdateEmailAliasUseCase.execute(anything())).once()
    const [args] = capture(mockUpdateEmailAliasUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      expiresAt: undefined,
      metadata: undefined,
    })
  })

  it('passes all optional parameters properly', async () => {
    const input = {
      emailAliasId: v4(),
      metadata: { test: 'updated data' },
      expiresAt: DateTime.now().plus({ days: 30 }).toJSDate(),
      realAddress: 'new@example.com',
    }

    await instanceUnderTest.updateEmailAlias(input)

    verify(mockUpdateEmailAliasUseCase.execute(anything())).once()
    const [args] = capture(mockUpdateEmailAliasUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>(input)
  })

  it('passes all optional parameters as null properly', async () => {
    const input = {
      emailAliasId: v4(),
      metadata: null,
      expiresAt: null,
      realAddress: undefined,
    }

    await instanceUnderTest.updateEmailAlias(input)

    verify(mockUpdateEmailAliasUseCase.execute(anything())).once()
    const [args] = capture(mockUpdateEmailAliasUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>(input)
  })
})
