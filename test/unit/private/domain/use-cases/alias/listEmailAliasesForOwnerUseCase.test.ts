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
import { EmailAliasService } from '../../../../../../src/private/domain/entities/alias/emailAliasService'
import { ListEmailAliasesForOwnerUseCase } from '../../../../../../src/private/domain/use-cases/alias/listEmailAliasesForOwnerUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'
import {
  EmailAliasEntityRealAddressType,
  EmailAliasEntityStatus,
} from '../../../../../../src/private/domain/entities/alias/emailAliasEntity'
import { EmailAliasRealAddressType } from '../../../../../../src'

describe('ListEmailAliasesForOwnerUseCase Test Suite', () => {
  const mockEmailAliasService = mock<EmailAliasService>()
  let instanceUnderTest: ListEmailAliasesForOwnerUseCase

  beforeEach(() => {
    reset(mockEmailAliasService)
    instanceUnderTest = new ListEmailAliasesForOwnerUseCase(
      instance(mockEmailAliasService),
    )
    when(
      mockEmailAliasService.listEmailAliasesForOwner(anything()),
    ).thenResolve({
      emailAliases: [EntityDataFactory.emailAlias],
      nextToken: undefined,
    })
  })

  describe('execute', () => {
    it('lists email aliases successfully with no input', async () => {
      const result = await instanceUnderTest.execute()

      expect(result).toStrictEqual({
        emailAliases: [EntityDataFactory.emailAlias],
        nextToken: undefined,
      })
      verify(mockEmailAliasService.listEmailAliasesForOwner(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.listEmailAliasesForOwner,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>(undefined)
    })

    it('lists email aliases successfully with limit', async () => {
      const limit = 20
      const result = await instanceUnderTest.execute({
        limit,
      })

      expect(result).toStrictEqual({
        emailAliases: [EntityDataFactory.emailAlias],
        nextToken: undefined,
      })
      verify(mockEmailAliasService.listEmailAliasesForOwner(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.listEmailAliasesForOwner,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        limit,
      })
    })

    it('lists email aliases successfully with nextToken', async () => {
      const nextToken = 'testToken'
      const result = await instanceUnderTest.execute({
        nextToken,
      })

      expect(result).toStrictEqual({
        emailAliases: [EntityDataFactory.emailAlias],
        nextToken: undefined,
      })
      verify(mockEmailAliasService.listEmailAliasesForOwner(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.listEmailAliasesForOwner,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        nextToken,
      })
    })

    it('lists email aliases successfully with filter', async () => {
      const filter = {
        status: {
          equal: EmailAliasEntityStatus.ENABLED,
        },
      }

      const result = await instanceUnderTest.execute({
        filter,
      })

      expect(result).toStrictEqual({
        emailAliases: [EntityDataFactory.emailAlias],
        nextToken: undefined,
      })
      verify(mockEmailAliasService.listEmailAliasesForOwner(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.listEmailAliasesForOwner,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        filter,
      })
    })

    it('lists email aliases successfully with all parameters', async () => {
      const filter = {
        status: {
          equal: EmailAliasEntityStatus.ENABLED,
        },
        realAddressType: {
          notEqual: EmailAliasEntityRealAddressType.EXTERNAL,
        },
      }
      const input = {
        filter,
        limit: 20,
        nextToken: 'testToken',
      }

      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual({
        emailAliases: [EntityDataFactory.emailAlias],
        nextToken: undefined,
      })
      verify(mockEmailAliasService.listEmailAliasesForOwner(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.listEmailAliasesForOwner,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>(input)
    })

    it('returns result with nextToken', async () => {
      when(
        mockEmailAliasService.listEmailAliasesForOwner(anything()),
      ).thenResolve({
        emailAliases: [EntityDataFactory.emailAlias],
        nextToken: 'newToken',
      })

      const result = await instanceUnderTest.execute({})

      expect(result).toStrictEqual({
        emailAliases: [EntityDataFactory.emailAlias],
        nextToken: 'newToken',
      })
    })

    it('returns empty list when no aliases found', async () => {
      when(
        mockEmailAliasService.listEmailAliasesForOwner(anything()),
      ).thenResolve({
        emailAliases: [],
        nextToken: undefined,
      })

      const result = await instanceUnderTest.execute({})

      expect(result).toStrictEqual({
        emailAliases: [],
        nextToken: undefined,
      })
    })
  })
})
