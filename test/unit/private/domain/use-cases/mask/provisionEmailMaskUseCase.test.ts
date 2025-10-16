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
import { EmailMaskService } from '../../../../../../src/private/domain/entities/mask/emailMaskService'
import { ProvisionEmailMaskUseCase } from '../../../../../../src/private/domain/use-cases/mask/provisionEmailMaskUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { InvalidArgumentError } from '../../../../../../src/public'

describe('ProvisionEmailMaskUseCase Test Suite', () => {
  const mockEmailMaskService = mock<EmailMaskService>()
  let instanceUnderTest: ProvisionEmailMaskUseCase

  beforeEach(() => {
    reset(mockEmailMaskService)
    instanceUnderTest = new ProvisionEmailMaskUseCase(
      instance(mockEmailMaskService),
    )
    when(mockEmailMaskService.provisionEmailMask(anything())).thenResolve(
      EntityDataFactory.emailMask,
    )
  })

  describe('execute', () => {
    it('provisions email mask successfully without optional fields', async () => {
      const input = {
        maskAddress: 'test-mask@anonyome.com',
        realAddress: 'test-real@anonyome.com',
        ownershipProofToken: 'testToken',
      }

      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual(EntityDataFactory.emailMask)
      verify(mockEmailMaskService.provisionEmailMask(anything())).once()
      const [inputArgs] = capture(
        mockEmailMaskService.provisionEmailMask,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        ...input,
        metadata: undefined,
        expiresAt: undefined,
      })
    })

    it('provisions email mask successfully with metadata', async () => {
      const metadata = { test: 'data' }
      const input = {
        maskAddress: 'test-mask@anonyome.com',
        realAddress: 'test-real@anonyome.com',
        ownershipProofToken: 'testToken',
        metadata,
      }

      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual(EntityDataFactory.emailMask)
      verify(mockEmailMaskService.provisionEmailMask(anything())).once()
      const [inputArgs] = capture(
        mockEmailMaskService.provisionEmailMask,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        ...input,
        expiresAt: undefined,
      })
    })

    it('provisions email mask successfully with future expiresAt', async () => {
      const expiresAt = DateTime.now().plus({ days: 30 }).toJSDate()
      const input = {
        maskAddress: 'test-mask@anonyome.com',
        realAddress: 'test-real@anonyome.com',
        ownershipProofToken: 'testToken',
        expiresAt,
      }

      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual(EntityDataFactory.emailMask)
      verify(mockEmailMaskService.provisionEmailMask(anything())).once()
      const [inputArgs] = capture(
        mockEmailMaskService.provisionEmailMask,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        ...input,
        metadata: undefined,
      })
    })

    it('provisions email mask successfully with all fields', async () => {
      const metadata = { test: 'data' }
      const expiresAt = DateTime.now().plus({ days: 30 }).toJSDate()
      const input = {
        maskAddress: 'test-mask@anonyome.com',
        realAddress: 'test-real@anonyome.com',
        ownershipProofToken: 'testToken',
        metadata,
        expiresAt,
      }

      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual(EntityDataFactory.emailMask)
      verify(mockEmailMaskService.provisionEmailMask(anything())).once()
      const [inputArgs] = capture(
        mockEmailMaskService.provisionEmailMask,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>(input)
    })

    it('throws InvalidArgumentError if expiresAt is in the past', async () => {
      const expiresAt = DateTime.now().minus({ days: 1 }).toJSDate()

      await expect(
        instanceUnderTest.execute({
          maskAddress: 'test-mask@anonyome.com',
          realAddress: 'test-real@anonyome.com',
          ownershipProofToken: 'testToken',
          expiresAt,
        }),
      ).rejects.toThrow(InvalidArgumentError)
      verify(mockEmailMaskService.provisionEmailMask(anything())).never()
    })

    it('throws InvalidArgumentError if expiresAt is now', async () => {
      const expiresAt = DateTime.now().toJSDate()

      await expect(
        instanceUnderTest.execute({
          maskAddress: 'test-mask@anonyome.com',
          realAddress: 'test-real@anonyome.com',
          ownershipProofToken: 'testToken',
          expiresAt,
        }),
      ).rejects.toThrow(InvalidArgumentError)
      verify(mockEmailMaskService.provisionEmailMask(anything())).never()
    })
  })
})
