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
import { S3Client } from '../../../../../../src/private/data/common/s3Client'
import { EmailAccountService } from '../../../../../../src/private/domain/entities/account/emailAccountService'
import { EmailMessageService } from '../../../../../../src/private/domain/entities/message/emailMessageService'
import { SaveDraftEmailMessageUseCase } from '../../../../../../src/private/domain/use-cases/draft/saveDraftEmailMessageUseCase'
import { AddressNotFoundError } from '../../../../../../src/public/errors'
import { str2ab } from '../../../../../util/buffer'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('SaveDraftEmailMessageUseCase Test Suite', () => {
  const mockEmailAccountService = mock<EmailAccountService>()
  const mockEmailMessageService = mock<EmailMessageService>()
  const mockS3Client = mock<S3Client>()
  let instanceUnderTest: SaveDraftEmailMessageUseCase

  beforeEach(() => {
    reset(mockEmailAccountService)
    reset(mockEmailMessageService)
    reset(mockS3Client)
    instanceUnderTest = new SaveDraftEmailMessageUseCase(
      instance(mockEmailAccountService),
      instance(mockEmailMessageService),
    )
    when(mockEmailAccountService.get(anything())).thenResolve(
      EntityDataFactory.emailAccount,
    )
    when(mockEmailMessageService.saveDraft(anything())).thenResolve({
      id: '',
      updatedAt: new Date(),
    })
  })

  it('calls EmailMessageService.saveDraft with inputs', async () => {
    const senderEmailAddressId = v4()
    const rfc822Data = str2ab(v4())
    await instanceUnderTest.execute({ senderEmailAddressId, rfc822Data })
    verify(mockEmailMessageService.saveDraft(anything())).once()
    const [actualArgs] = capture(mockEmailMessageService.saveDraft).first()
    expect(actualArgs).toStrictEqual<typeof actualArgs>({
      rfc822Data,
      senderEmailAddressId,
    })
  })

  it('returns the expected output id', async () => {
    const id = v4()
    const updatedAt = new Date()
    const rfc822Data = str2ab(v4())
    when(mockEmailMessageService.saveDraft(anything())).thenResolve({
      id,
      updatedAt,
    })
    await expect(
      instanceUnderTest.execute({ senderEmailAddressId: id, rfc822Data }),
    ).resolves.toStrictEqual({ id, updatedAt })
  })

  it('throws AddressNotFound for non-existent email address input', async () => {
    const id = v4()
    const updatedAt = new Date()
    const rfc822Data = str2ab(v4())
    when(mockEmailAccountService.get(anything())).thenThrow(
      new AddressNotFoundError(),
    )
    when(mockEmailMessageService.saveDraft(anything())).thenResolve({
      id,
      updatedAt,
    })
    await expect(
      instanceUnderTest.execute({ senderEmailAddressId: id, rfc822Data }),
    ).rejects.toThrow(new AddressNotFoundError())
    verify(mockEmailAccountService.get(anything())).once()
  })
})
