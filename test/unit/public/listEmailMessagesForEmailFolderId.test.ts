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
import { EmailMessageDateRange, SortOrder, SudoEmailClient } from '../../../src'
import { ListEmailMessagesForEmailFolderIdUseCase } from '../../../src/private/domain/use-cases/message/listEmailMessagesForEmailFolderIdUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/message/listEmailMessagesForEmailFolderIdUseCase',
)
const JestMockListEmailMessagesForEmailFolderIdUseCase =
  ListEmailMessagesForEmailFolderIdUseCase as jest.MockedClass<
    typeof ListEmailMessagesForEmailFolderIdUseCase
  >

describe('SudoEmailClient.listEmailMessagesForEmailFolderId Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockListEmailMessagesForEmailFolderIdUseCase =
    mock<ListEmailMessagesForEmailFolderIdUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockListEmailMessagesForEmailFolderIdUseCase)
    JestMockListEmailMessagesForEmailFolderIdUseCase.mockClear()

    JestMockListEmailMessagesForEmailFolderIdUseCase.mockImplementation(() =>
      instance(mockListEmailMessagesForEmailFolderIdUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(
      mockListEmailMessagesForEmailFolderIdUseCase.execute(anything()),
    ).thenResolve({
      emailMessages: [EntityDataFactory.emailMessage],
      nextToken: 'nextToken',
    })
  })
  it('generates use case', async () => {
    const folderId = v4()
    await instanceUnderTest.listEmailMessagesForEmailFolderId({
      folderId,
      limit: 0,
      sortOrder: SortOrder.Desc,
      nextToken: '',
    })
    expect(
      JestMockListEmailMessagesForEmailFolderIdUseCase,
    ).toHaveBeenCalledTimes(1)
  })
  it('calls use case as expected', async () => {
    const folderId = v4()
    const dateRange: EmailMessageDateRange = {
      sortDate: {
        startDate: new Date(1.0),
        endDate: new Date(2.0),
      },
    }
    const limit = 100
    const sortOrder = SortOrder.Desc
    const nextToken = v4()
    await instanceUnderTest.listEmailMessagesForEmailFolderId({
      folderId,
      dateRange,
      limit,
      sortOrder,
      nextToken,
    })
    verify(
      mockListEmailMessagesForEmailFolderIdUseCase.execute(anything()),
    ).once()
    const [actualArgs] = capture(
      mockListEmailMessagesForEmailFolderIdUseCase.execute,
    ).first()
    expect(actualArgs).toEqual<typeof actualArgs>({
      folderId,
      dateRange,
      limit,
      sortOrder,
      nextToken,
    })
  })
  it('returns empty list if use case result is empty list', async () => {
    const folderId = v4()
    when(
      mockListEmailMessagesForEmailFolderIdUseCase.execute(anything()),
    ).thenResolve({
      emailMessages: [],
      nextToken: undefined,
    })
    await expect(
      instanceUnderTest.listEmailMessagesForEmailFolderId({
        folderId,
      }),
    ).resolves.toEqual({ status: 'Success', items: [], nextToken: undefined })
  })
  it('returns expected result', async () => {
    const folderId = v4()
    await expect(
      instanceUnderTest.listEmailMessagesForEmailFolderId({
        folderId,
      }),
    ).resolves.toEqual({
      items: [APIDataFactory.emailMessage],
      nextToken: 'nextToken',
      status: 'Success',
    })
  })

  it('returns partial result', async () => {
    when(
      mockListEmailMessagesForEmailFolderIdUseCase.execute(anything()),
    ).thenResolve({
      emailMessages: [
        EntityDataFactory.emailMessage,
        {
          ...EntityDataFactory.emailMessage,
          status: { type: 'Failed', cause: new Error('dummy_error') },
        },
      ],
      nextToken: 'nextToken',
    })
    const folderId = v4()
    await expect(
      instanceUnderTest.listEmailMessagesForEmailFolderId({
        folderId,
      }),
    ).resolves.toStrictEqual({
      items: [
        {
          id: EntityDataFactory.emailMessage.id,
          owner: EntityDataFactory.emailMessage.owner,
          version: EntityDataFactory.emailMessage.version,
          createdAt: EntityDataFactory.emailMessage.createdAt,
          updatedAt: EntityDataFactory.emailMessage.updatedAt,
          owners: EntityDataFactory.emailMessage.owners,
          emailAddressId: EntityDataFactory.emailMessage.emailAddressId,
          folderId: EntityDataFactory.emailMessage.folderId,
          previousFolderId: EntityDataFactory.emailMessage.previousFolderId,
          seen: EntityDataFactory.emailMessage.seen,
          repliedTo: EntityDataFactory.emailMessage.repliedTo,
          forwarded: EntityDataFactory.emailMessage.forwarded,
          direction: EntityDataFactory.emailMessage.direction,
          state: EntityDataFactory.emailMessage.state,
          clientRefId: EntityDataFactory.emailMessage.clientRefId,
          from: EntityDataFactory.emailMessage.from,
          to: EntityDataFactory.emailMessage.to,
          subject: EntityDataFactory.emailMessage.subject,
          hasAttachments: EntityDataFactory.emailMessage.hasAttachments,
          replyTo: EntityDataFactory.emailMessage.replyTo,
          bcc: EntityDataFactory.emailMessage.bcc,
          cc: EntityDataFactory.emailMessage.cc,
          sortDate: EntityDataFactory.emailMessage.sortDate,
          size: 12345,
          encryptionStatus: EntityDataFactory.emailMessage.encryptionStatus,
          date: EntityDataFactory.emailMessage.date,
        },
      ],
      failed: [
        {
          item: {
            id: EntityDataFactory.emailMessage.id,
            owner: EntityDataFactory.emailMessage.owner,
            version: EntityDataFactory.emailMessage.version,
            createdAt: EntityDataFactory.emailMessage.createdAt,
            updatedAt: EntityDataFactory.emailMessage.updatedAt,
            owners: EntityDataFactory.emailMessage.owners,
            emailAddressId: EntityDataFactory.emailMessage.emailAddressId,
            folderId: EntityDataFactory.emailMessage.folderId,
            previousFolderId: EntityDataFactory.emailMessage.previousFolderId,
            seen: EntityDataFactory.emailMessage.seen,
            repliedTo: EntityDataFactory.emailMessage.repliedTo,
            forwarded: EntityDataFactory.emailMessage.forwarded,
            direction: EntityDataFactory.emailMessage.direction,
            state: EntityDataFactory.emailMessage.state,
            clientRefId: EntityDataFactory.emailMessage.clientRefId,
            sortDate: EntityDataFactory.emailMessage.sortDate,
            size: 12345,
            encryptionStatus: EntityDataFactory.emailMessage.encryptionStatus,
            date: EntityDataFactory.emailMessage.date,
          },
          cause: new Error('dummy_error'),
        },
      ],
      nextToken: 'nextToken',
      status: 'Partial',
    })
  })
})
