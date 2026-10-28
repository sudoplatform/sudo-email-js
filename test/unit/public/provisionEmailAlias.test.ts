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
import { ProvisionEmailAliasUseCase } from '../../../src/private/domain/use-cases/alias/provisionEmailAliasUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock(
  '../../../src/private/domain/use-cases/alias/provisionEmailAliasUseCase',
)
const ViMockProvisionEmailAliasUseCase =
  ProvisionEmailAliasUseCase as MockedClass<typeof ProvisionEmailAliasUseCase>

describe('SudoEmailClient.provisionEmailAlias Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockProvisionEmailAliasUseCase = mock<ProvisionEmailAliasUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockProvisionEmailAliasUseCase)
    ViMockProvisionEmailAliasUseCase.mockClear()
    ViMockProvisionEmailAliasUseCase.mockImplementation(function () {
      return instance(mockProvisionEmailAliasUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockProvisionEmailAliasUseCase.execute(anything())).thenResolve(
      EntityDataFactory.emailAlias,
    )
  })

  it('generates use case', async () => {
    await instanceUnderTest.provisionEmailAlias({
      aliasAddress: 'alias@anonyome.com',
      realAddress: 'real@anonyome.com',
      ownershipProofToken: 'token',
    })
    expect(ViMockProvisionEmailAliasUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    const input = {
      aliasAddress: v4() + '@anonyome.com',
      realAddress: v4() + '@anonyome.com',
      ownershipProofToken: v4(),
    }

    await instanceUnderTest.provisionEmailAlias(input)

    verify(mockProvisionEmailAliasUseCase.execute(anything())).once()
    const [args] = capture(mockProvisionEmailAliasUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      metadata: undefined,
      expiresAt: undefined,
    })
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.provisionEmailAlias({
        aliasAddress: 'alias@anonyome.com',
        realAddress: 'real@anonyome.com',
        ownershipProofToken: 'token',
      }),
    ).resolves.toEqual(APIDataFactory.emailAlias)
  })

  it('passes metadata properly', async () => {
    const input = {
      aliasAddress: v4() + '@anonyome.com',
      realAddress: v4() + '@anonyome.com',
      ownershipProofToken: v4(),
      metadata: { test: 'data' },
    }

    await instanceUnderTest.provisionEmailAlias(input)

    verify(mockProvisionEmailAliasUseCase.execute(anything())).once()
    const [args] = capture(mockProvisionEmailAliasUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      expiresAt: undefined,
    })
  })

  it('passes expiresAt properly', async () => {
    const input = {
      aliasAddress: v4() + '@anonyome.com',
      realAddress: v4() + '@anonyome.com',
      ownershipProofToken: v4(),
      expiresAt: DateTime.now().plus({ days: 30 }).toJSDate(),
    }

    await instanceUnderTest.provisionEmailAlias(input)

    verify(mockProvisionEmailAliasUseCase.execute(anything())).once()
    const [args] = capture(mockProvisionEmailAliasUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      metadata: undefined,
    })
  })

  it('passes all optional parameters properly', async () => {
    const input = {
      aliasAddress: v4() + '@anonyome.com',
      realAddress: v4() + '@anonyome.com',
      ownershipProofToken: v4(),
      metadata: { test: 'data' },
      expiresAt: DateTime.now().plus({ days: 30 }).toJSDate(),
    }

    await instanceUnderTest.provisionEmailAlias(input)

    verify(mockProvisionEmailAliasUseCase.execute(anything())).once()
    const [args] = capture(mockProvisionEmailAliasUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>(input)
  })
})
