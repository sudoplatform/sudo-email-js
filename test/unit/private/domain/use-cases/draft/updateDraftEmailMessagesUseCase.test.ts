import { anything, instance, mock, reset, verify, when } from 'ts-mockito'
import { v4 } from 'uuid'
import { S3Client } from '../../../../../../src/private/data/common/s3Client'
import { EmailAccountService } from '../../../../../../src/private/domain/entities/account/emailAccountService'
import { EmailMessageService } from '../../../../../../src/private/domain/entities/message/emailMessageService'
import { UpdateDraftEmailMessageUseCase } from '../../../../../../src/private/domain/use-cases/draft/updateDraftEmailMessageUseCase'
import {
  AddressNotFoundError,
  MessageNotFoundError,
} from '../../../../../../src/public/errors'
import { str2ab } from '../../../../../util/buffer'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('UpdateDraftEmailMessageUseCase Test Suite', () => {
  const mockEmailAccountService = mock<EmailAccountService>()
  const mockEmailMessageService = mock<EmailMessageService>()
  const mockS3Client = mock<S3Client>()

  let instanceUnderTest: UpdateDraftEmailMessageUseCase

  beforeEach(() => {
    reset(mockEmailAccountService)
    reset(mockEmailMessageService)
    reset(mockS3Client)
    instanceUnderTest = new UpdateDraftEmailMessageUseCase(
      instance(mockEmailAccountService),
      instance(mockEmailMessageService),
    )
    when(mockEmailAccountService.get(anything())).thenResolve(
      EntityDataFactory.emailAccount,
    )
    when(mockEmailMessageService.getDraft(anything())).thenCall((id) =>
      Promise.resolve({
        id,
        updatedAt: new Date(),
        rfc822Data: str2ab('test'),
      }),
    )

    when(mockEmailMessageService.saveDraft(anything())).thenResolve({
      id: '',
      updatedAt: new Date(),
    })
  })

  describe('execute', () => {
    it('completes successfully with expected draft id output', async () => {
      const id = v4()
      const rfc822Data = str2ab(v4())
      const senderEmailAddressId = v4()
      const updatedAt = new Date()

      when(mockEmailMessageService.getDraft(anything())).thenResolve({
        id,
        updatedAt: new Date(),
        rfc822Data,
      })

      when(mockEmailMessageService.saveDraft(anything())).thenResolve({
        id,
        updatedAt,
      })

      await expect(
        instanceUnderTest.execute({ id, senderEmailAddressId, rfc822Data }),
      ).resolves.toStrictEqual({ id, updatedAt })
    })

    it('throws AddressNotFound error for non-existent email address input', async () => {
      const id = v4()
      const rfc822Data = str2ab(v4())
      const senderEmailAddressId = v4()
      when(mockEmailAccountService.get(anything())).thenThrow(
        new AddressNotFoundError(),
      )
      await expect(
        instanceUnderTest.execute({ id, senderEmailAddressId, rfc822Data }),
      ).rejects.toThrow(new AddressNotFoundError())
      verify(mockEmailAccountService.get(anything())).once()
    })

    it('throws MessageNotFound error for non-existent draft email message input', async () => {
      const id = v4()
      const rfc822Data = str2ab(v4())
      const senderEmailAddressId = v4()
      when(mockEmailMessageService.getDraft(anything())).thenThrow(
        new MessageNotFoundError(),
      )
      await expect(
        instanceUnderTest.execute({ id, senderEmailAddressId, rfc822Data }),
      ).rejects.toThrow(new MessageNotFoundError())
      verify(mockEmailMessageService.getDraft(anything())).once()
    })
  })
})
