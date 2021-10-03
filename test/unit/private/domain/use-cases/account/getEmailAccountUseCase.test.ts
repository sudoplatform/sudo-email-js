import { CachePolicy } from '@sudoplatform/sudo-common'
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
import { EmailAccountService } from '../../../../../../src/private/domain/entities/account/emailAccountService'
import { GetEmailAccountUseCase } from '../../../../../../src/private/domain/use-cases/account/getEmailAccountUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('GetEmailAddressUseCase', () => {
  const mockEmailAccountService = mock<EmailAccountService>()

  let instanceUnderTest: GetEmailAccountUseCase

  beforeEach(() => {
    reset(mockEmailAccountService)
    instanceUnderTest = new GetEmailAccountUseCase(
      instance(mockEmailAccountService),
    )
  })

  describe('execute', () => {
    it('completes successfully', async () => {
      const id = v4()
      when(mockEmailAccountService.get(anything())).thenResolve(
        EntityDataFactory.emailAccount,
      )
      const result = await instanceUnderTest.execute({
        id,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(mockEmailAccountService.get(anything())).once()
      const [inputArgs] = capture(mockEmailAccountService.get).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        id,
        cachePolicy: CachePolicy.CacheOnly,
      })
      expect(result).toStrictEqual(EntityDataFactory.emailAccount)
    })

    it('completes successfully with undefined result', async () => {
      const id = v4()
      when(mockEmailAccountService.get(anything())).thenResolve(undefined)
      const result = await instanceUnderTest.execute({
        id,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(mockEmailAccountService.get(anything())).once()
      const [inputArgs] = capture(mockEmailAccountService.get).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        id,
        cachePolicy: CachePolicy.CacheOnly,
      })
      expect(result).toStrictEqual(undefined)
    })
  })
})
