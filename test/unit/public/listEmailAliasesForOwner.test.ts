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
import {
  SudoEmailClient,
  EmailAliasStatus,
  ListEmailAliasesForOwnerInput,
  EmailAliasRealAddressType,
} from '../../../src'
import { ListEmailAliasesForOwnerUseCase } from '../../../src/private/domain/use-cases/alias/listEmailAliasesForOwnerUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'
import {
  EmailAliasEntityRealAddressType,
  EmailAliasEntityStatus,
} from '../../../src/private/domain/entities/alias/emailAliasEntity'

vi.mock(
  '../../../src/private/domain/use-cases/alias/listEmailAliasesForOwnerUseCase',
)
const ViMockListEmailAliasesForOwnerUseCase =
  ListEmailAliasesForOwnerUseCase as MockedClass<
    typeof ListEmailAliasesForOwnerUseCase
  >

describe('SudoEmailClient.listEmailAliasesForOwner Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockListEmailAliasesForOwnerUseCase =
    mock<ListEmailAliasesForOwnerUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockListEmailAliasesForOwnerUseCase)
    ViMockListEmailAliasesForOwnerUseCase.mockClear()
    ViMockListEmailAliasesForOwnerUseCase.mockImplementation(function () {
      return instance(mockListEmailAliasesForOwnerUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockListEmailAliasesForOwnerUseCase.execute(anything())).thenResolve({
      emailAliases: [EntityDataFactory.emailAlias],
      nextToken: undefined,
    })
  })

  it('generates use case', async () => {
    await instanceUnderTest.listEmailAliasesForOwner({})
    expect(ViMockListEmailAliasesForOwnerUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected with no input', async () => {
    await instanceUnderTest.listEmailAliasesForOwner()

    verify(mockListEmailAliasesForOwnerUseCase.execute(anything())).once()
    const [args] = capture(mockListEmailAliasesForOwnerUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      limit: undefined,
      filter: undefined,
      nextToken: undefined,
    })
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.listEmailAliasesForOwner({}),
    ).resolves.toEqual({
      items: [APIDataFactory.emailAlias],
      nextToken: undefined,
    })
  })

  it('passes limit properly', async () => {
    const input = {
      limit: 20,
    }

    await instanceUnderTest.listEmailAliasesForOwner(input)

    verify(mockListEmailAliasesForOwnerUseCase.execute(anything())).once()
    const [args] = capture(mockListEmailAliasesForOwnerUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      filter: undefined,
      nextToken: undefined,
    })
  })

  it('passes nextToken properly', async () => {
    const input = {
      nextToken: v4(),
    }

    await instanceUnderTest.listEmailAliasesForOwner(input)

    verify(mockListEmailAliasesForOwnerUseCase.execute(anything())).once()
    const [args] = capture(mockListEmailAliasesForOwnerUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      limit: undefined,
      filter: undefined,
    })
  })

  it('passes filter properly', async () => {
    const input = {
      filter: {
        status: {
          equal: EmailAliasStatus.ENABLED,
        },
      },
    }

    await instanceUnderTest.listEmailAliasesForOwner(input)

    verify(mockListEmailAliasesForOwnerUseCase.execute(anything())).once()
    const [args] = capture(mockListEmailAliasesForOwnerUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      filter: {
        status: {
          equal: EmailAliasEntityStatus.ENABLED,
        },
      },
      limit: undefined,
      nextToken: undefined,
    })
  })

  it('passes all parameters properly', async () => {
    const input: ListEmailAliasesForOwnerInput = {
      filter: {
        status: {
          notOneOf: [EmailAliasStatus.DISABLED, EmailAliasStatus.LOCKED],
        },
        realAddressType: {
          notEqual: EmailAliasRealAddressType.EXTERNAL,
        },
      },
      limit: 20,
      nextToken: v4(),
    }

    await instanceUnderTest.listEmailAliasesForOwner(input)

    verify(mockListEmailAliasesForOwnerUseCase.execute(anything())).once()
    const [args] = capture(mockListEmailAliasesForOwnerUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      filter: {
        status: {
          notOneOf: [
            EmailAliasEntityStatus.DISABLED,
            EmailAliasEntityStatus.LOCKED,
          ],
        },
        realAddressType: {
          notEqual: EmailAliasEntityRealAddressType.EXTERNAL,
        },
      },
    })
  })

  it('returns result with nextToken', async () => {
    const nextToken = v4()
    when(mockListEmailAliasesForOwnerUseCase.execute(anything())).thenResolve({
      emailAliases: [EntityDataFactory.emailAlias],
      nextToken,
    })

    await expect(
      instanceUnderTest.listEmailAliasesForOwner({}),
    ).resolves.toEqual({
      items: [APIDataFactory.emailAlias],
      nextToken,
    })
  })

  it('returns empty list when no aliases found', async () => {
    when(mockListEmailAliasesForOwnerUseCase.execute(anything())).thenResolve({
      emailAliases: [],
      nextToken: undefined,
    })

    await expect(
      instanceUnderTest.listEmailAliasesForOwner({}),
    ).resolves.toEqual({
      items: [],
      nextToken: undefined,
    })
  })
})
