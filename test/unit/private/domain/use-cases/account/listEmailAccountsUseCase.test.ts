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
import { EmailAccountService } from '../../../../../../src/private/domain/entities/account/emailAccountService'
import { ListEmailAccountsUseCase } from '../../../../../../src/private/domain/use-cases/account/listEmailAccountsUseCase'
import { EmailAddressFilter } from '../../../../../../src/public/typings/filter'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('ListEmailAccountsUseCase Test Suite', () => {
  const mockEmailAccountService = mock<EmailAccountService>()

  let instanceUnderTest: ListEmailAccountsUseCase

  beforeEach(() => {
    reset(mockEmailAccountService)
    instanceUnderTest = new ListEmailAccountsUseCase(
      instance(mockEmailAccountService),
    )
  })

  describe('execute', () => {
    it('completes successfully', async () => {
      when(mockEmailAccountService.list(anything())).thenResolve({
        emailAccounts: [EntityDataFactory.emailAccount],
      })
      const result = await instanceUnderTest.execute({
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(mockEmailAccountService.list(anything())).once()
      const [inputArgs] = capture(mockEmailAccountService.list).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        cachePolicy: CachePolicy.CacheOnly,
        filter: undefined,
        limit: undefined,
        nextToken: undefined,
      })
      expect(result).toStrictEqual({
        emailAccounts: [EntityDataFactory.emailAccount],
      })
    })

    it('completes successfully with filter', async () => {
      const filter: EmailAddressFilter = {
        emailAddress: { beginsWith: 'testie' },
      }
      when(mockEmailAccountService.list(anything())).thenResolve({
        emailAccounts: [EntityDataFactory.emailAccount],
      })
      const result = await instanceUnderTest.execute({
        cachePolicy: CachePolicy.CacheOnly,
        filter,
      })
      verify(mockEmailAccountService.list(anything())).once()
      const [inputArgs] = capture(mockEmailAccountService.list).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        cachePolicy: CachePolicy.CacheOnly,
        filter: filter,
        limit: undefined,
        nextToken: undefined,
      })
      expect(result).toStrictEqual({
        emailAccounts: [EntityDataFactory.emailAccount],
      })
    })

    it('completes successfully with empty result items', async () => {
      when(mockEmailAccountService.list(anything())).thenResolve({
        emailAccounts: [EntityDataFactory.emailAccount],
      })
      const result = await instanceUnderTest.execute({
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(mockEmailAccountService.list(anything())).once()
      const [inputArgs] = capture(mockEmailAccountService.list).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        cachePolicy: CachePolicy.CacheOnly,
        filter: undefined,
        limit: undefined,
        nextToken: undefined,
      })
      expect(result).toStrictEqual({
        emailAccounts: [EntityDataFactory.emailAccount],
      })
    })
  })
})
