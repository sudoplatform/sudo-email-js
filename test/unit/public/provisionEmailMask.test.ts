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
import { DateTime } from 'luxon'
import { v4 } from 'uuid'
import { SudoEmailClient } from '../../../src'
import { ProvisionEmailMaskUseCase } from '../../../src/private/domain/use-cases/mask/provisionEmailMaskUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/mask/provisionEmailMaskUseCase',
)
const JestMockProvisionEmailMaskUseCase =
  ProvisionEmailMaskUseCase as jest.MockedClass<
    typeof ProvisionEmailMaskUseCase
  >

describe('SudoEmailClient.provisionEmailMask Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockProvisionEmailMaskUseCase = mock<ProvisionEmailMaskUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockProvisionEmailMaskUseCase)
    JestMockProvisionEmailMaskUseCase.mockClear()
    JestMockProvisionEmailMaskUseCase.mockImplementation(() =>
      instance(mockProvisionEmailMaskUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockProvisionEmailMaskUseCase.execute(anything())).thenResolve(
      EntityDataFactory.emailMask,
    )
  })

  it('generates use case', async () => {
    await instanceUnderTest.provisionEmailMask({
      maskAddress: 'mask@anonyome.com',
      realAddress: 'real@anonyome.com',
      ownershipProofToken: 'token',
    })
    expect(JestMockProvisionEmailMaskUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    const input = {
      maskAddress: v4() + '@anonyome.com',
      realAddress: v4() + '@anonyome.com',
      ownershipProofToken: v4(),
    }

    await instanceUnderTest.provisionEmailMask(input)

    verify(mockProvisionEmailMaskUseCase.execute(anything())).once()
    const [args] = capture(mockProvisionEmailMaskUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      metadata: undefined,
      expiresAt: undefined,
    })
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.provisionEmailMask({
        maskAddress: 'mask@anonyome.com',
        realAddress: 'real@anonyome.com',
        ownershipProofToken: 'token',
      }),
    ).resolves.toEqual(APIDataFactory.emailMask)
  })

  it('passes metadata properly', async () => {
    const input = {
      maskAddress: v4() + '@anonyome.com',
      realAddress: v4() + '@anonyome.com',
      ownershipProofToken: v4(),
      metadata: { test: 'data' },
    }

    await instanceUnderTest.provisionEmailMask(input)

    verify(mockProvisionEmailMaskUseCase.execute(anything())).once()
    const [args] = capture(mockProvisionEmailMaskUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      expiresAt: undefined,
    })
  })

  it('passes expiresAt properly', async () => {
    const input = {
      maskAddress: v4() + '@anonyome.com',
      realAddress: v4() + '@anonyome.com',
      ownershipProofToken: v4(),
      expiresAt: DateTime.now().plus({ days: 30 }).toJSDate(),
    }

    await instanceUnderTest.provisionEmailMask(input)

    verify(mockProvisionEmailMaskUseCase.execute(anything())).once()
    const [args] = capture(mockProvisionEmailMaskUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>({
      ...input,
      metadata: undefined,
    })
  })

  it('passes all optional parameters properly', async () => {
    const input = {
      maskAddress: v4() + '@anonyome.com',
      realAddress: v4() + '@anonyome.com',
      ownershipProofToken: v4(),
      metadata: { test: 'data' },
      expiresAt: DateTime.now().plus({ days: 30 }).toJSDate(),
    }

    await instanceUnderTest.provisionEmailMask(input)

    verify(mockProvisionEmailMaskUseCase.execute(anything())).once()
    const [args] = capture(mockProvisionEmailMaskUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>(input)
  })
})
