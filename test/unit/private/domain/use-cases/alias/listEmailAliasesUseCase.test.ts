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
import { EmailAliasService } from '../../../../../../src/private/domain/entities/alias/emailAliasService'
import { ListEmailAliasesUseCase } from '../../../../../../src/private/domain/use-cases/alias/listEmailAliasesUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'
import {
  EmailAliasEntityRealAddressType,
  EmailAliasEntityStatus,
} from '../../../../../../src/private/domain/entities/alias/emailAliasEntity'
import { EmailAliasRealAddressType } from '../../../../../../src'

describe('ListEmailAliasesUseCase Test Suite', () => {
  const mockEmailAliasService = mock<EmailAliasService>()
  let instanceUnderTest: ListEmailAliasesUseCase

  beforeEach(() => {
    reset(mockEmailAliasService)
    instanceUnderTest = new ListEmailAliasesUseCase(
      instance(mockEmailAliasService),
    )
    when(mockEmailAliasService.listEmailAliases(anything())).thenResolve({
      emailAliases: [EntityDataFactory.emailAliasListItem],
      nextToken: undefined,
    })
  })

  describe('execute', () => {
    it('lists email aliases successfully with no input', async () => {
      const result = await instanceUnderTest.execute()

      expect(result).toStrictEqual({
        emailAliases: [EntityDataFactory.emailAliasListItem],
        nextToken: undefined,
      })
      verify(mockEmailAliasService.listEmailAliases(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.listEmailAliases,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>(undefined)
    })

    it('lists email aliases successfully with sudoId', async () => {
      const sudoId = 'mockSudoId'
      const result = await instanceUnderTest.execute({
        sudoId,
      })

      expect(result).toStrictEqual({
        emailAliases: [EntityDataFactory.emailAliasListItem],
        nextToken: undefined,
      })
      verify(mockEmailAliasService.listEmailAliases(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.listEmailAliases,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        sudoId,
      })
    })

    it('lists email aliases successfully with limit', async () => {
      const limit = 20
      const result = await instanceUnderTest.execute({
        limit,
      })

      expect(result).toStrictEqual({
        emailAliases: [EntityDataFactory.emailAliasListItem],
        nextToken: undefined,
      })
      verify(mockEmailAliasService.listEmailAliases(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.listEmailAliases,
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
        emailAliases: [EntityDataFactory.emailAliasListItem],
        nextToken: undefined,
      })
      verify(mockEmailAliasService.listEmailAliases(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.listEmailAliases,
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
        emailAliases: [EntityDataFactory.emailAliasListItem],
        nextToken: undefined,
      })
      verify(mockEmailAliasService.listEmailAliases(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.listEmailAliases,
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
        sudoId: 'mockSudoId',
        filter,
        limit: 20,
        nextToken: 'testToken',
      }

      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual({
        emailAliases: [EntityDataFactory.emailAliasListItem],
        nextToken: undefined,
      })
      verify(mockEmailAliasService.listEmailAliases(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.listEmailAliases,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>(input)
    })

    it('returns result with nextToken', async () => {
      when(mockEmailAliasService.listEmailAliases(anything())).thenResolve({
        emailAliases: [EntityDataFactory.emailAliasListItem],
        nextToken: 'newToken',
      })

      const result = await instanceUnderTest.execute({})

      expect(result).toStrictEqual({
        emailAliases: [EntityDataFactory.emailAliasListItem],
        nextToken: 'newToken',
      })
    })

    it('returns empty list when no aliases found', async () => {
      when(mockEmailAliasService.listEmailAliases(anything())).thenResolve({
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
