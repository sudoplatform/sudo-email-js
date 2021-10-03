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
import { GetDraftEmailMessageUseCase } from '../../../../../../src/private/domain/use-cases/draft/getDraftEmailMessageUseCase'
import { str2ab } from '../../../../../util/buffer'

describe('GetDraftEmailMessageUseCase Test Suite', () => {
  const mockEmailMessageService = mock<EmailMessageService>()
  let instanceUnderTest: GetDraftEmailMessageUseCase

  beforeEach(() => {
    reset(mockEmailMessageService)
    instanceUnderTest = new GetDraftEmailMessageUseCase(
      instance(mockEmailMessageService),
    )
    when(mockEmailMessageService.getDraft(anything())).thenResolve(
      str2ab('test'),
    )
  })

  it('calls EmailMessageService.getDraft with input id', async () => {
    const id = v4()
    const emailAddressId = v4()
    await instanceUnderTest.execute({ id, emailAddressId })
    verify(mockEmailMessageService.getDraft(anything())).once()
    const [actualArgs] = capture(mockEmailMessageService.getDraft).first()
    expect(actualArgs).toStrictEqual<typeof actualArgs>({ id, emailAddressId })
  })

  it('returns undefined draftDetails if service returns undefined', async () => {
    when(mockEmailMessageService.getDraft(anything())).thenResolve(undefined)
    await expect(
      instanceUnderTest.execute({ id: v4(), emailAddressId: v4() }),
    ).resolves.toBeUndefined()
  })

  it('returns the expected output', async () => {
    const id = v4()
    const emailAddressId = v4()
    const rfc822Data = str2ab(v4())
    when(mockEmailMessageService.getDraft(anything())).thenResolve(rfc822Data)
    await expect(
      instanceUnderTest.execute({ id, emailAddressId }),
    ).resolves.toStrictEqual({
      id,
      rfc822Data,
    })
  })
})
