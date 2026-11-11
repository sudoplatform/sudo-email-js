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
  ListEmailAliasesInput,
  EmailAliasRealAddressType,
} from '../../../src'
import { ListEmailAliasesUseCase } from '../../../src/private/domain/use-cases/alias/listEmailAliasesUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'
import {
  EmailAliasEntityRealAddressType,
  EmailAliasEntityStatus,
} from '../../../src/private/domain/entities/alias/emailAliasEntity'

vi.mock('../../../src/private/domain/use-cases/alias/listEmailAliasesUseCase')
const ViMockListEmailAliasesUseCase = ListEmailAliasesUseCase as MockedClass<
  typeof ListEmailAliasesUseCase
>

describe('SudoEmailClient.listEmailAliases Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockListEmailAliasesUseCase = mock<ListEmailAliasesUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockListEmailAliasesUseCase)
    ViMockListEmailAliasesUseCase.mockClear()
    ViMockListEmailAliasesUseCase.mockImplementation(function () {
      return instance(mockListEmailAliasesUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockListEmailAliasesUseCase.execute(anything())).thenResolve({
      emailAliases: [EntityDataFactory.emailAliasListItem],
      nextToken: undefined,
    })
  })

  it('generates use case', async () => {
    await instanceUnderTest.listEmailAliases({})
    expect(ViMockListEmailAliasesUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected with no input', async () => {
    await instanceUnderTest.listEmailAliases()

    verify(mockListEmailAliasesUseCase.execute(anything())).once()
    const [args] = capture(mockListEmailAliasesUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      sudoId: undefined,
      limit: undefined,
      filter: undefined,
      nextToken: undefined,
    })
  })

  it('returns expected result', async () => {
    await expect(instanceUnderTest.listEmailAliases({})).resolves.toEqual({
      items: [APIDataFactory.emailAliasListItem],
      nextToken: undefined,
    })
  })

  it('passes sudoId properly', async () => {
    const input = {
      sudoId: 'mockSudoId',
    }

    await instanceUnderTest.listEmailAliases(input)

    verify(mockListEmailAliasesUseCase.execute(anything())).once()
    const [args] = capture(mockListEmailAliasesUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      limit: undefined,
      filter: undefined,
      nextToken: undefined,
    })
  })

  it('passes limit properly', async () => {
    const input = {
      limit: 20,
    }

    await instanceUnderTest.listEmailAliases(input)

    verify(mockListEmailAliasesUseCase.execute(anything())).once()
    const [args] = capture(mockListEmailAliasesUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      sudoId: undefined,
      filter: undefined,
      nextToken: undefined,
    })
  })

  it('passes nextToken properly', async () => {
    const input = {
      nextToken: v4(),
    }

    await instanceUnderTest.listEmailAliases(input)

    verify(mockListEmailAliasesUseCase.execute(anything())).once()
    const [args] = capture(mockListEmailAliasesUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      sudoId: undefined,
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

    await instanceUnderTest.listEmailAliases(input)

    verify(mockListEmailAliasesUseCase.execute(anything())).once()
    const [args] = capture(mockListEmailAliasesUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      sudoId: undefined,
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
    const input: ListEmailAliasesInput = {
      sudoId: 'mockSudoId',
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

    await instanceUnderTest.listEmailAliases(input)

    verify(mockListEmailAliasesUseCase.execute(anything())).once()
    const [args] = capture(mockListEmailAliasesUseCase.execute).first()
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
    when(mockListEmailAliasesUseCase.execute(anything())).thenResolve({
      emailAliases: [EntityDataFactory.emailAliasListItem],
      nextToken,
    })

    await expect(instanceUnderTest.listEmailAliases({})).resolves.toEqual({
      items: [APIDataFactory.emailAliasListItem],
      nextToken,
    })
  })

  it('returns empty list when no aliases found', async () => {
    when(mockListEmailAliasesUseCase.execute(anything())).thenResolve({
      emailAliases: [],
      nextToken: undefined,
    })

    await expect(instanceUnderTest.listEmailAliases({})).resolves.toEqual({
      items: [],
      nextToken: undefined,
    })
  })
})
