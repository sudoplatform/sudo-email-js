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
import { ListDraftEmailMessagesUseCase } from '../../../../../../src/private/domain/use-cases/draft/listDraftEmailMessagesUseCase'

describe('ListDraftEmailMessagesUseCase Test Suite', () => {
  const mockEmailMessageService = mock<EmailMessageService>()
  let instanceUnderTest: ListDraftEmailMessagesUseCase

  beforeEach(() => {
    reset(mockEmailMessageService)
    instanceUnderTest = new ListDraftEmailMessagesUseCase(
      instance(mockEmailMessageService),
    )
  })

  it('calls EmailMessageService.listDrafts with input id', async () => {
    const emailAddressId = v4()
    await instanceUnderTest.execute({ emailAddressId })
    verify(mockEmailMessageService.listDrafts(anything())).once()
    const [actualResult] = capture(mockEmailMessageService.listDrafts).first()
    expect(actualResult).toStrictEqual({ emailAddressId })
  })

  it('returns results', async () => {
    const result = [v4(), v4()]
    when(mockEmailMessageService.listDrafts(anything())).thenResolve(result)
    await expect(
      instanceUnderTest.execute({ emailAddressId: v4() }),
    ).resolves.toStrictEqual({ ids: result })
  })
})
