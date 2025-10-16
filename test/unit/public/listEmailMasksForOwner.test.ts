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
import {
  SudoEmailClient,
  EmailMaskStatus,
  ListEmailMasksForOwnerInput,
  EmailMaskRealAddressType,
} from '../../../src'
import { ListEmailMasksForOwnerUseCase } from '../../../src/private/domain/use-cases/mask/listEmailMasksForOwnerUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'
import {
  EmailMaskEntityRealAddressType,
  EmailMaskEntityStatus,
} from '../../../src/private/domain/entities/mask/emailMaskEntity'

jest.mock(
  '../../../src/private/domain/use-cases/mask/listEmailMasksForOwnerUseCase',
)
const JestMockListEmailMasksForOwnerUseCase =
  ListEmailMasksForOwnerUseCase as jest.MockedClass<
    typeof ListEmailMasksForOwnerUseCase
  >

describe('SudoEmailClient.listEmailMasksForOwner Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockListEmailMasksForOwnerUseCase =
    mock<ListEmailMasksForOwnerUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockListEmailMasksForOwnerUseCase)
    JestMockListEmailMasksForOwnerUseCase.mockClear()
    JestMockListEmailMasksForOwnerUseCase.mockImplementation(() =>
      instance(mockListEmailMasksForOwnerUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockListEmailMasksForOwnerUseCase.execute(anything())).thenResolve({
      emailMasks: [EntityDataFactory.emailMask],
      nextToken: undefined,
    })
  })

  it('generates use case', async () => {
    await instanceUnderTest.listEmailMasksForOwner({})
    expect(JestMockListEmailMasksForOwnerUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected with no input', async () => {
    await instanceUnderTest.listEmailMasksForOwner()

    verify(mockListEmailMasksForOwnerUseCase.execute(anything())).once()
    const [args] = capture(mockListEmailMasksForOwnerUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      limit: undefined,
      filter: undefined,
      nextToken: undefined,
    })
  })

  it('returns expected result', async () => {
    await expect(instanceUnderTest.listEmailMasksForOwner({})).resolves.toEqual(
      {
        items: [APIDataFactory.emailMask],
        nextToken: undefined,
      },
    )
  })

  it('passes limit properly', async () => {
    const input = {
      limit: 20,
    }

    await instanceUnderTest.listEmailMasksForOwner(input)

    verify(mockListEmailMasksForOwnerUseCase.execute(anything())).once()
    const [args] = capture(mockListEmailMasksForOwnerUseCase.execute).first()
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

    await instanceUnderTest.listEmailMasksForOwner(input)

    verify(mockListEmailMasksForOwnerUseCase.execute(anything())).once()
    const [args] = capture(mockListEmailMasksForOwnerUseCase.execute).first()
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
          equal: EmailMaskStatus.ENABLED,
        },
      },
    }

    await instanceUnderTest.listEmailMasksForOwner(input)

    verify(mockListEmailMasksForOwnerUseCase.execute(anything())).once()
    const [args] = capture(mockListEmailMasksForOwnerUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      filter: {
        status: {
          equal: EmailMaskEntityStatus.ENABLED,
        },
      },
      limit: undefined,
      nextToken: undefined,
    })
  })

  it('passes all parameters properly', async () => {
    const input: ListEmailMasksForOwnerInput = {
      filter: {
        status: {
          notOneOf: [EmailMaskStatus.DISABLED, EmailMaskStatus.LOCKED],
        },
        realAddressType: {
          notEqual: EmailMaskRealAddressType.EXTERNAL,
        },
      },
      limit: 20,
      nextToken: v4(),
    }

    await instanceUnderTest.listEmailMasksForOwner(input)

    verify(mockListEmailMasksForOwnerUseCase.execute(anything())).once()
    const [args] = capture(mockListEmailMasksForOwnerUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      filter: {
        status: {
          notOneOf: [
            EmailMaskEntityStatus.DISABLED,
            EmailMaskEntityStatus.LOCKED,
          ],
        },
        realAddressType: {
          notEqual: EmailMaskEntityRealAddressType.EXTERNAL,
        },
      },
    })
  })

  it('returns result with nextToken', async () => {
    const nextToken = v4()
    when(mockListEmailMasksForOwnerUseCase.execute(anything())).thenResolve({
      emailMasks: [EntityDataFactory.emailMask],
      nextToken,
    })

    await expect(instanceUnderTest.listEmailMasksForOwner({})).resolves.toEqual(
      {
        items: [APIDataFactory.emailMask],
        nextToken,
      },
    )
  })

  it('returns empty list when no masks found', async () => {
    when(mockListEmailMasksForOwnerUseCase.execute(anything())).thenResolve({
      emailMasks: [],
      nextToken: undefined,
    })

    await expect(instanceUnderTest.listEmailMasksForOwner({})).resolves.toEqual(
      {
        items: [],
        nextToken: undefined,
      },
    )
  })
})
