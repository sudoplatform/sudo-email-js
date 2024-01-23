/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
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
import { EmailAccountService } from '../../../../../../src/private/domain/entities/account/emailAccountService'
import { CheckEmailAddressAvailabilityUseCase } from '../../../../../../src/private/domain/use-cases/account/checkEmailAddressAvailabilityUseCase'
import { InvalidArgumentError } from '../../../../../../src/public/errors'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('CheckEmailAddressAvailabilityUseCase Test Suite', () => {
  const mockEmailAccountService = mock<EmailAccountService>()

  let instanceUnderTest: CheckEmailAddressAvailabilityUseCase

  beforeEach(() => {
    reset(mockEmailAccountService)
    instanceUnderTest = new CheckEmailAddressAvailabilityUseCase(
      instance(mockEmailAccountService),
    )
  })

  describe('execute', () => {
    it('completes successfully returning expected single available email address', async () => {
      when(mockEmailAccountService.checkAvailability(anything())).thenResolve([
        EntityDataFactory.emailAddress,
      ])
      const result = await instanceUnderTest.execute({
        localParts: ['foo'],
        domains: [EntityDataFactory.emailDomain],
      })
      expect(result).toStrictEqual([EntityDataFactory.emailAddress])
      const [inputArgs] = capture(
        mockEmailAccountService.checkAvailability,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        localParts: ['foo'],
        domains: [EntityDataFactory.emailDomain],
      })
      verify(mockEmailAccountService.checkAvailability(anything())).once()
    })

    it('completes successfully returning expected multiple available email addresses', async () => {
      when(mockEmailAccountService.checkAvailability(anything())).thenResolve([
        EntityDataFactory.emailAddress,
        EntityDataFactory.emailAddress,
      ])
      const result = await instanceUnderTest.execute({
        localParts: ['foo'],
        domains: [EntityDataFactory.emailDomain],
      })
      expect(result).toStrictEqual([
        EntityDataFactory.emailAddress,
        EntityDataFactory.emailAddress,
      ])
      const [inputArgs] = capture(
        mockEmailAccountService.checkAvailability,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        localParts: ['foo'],
        domains: [EntityDataFactory.emailDomain],
      })
      verify(mockEmailAccountService.checkAvailability(anything())).once()
    })

    it('throws an error when local parts supplied is empty', async () => {
      await expect(
        instanceUnderTest.execute({
          localParts: [],
          domains: [EntityDataFactory.emailDomain],
        }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('calls service and returns result when empty domain supplied', async () => {
      when(mockEmailAccountService.checkAvailability(anything())).thenResolve([
        EntityDataFactory.emailAddress,
      ])
      const result = await instanceUnderTest.execute({
        localParts: ['foo'],
        domains: [],
      })
      expect(result).toStrictEqual([EntityDataFactory.emailAddress])
      verify(mockEmailAccountService.checkAvailability(anything())).once()
      const [args] = capture(mockEmailAccountService.checkAvailability).first()
      expect(args).toStrictEqual<typeof args>({
        localParts: ['foo'],
        domains: [],
      })
    })

    it('calls service and returns result when no domain supplied', async () => {
      when(mockEmailAccountService.checkAvailability(anything())).thenResolve([
        EntityDataFactory.emailAddress,
      ])
      const result = await instanceUnderTest.execute({
        localParts: ['foo'],
      })
      expect(result).toStrictEqual([EntityDataFactory.emailAddress])
      verify(mockEmailAccountService.checkAvailability(anything())).once()
      const [args] = capture(mockEmailAccountService.checkAvailability).first()
      expect(args).toStrictEqual<typeof args>({
        localParts: ['foo'],
        domains: undefined,
      })
    })
  })
})
