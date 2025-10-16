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
import { EmailMaskService } from '../../../../../../src/private/domain/entities/mask/emailMaskService'
import { ListEmailMasksForOwnerUseCase } from '../../../../../../src/private/domain/use-cases/mask/listEmailMasksForOwnerUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'
import {
  EmailMaskEntityRealAddressType,
  EmailMaskEntityStatus,
} from '../../../../../../src/private/domain/entities/mask/emailMaskEntity'
import { EmailMaskRealAddressType } from '../../../../../../src'

describe('ListEmailMasksForOwnerUseCase Test Suite', () => {
  const mockEmailMaskService = mock<EmailMaskService>()
  let instanceUnderTest: ListEmailMasksForOwnerUseCase

  beforeEach(() => {
    reset(mockEmailMaskService)
    instanceUnderTest = new ListEmailMasksForOwnerUseCase(
      instance(mockEmailMaskService),
    )
    when(mockEmailMaskService.listEmailMasksForOwner(anything())).thenResolve({
      emailMasks: [EntityDataFactory.emailMask],
      nextToken: undefined,
    })
  })

  describe('execute', () => {
    it('lists email masks successfully with no input', async () => {
      const result = await instanceUnderTest.execute()

      expect(result).toStrictEqual({
        emailMasks: [EntityDataFactory.emailMask],
        nextToken: undefined,
      })
      verify(mockEmailMaskService.listEmailMasksForOwner(anything())).once()
      const [inputArgs] = capture(
        mockEmailMaskService.listEmailMasksForOwner,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>(undefined)
    })

    it('lists email masks successfully with limit', async () => {
      const limit = 20
      const result = await instanceUnderTest.execute({
        limit,
      })

      expect(result).toStrictEqual({
        emailMasks: [EntityDataFactory.emailMask],
        nextToken: undefined,
      })
      verify(mockEmailMaskService.listEmailMasksForOwner(anything())).once()
      const [inputArgs] = capture(
        mockEmailMaskService.listEmailMasksForOwner,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        limit,
      })
    })

    it('lists email masks successfully with nextToken', async () => {
      const nextToken = 'testToken'
      const result = await instanceUnderTest.execute({
        nextToken,
      })

      expect(result).toStrictEqual({
        emailMasks: [EntityDataFactory.emailMask],
        nextToken: undefined,
      })
      verify(mockEmailMaskService.listEmailMasksForOwner(anything())).once()
      const [inputArgs] = capture(
        mockEmailMaskService.listEmailMasksForOwner,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        nextToken,
      })
    })

    it('lists email masks successfully with filter', async () => {
      const filter = {
        status: {
          equal: EmailMaskEntityStatus.ENABLED,
        },
      }

      const result = await instanceUnderTest.execute({
        filter,
      })

      expect(result).toStrictEqual({
        emailMasks: [EntityDataFactory.emailMask],
        nextToken: undefined,
      })
      verify(mockEmailMaskService.listEmailMasksForOwner(anything())).once()
      const [inputArgs] = capture(
        mockEmailMaskService.listEmailMasksForOwner,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        filter,
      })
    })

    it('lists email masks successfully with all parameters', async () => {
      const filter = {
        status: {
          equal: EmailMaskEntityStatus.ENABLED,
        },
        realAddressType: {
          notEqual: EmailMaskEntityRealAddressType.EXTERNAL,
        },
      }
      const input = {
        filter,
        limit: 20,
        nextToken: 'testToken',
      }

      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual({
        emailMasks: [EntityDataFactory.emailMask],
        nextToken: undefined,
      })
      verify(mockEmailMaskService.listEmailMasksForOwner(anything())).once()
      const [inputArgs] = capture(
        mockEmailMaskService.listEmailMasksForOwner,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>(input)
    })

    it('returns result with nextToken', async () => {
      when(mockEmailMaskService.listEmailMasksForOwner(anything())).thenResolve(
        {
          emailMasks: [EntityDataFactory.emailMask],
          nextToken: 'newToken',
        },
      )

      const result = await instanceUnderTest.execute({})

      expect(result).toStrictEqual({
        emailMasks: [EntityDataFactory.emailMask],
        nextToken: 'newToken',
      })
    })

    it('returns empty list when no masks found', async () => {
      when(mockEmailMaskService.listEmailMasksForOwner(anything())).thenResolve(
        {
          emailMasks: [],
          nextToken: undefined,
        },
      )

      const result = await instanceUnderTest.execute({})

      expect(result).toStrictEqual({
        emailMasks: [],
        nextToken: undefined,
      })
    })
  })
})
