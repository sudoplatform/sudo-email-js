import { EmailFolderEntity } from '../../domain/entities/folder/emailFolderEntity'
import {
  EmailFolderService,
  ListEmailFoldersForEmailAddressIdInput,
  ListEmailFoldersForEmailAddressIdOutput,
} from '../../domain/entities/folder/emailFolderService'
import { ApiClient } from '../common/apiClient'
import { FetchPolicyTransformer } from '../common/transformer/fetchPolicyTransformer'
import { EmailFolderEntityTransformer } from './transformer/emailFolderEntityTransformer'

export class DefaultEmailFolderService implements EmailFolderService {
  constructor(private readonly appSync: ApiClient) {}

  async listEmailFoldersForEmailAddressId({
    emailAddressId,
    cachePolicy,
    filter,
    limit,
    nextToken,
  }: ListEmailFoldersForEmailAddressIdInput): Promise<ListEmailFoldersForEmailAddressIdOutput> {
    const fetchPolicyTransformer = new FetchPolicyTransformer()
    const fetchPolicy = fetchPolicyTransformer.transformCachePolicy(cachePolicy)
    const result = await this.appSync.listEmailFoldersForEmailAddressId(
      emailAddressId,
      fetchPolicy,
      filter,
      limit,
      nextToken,
    )
    const folders: EmailFolderEntity[] = []
    if (result.items) {
      const transformer = new EmailFolderEntityTransformer()
      result.items.map((item) =>
        folders.push(transformer.transformGraphQL(item)),
      )
    }
    return {
      folders,
      nextToken: result.nextToken ?? undefined,
    }
  }
}
