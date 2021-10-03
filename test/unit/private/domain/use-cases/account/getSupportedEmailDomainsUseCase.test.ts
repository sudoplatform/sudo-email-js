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
import { GetSupportedEmailDomainsUseCase } from '../../../../../../src/private/domain/use-cases/account/getSupportedEmailDomainsUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('GetSupportedEmailDomainsUseCase Test Suite', () => {
  const mockEmailAccountService = mock<EmailAccountService>()

  let instanceUnderTest: GetSupportedEmailDomainsUseCase

  const domains = [EntityDataFactory.emailDomain, EntityDataFactory.emailDomain]

  beforeEach(() => {
    reset(mockEmailAccountService)
    instanceUnderTest = new GetSupportedEmailDomainsUseCase(
      instance(mockEmailAccountService),
    )
  })

  describe('execute', () => {
    it('completes successfully returning expected single supported domain', async () => {
      when(
        mockEmailAccountService.getSupportedEmailDomains(anything()),
      ).thenResolve([domains[0]])
      const result = await instanceUnderTest.execute(CachePolicy.CacheOnly)
      expect(result).toStrictEqual([domains[0]])
      const [inputArgs] = capture(
        mockEmailAccountService.getSupportedEmailDomains,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(
        mockEmailAccountService.getSupportedEmailDomains(anything()),
      ).once()
    })

    it('completes successfully returning expected multiple supported domains', async () => {
      when(
        mockEmailAccountService.getSupportedEmailDomains(anything()),
      ).thenResolve(domains)
      const result = await instanceUnderTest.execute(CachePolicy.CacheOnly)
      expect(result).toStrictEqual(domains)
      const [inputArgs] = capture(
        mockEmailAccountService.getSupportedEmailDomains,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(
        mockEmailAccountService.getSupportedEmailDomains(anything()),
      ).once()
    })
  })
})
