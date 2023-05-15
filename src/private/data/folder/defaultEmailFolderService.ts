/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

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
    limit,
    nextToken,
  }: ListEmailFoldersForEmailAddressIdInput): Promise<ListEmailFoldersForEmailAddressIdOutput> {
    const fetchPolicy = cachePolicy
      ? FetchPolicyTransformer.transformCachePolicy(cachePolicy)
      : undefined
    const result = await this.appSync.listEmailFoldersForEmailAddressId(
      emailAddressId,
      fetchPolicy,
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
