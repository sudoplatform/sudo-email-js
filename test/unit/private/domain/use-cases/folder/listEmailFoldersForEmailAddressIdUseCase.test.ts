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
import { EmailFolderFilter } from '../../../../../../src'
import { EmailFolderService } from '../../../../../../src/private/domain/entities/folder/emailFolderService'
import { ListEmailFoldersForEmailAddressIdUseCase } from '../../../../../../src/private/domain/use-cases/folder/listEmailFoldersForEmailAddressIdUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('ListEmailFoldersForEmailAddressIdUseCase Test Suite', () => {
  const mockEmailFolderService = mock<EmailFolderService>()

  let instanceUnderTest: ListEmailFoldersForEmailAddressIdUseCase

  beforeEach(() => {
    reset(mockEmailFolderService)
    instanceUnderTest = new ListEmailFoldersForEmailAddressIdUseCase(
      instance(mockEmailFolderService),
    )
  })

  describe('execute', () => {
    it('completes successfully', async () => {
      const emailAddressId = v4()
      when(
        mockEmailFolderService.listEmailFoldersForEmailAddressId(anything()),
      ).thenResolve()
      when(
        mockEmailFolderService.listEmailFoldersForEmailAddressId(anything()),
      ).thenResolve({ folders: [EntityDataFactory.emailFolder] })
      const result = await instanceUnderTest.execute({
        emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(
        mockEmailFolderService.listEmailFoldersForEmailAddressId(anything()),
      ).once()
      const [inputArgs] = capture(
        mockEmailFolderService.listEmailFoldersForEmailAddressId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
        filter: undefined,
        limit: undefined,
        nextToken: undefined,
      })
      expect(result).toStrictEqual({ folders: [EntityDataFactory.emailFolder] })
    })

    it('completes successfully with filter', async () => {
      const emailAddressId = v4()
      const filter: EmailFolderFilter = {
        size: { eq: 1 },
      }
      when(
        mockEmailFolderService.listEmailFoldersForEmailAddressId(anything()),
      ).thenResolve({ folders: [EntityDataFactory.emailFolder] })
      const result = await instanceUnderTest.execute({
        emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
        filter,
      })
      verify(
        mockEmailFolderService.listEmailFoldersForEmailAddressId(anything()),
      ).once()
      const [inputArgs] = capture(
        mockEmailFolderService.listEmailFoldersForEmailAddressId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
        filter: filter,
        limit: undefined,
        nextToken: undefined,
      })
      expect(result).toStrictEqual({ folders: [EntityDataFactory.emailFolder] })
    })

    it('completes successfully with empty result items', async () => {
      const emailAddressId = v4()
      when(
        mockEmailFolderService.listEmailFoldersForEmailAddressId(anything()),
      ).thenResolve({
        folders: [],
      })
      const result = await instanceUnderTest.execute({
        emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(
        mockEmailFolderService.listEmailFoldersForEmailAddressId(anything()),
      ).once()
      const [inputArgs] = capture(
        mockEmailFolderService.listEmailFoldersForEmailAddressId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
        filter: undefined,
        limit: undefined,
        nextToken: undefined,
      })
      expect(result).toStrictEqual({
        folders: [],
      })
    })
  })
})
