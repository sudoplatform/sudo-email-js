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
import { EmailMessageService } from '../../../../../../src/private/domain/entities/message/emailMessageService'
import { ListDraftEmailMessageMetadataUseCase } from '../../../../../../src/private/domain/use-cases/draft/listDraftEmailMessageMetadataUseCase'

describe('ListDraftEmailMessageMetadataUseCase Test Suite', () => {
  const mockEmailMessageService = mock<EmailMessageService>()
  let instanceUnderTest: ListDraftEmailMessageMetadataUseCase

  beforeEach(() => {
    reset(mockEmailMessageService)
    instanceUnderTest = new ListDraftEmailMessageMetadataUseCase(
      instance(mockEmailMessageService),
    )
  })

  it('calls EmailMessageService.listDrafts with input id', async () => {
    const emailAddressId = v4()
    await instanceUnderTest.execute({ emailAddressId })
    verify(mockEmailMessageService.listDraftsMetadata(anything())).once()
    const [actualResult] = capture(
      mockEmailMessageService.listDraftsMetadata,
    ).first()
    expect(actualResult).toStrictEqual({ emailAddressId })
  })

  it('returns results', async () => {
    const result = [
      { id: v4(), size: 1, updatedAt: new Date() },
      { id: v4(), size: 2, updatedAt: new Date() },
    ]
    when(mockEmailMessageService.listDraftsMetadata(anything())).thenResolve(
      result,
    )
    await expect(
      instanceUnderTest.execute({ emailAddressId: v4() }),
    ).resolves.toStrictEqual({ metadata: result })
  })
})
