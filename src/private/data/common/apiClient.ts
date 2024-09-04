/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ApiClientManager,
  DefaultApiClientManager,
} from '@sudoplatform/sudo-api-client'
import {
  AppSyncNetworkError,
  DefaultLogger,
  FatalError,
  Logger,
  UnknownGraphQLError,
  isAppSyncNetworkError,
  mapNetworkErrorToClientError,
} from '@sudoplatform/sudo-common'
import { NormalizedCacheObject } from 'apollo-cache-inmemory'
import {
  FetchPolicy,
  MutationOptions,
  QueryOptions,
  SubscriptionOptions,
} from 'apollo-client/core/watchQueryOptions'
import { ApolloError } from 'apollo-client/errors/ApolloError'
import { Observable } from 'apollo-client/util/Observable'
import { FetchResult } from 'apollo-link'
import AWSAppSyncClient from 'aws-appsync'
import {
  AvailableAddresses,
  BlockEmailAddressesBulkUpdateResult,
  BlockEmailAddressesDocument,
  BlockEmailAddressesInput,
  BlockEmailAddressesMutation,
  CheckEmailAddressAvailabilityDocument,
  CheckEmailAddressAvailabilityInput,
  CheckEmailAddressAvailabilityQuery,
  CreateCustomEmailFolderDocument,
  CreateCustomEmailFolderInput,
  CreateCustomEmailFolderMutation,
  CreatePublicKeyForEmailDocument,
  CreatePublicKeyForEmailMutation,
  CreatePublicKeyInput,
  DeleteEmailMessagesDocument,
  DeleteEmailMessagesInput,
  DeleteEmailMessagesMutation,
  DeprovisionEmailAddressDocument,
  DeprovisionEmailAddressInput,
  DeprovisionEmailAddressMutation,
  EmailAddress,
  EmailAddressConnection,
  EmailAddressWithoutFoldersFragment,
  EmailConfigurationData,
  EmailFolder,
  EmailFolderConnection,
  EmailMessageConnection,
  EmailMessageDateRangeInput,
  GetEmailAddressBlocklistDocument,
  GetEmailAddressBlocklistQuery,
  GetEmailAddressBlocklistResponseFragment,
  GetEmailAddressDocument,
  GetEmailAddressQuery,
  GetEmailConfigDocument,
  GetEmailConfigQuery,
  GetEmailDomainsDocument,
  GetEmailDomainsQuery,
  GetEmailMessageDocument,
  GetEmailMessageQuery,
  GetKeyRingForEmailDocument,
  GetKeyRingForEmailQuery,
  GetPublicKeyForEmailDocument,
  GetPublicKeyForEmailQuery,
  ListEmailAddressesDocument,
  ListEmailAddressesForSudoIdDocument,
  ListEmailAddressesForSudoIdQuery,
  ListEmailAddressesQuery,
  ListEmailFoldersForEmailAddressIdDocument,
  ListEmailFoldersForEmailAddressIdQuery,
  ListEmailMessagesDocument,
  ListEmailMessagesForEmailAddressIdDocument,
  ListEmailMessagesForEmailAddressIdQuery,
  ListEmailMessagesForEmailFolderIdDocument,
  ListEmailMessagesForEmailFolderIdQuery,
  ListEmailMessagesQuery,
  LookupEmailAddressesPublicInfoDocument,
  LookupEmailAddressesPublicInfoQuery,
  LookupEmailAddressesPublicInfoResponse,
  OnEmailMessageCreatedDocument,
  OnEmailMessageCreatedSubscription,
  OnEmailMessageDeletedDocument,
  OnEmailMessageDeletedSubscription,
  PaginatedPublicKey,
  ProvisionEmailAddressDocument,
  ProvisionEmailAddressInput,
  ProvisionEmailAddressMutation,
  PublicKey,
  SealedEmailMessage,
  SendEmailMessageInput,
  SendEmailMessageResult,
  SendEmailMessageDocument,
  SendEmailMessageMutation,
  SendEncryptedEmailMessageDocument,
  SendEncryptedEmailMessageInput,
  SendEncryptedEmailMessageMutation,
  SortOrder,
  SupportedDomains,
  UnblockEmailAddressesDocument,
  UnblockEmailAddressesInput,
  UnblockEmailAddressesMutation,
  UpdateEmailAddressMetadataDocument,
  UpdateEmailAddressMetadataInput,
  UpdateEmailAddressMetadataMutation,
  UpdateEmailMessagesDocument,
  UpdateEmailMessagesInput,
  UpdateEmailMessagesMutation,
  UpdateEmailMessagesV2Result,
  ConfiguredDomains,
  GetConfiguredEmailDomainsQuery,
  GetConfiguredEmailDomainsDocument,
} from '../../../gen/graphqlTypes'
import { ErrorTransformer } from './transformer/errorTransformer'

export class ApiClient {
  private readonly log: Logger
  private readonly client: AWSAppSyncClient<NormalizedCacheObject>

  private readonly graphqlErrorTransformer: ErrorTransformer

  public constructor(apiClientManager?: ApiClientManager) {
    this.log = new DefaultLogger(this.constructor.name)
    this.graphqlErrorTransformer = new ErrorTransformer()
    const clientManager =
      apiClientManager ?? DefaultApiClientManager.getInstance()
    this.client = clientManager.getClient({
      disableOffline: true,
      configNamespace: 'emService',
    })
  }

  public async provisionEmailAddress(
    input: ProvisionEmailAddressInput,
  ): Promise<EmailAddress> {
    const data = await this.performMutation<ProvisionEmailAddressMutation>({
      mutation: ProvisionEmailAddressDocument,
      variables: { input },
      calleeName: this.provisionEmailAddress.name,
    })
    return data.provisionEmailAddress
  }

  public async createCustomEmailFolder(
    input: CreateCustomEmailFolderInput,
  ): Promise<EmailFolder> {
    const data = await this.performMutation<CreateCustomEmailFolderMutation>({
      mutation: CreateCustomEmailFolderDocument,
      variables: { input },
      calleeName: this.createCustomEmailFolder.name,
    })
    return data.createCustomEmailFolder
  }

  public async blockEmailAddresses(
    input: BlockEmailAddressesInput,
  ): Promise<BlockEmailAddressesBulkUpdateResult> {
    const data = await this.performMutation<BlockEmailAddressesMutation>({
      mutation: BlockEmailAddressesDocument,
      variables: { input },
      calleeName: this.blockEmailAddresses.name,
    })
    return data.blockEmailAddresses
  }

  public async unblockEmailAddresses(
    input: UnblockEmailAddressesInput,
  ): Promise<BlockEmailAddressesBulkUpdateResult> {
    const data = await this.performMutation<UnblockEmailAddressesMutation>({
      mutation: UnblockEmailAddressesDocument,
      variables: { input },
      calleeName: this.unblockEmailAddresses.name,
    })
    return data.unblockEmailAddresses
  }

  public async getEmailAddressBlocklist(
    owner: string,
    fetchPolicy: FetchPolicy = 'network-only',
  ): Promise<GetEmailAddressBlocklistResponseFragment> {
    const data = await this.performQuery<GetEmailAddressBlocklistQuery>({
      query: GetEmailAddressBlocklistDocument,
      variables: { input: { owner } },
      fetchPolicy,
      calleeName: this.getEmailAddressBlocklist.name,
    })

    return data.getEmailAddressBlocklist
  }

  public async deprovisionEmailAddress(
    input: DeprovisionEmailAddressInput,
  ): Promise<EmailAddressWithoutFoldersFragment> {
    const data = await this.performMutation<DeprovisionEmailAddressMutation>({
      mutation: DeprovisionEmailAddressDocument,
      variables: { input },
      calleeName: this.deprovisionEmailAddress.name,
    })
    return data.deprovisionEmailAddress
  }

  public async updateEmailAddressMetadata(
    input: UpdateEmailAddressMetadataInput,
  ): Promise<string> {
    const data = await this.performMutation<UpdateEmailAddressMetadataMutation>(
      {
        mutation: UpdateEmailAddressMetadataDocument,
        variables: { input },
        calleeName: this.updateEmailAddressMetadata.name,
      },
    )
    return data.updateEmailAddressMetadata
  }

  public async getSupportedEmailDomains(
    fetchPolicy: FetchPolicy = 'network-only',
  ): Promise<SupportedDomains> {
    const data = await this.performQuery<GetEmailDomainsQuery>({
      query: GetEmailDomainsDocument,
      fetchPolicy,
      calleeName: this.getSupportedEmailDomains.name,
    })
    return data.getEmailDomains
  }

  public async getConfiguredEmailDomains(
    fetchPolicy: FetchPolicy = 'network-only',
  ): Promise<ConfiguredDomains> {
    const data = await this.performQuery<GetConfiguredEmailDomainsQuery>({
      query: GetConfiguredEmailDomainsDocument,
      fetchPolicy,
      calleeName: this.getConfiguredEmailDomains.name,
    })
    return data.getConfiguredEmailDomains
  }

  public async checkEmailAddressAvailability(
    input: CheckEmailAddressAvailabilityInput,
  ): Promise<AvailableAddresses> {
    const data = await this.performQuery<CheckEmailAddressAvailabilityQuery>({
      query: CheckEmailAddressAvailabilityDocument,
      variables: { input },
      fetchPolicy: 'network-only',
      calleeName: this.checkEmailAddressAvailability.name,
    })
    return data.checkEmailAddressAvailability
  }

  public async getEmailConfig(): Promise<EmailConfigurationData> {
    const data = await this.performQuery<GetEmailConfigQuery>({
      query: GetEmailConfigDocument,
      variables: {},
      calleeName: this.getEmailConfig.name,
    })
    return data.getEmailConfig
  }

  public async getEmailAddress(
    id: string,
    fetchPolicy: FetchPolicy = 'network-only',
  ): Promise<EmailAddress | undefined> {
    const data = await this.performQuery<GetEmailAddressQuery>({
      query: GetEmailAddressDocument,
      variables: { id },
      fetchPolicy,
      calleeName: this.getEmailAddress.name,
    })
    return data.getEmailAddress ?? undefined
  }

  public async listEmailAddresses(
    fetchPolicy: FetchPolicy = 'network-only',
    limit?: number,
    nextToken?: string,
  ): Promise<EmailAddressConnection> {
    const data = await this.performQuery<ListEmailAddressesQuery>({
      query: ListEmailAddressesDocument,
      variables: { input: { limit, nextToken } },
      fetchPolicy,
      calleeName: this.listEmailAddresses.name,
    })
    return data.listEmailAddresses
  }

  public async listEmailAddressesForSudoId(
    sudoId: string,
    fetchPolicy: FetchPolicy = 'network-only',
    limit?: number,
    nextToken?: string,
  ): Promise<EmailAddressConnection> {
    const data = await this.performQuery<ListEmailAddressesForSudoIdQuery>({
      query: ListEmailAddressesForSudoIdDocument,
      variables: { input: { sudoId, limit, nextToken } },
      fetchPolicy,
      calleeName: this.listEmailAddressesForSudoId.name,
    })
    return data.listEmailAddressesForSudoId
  }

  public async lookupEmailAddressesPublicInfo(
    emailAddresses: string[],
    fetchPolicy: FetchPolicy = 'network-only',
  ): Promise<LookupEmailAddressesPublicInfoResponse> {
    const data = await this.performQuery<LookupEmailAddressesPublicInfoQuery>({
      query: LookupEmailAddressesPublicInfoDocument,
      variables: { input: { emailAddresses } },
      fetchPolicy,
      calleeName: this.lookupEmailAddressesPublicInfo.name,
    })
    return data.lookupEmailAddressesPublicInfo
  }

  public async listEmailFoldersForEmailAddressId(
    emailAddressId: string,
    fetchPolicy: FetchPolicy = 'network-only',
    limit?: number,
    nextToken?: string,
  ): Promise<EmailFolderConnection> {
    const data =
      await this.performQuery<ListEmailFoldersForEmailAddressIdQuery>({
        query: ListEmailFoldersForEmailAddressIdDocument,
        variables: { input: { emailAddressId, limit, nextToken } },
        fetchPolicy,
        calleeName: this.listEmailFoldersForEmailAddressId.name,
      })
    return data.listEmailFoldersForEmailAddressId
  }

  public async sendEmailMessage(
    input: SendEmailMessageInput,
  ): Promise<SendEmailMessageResult> {
    const data = await this.performMutation<SendEmailMessageMutation>({
      mutation: SendEmailMessageDocument,
      variables: { input },
      calleeName: this.sendEmailMessage.name,
    })
    return data.sendEmailMessageV2
  }

  public async sendEncryptedEmailMessage(
    input: SendEncryptedEmailMessageInput,
  ): Promise<SendEmailMessageResult> {
    const data = await this.performMutation<SendEncryptedEmailMessageMutation>({
      mutation: SendEncryptedEmailMessageDocument,
      variables: { input },
      calleeName: this.sendEncryptedEmailMessage.name,
    })
    return data.sendEncryptedEmailMessage
  }

  public async deleteEmailMessages(
    input: DeleteEmailMessagesInput,
  ): Promise<string[]> {
    const data = await this.performMutation<DeleteEmailMessagesMutation>({
      mutation: DeleteEmailMessagesDocument,
      variables: { input },
      calleeName: this.deleteEmailMessages.name,
    })
    return data.deleteEmailMessages
  }

  public async updateEmailMessages(
    input: UpdateEmailMessagesInput,
  ): Promise<UpdateEmailMessagesV2Result> {
    const data = await this.performMutation<UpdateEmailMessagesMutation>({
      mutation: UpdateEmailMessagesDocument,
      variables: { input },
      calleeName: this.updateEmailMessages.name,
    })

    return data.updateEmailMessagesV2
  }

  public async getEmailMessage(
    id: string,
    fetchPolicy: FetchPolicy = 'network-only',
  ): Promise<SealedEmailMessage | undefined> {
    const data = await this.performQuery<GetEmailMessageQuery>({
      query: GetEmailMessageDocument,
      variables: { id },
      fetchPolicy,
      calleeName: this.getEmailMessage.name,
    })
    return data.getEmailMessage ?? undefined
  }

  public async listEmailMessages(
    fetchPolicy: FetchPolicy = 'network-only',
    dateRange?: EmailMessageDateRangeInput,
    limit?: number,
    sortOrder?: SortOrder,
    nextToken?: string,
    includeDeletedMessages?: boolean,
  ): Promise<EmailMessageConnection> {
    const data = await this.performQuery<ListEmailMessagesQuery>({
      query: ListEmailMessagesDocument,
      variables: {
        input: {
          specifiedDateRange: dateRange,
          limit,
          sortOrder,
          nextToken,
          includeDeletedMessages,
        },
      },
      fetchPolicy,
      calleeName: this.listEmailMessages.name,
    })
    return data.listEmailMessages
  }

  public async listEmailMessagesForEmailAddressId(
    emailAddressId: string,
    fetchPolicy: FetchPolicy = 'network-only',
    dateRange?: EmailMessageDateRangeInput,
    limit?: number,
    sortOrder?: SortOrder,
    nextToken?: string,
    includeDeletedMessages?: boolean,
  ): Promise<EmailMessageConnection> {
    const data =
      await this.performQuery<ListEmailMessagesForEmailAddressIdQuery>({
        query: ListEmailMessagesForEmailAddressIdDocument,
        variables: {
          input: {
            emailAddressId,
            specifiedDateRange: dateRange,
            limit,
            sortOrder,
            nextToken,
            includeDeletedMessages,
          },
        },
        fetchPolicy,
        calleeName: this.listEmailMessagesForEmailAddressId.name,
      })
    return data.listEmailMessagesForEmailAddressId
  }

  public async listEmailMessagesForEmailFolderId(
    folderId: string,
    fetchPolicy: FetchPolicy = 'network-only',
    dateRange?: EmailMessageDateRangeInput,
    limit?: number,
    sortOrder?: SortOrder,
    nextToken?: string,
    includeDeletedMessages?: boolean,
  ): Promise<EmailMessageConnection> {
    const data =
      await this.performQuery<ListEmailMessagesForEmailFolderIdQuery>({
        query: ListEmailMessagesForEmailFolderIdDocument,
        variables: {
          input: {
            folderId,
            specifiedDateRange: dateRange,
            limit,
            sortOrder,
            nextToken,
            includeDeletedMessages,
          },
        },
        fetchPolicy,
        calleeName: this.listEmailMessagesForEmailFolderId.name,
      })
    return data.listEmailMessagesForEmailFolderId
  }

  public onEmailMessageDeleted(
    ownerId: string,
  ): Observable<FetchResult<OnEmailMessageDeletedSubscription>> {
    return this.performSubscription({
      query: OnEmailMessageDeletedDocument,
      variables: { owner: ownerId },
      calleeName: this.onEmailMessageDeleted.name,
    })
  }

  public onEmailMessageCreated(
    ownerId: string,
  ): Observable<FetchResult<OnEmailMessageCreatedSubscription>> {
    return this.performSubscription({
      query: OnEmailMessageCreatedDocument,
      variables: { owner: ownerId },
      calleeName: this.onEmailMessageCreated.name,
    })
  }

  public async createPublicKey(
    input: CreatePublicKeyInput,
  ): Promise<PublicKey> {
    const data = await this.performMutation<CreatePublicKeyForEmailMutation>({
      mutation: CreatePublicKeyForEmailDocument,
      variables: { input },
      calleeName: this.createPublicKey.name,
    })
    return data.createPublicKeyForEmail
  }

  public async getKeyRing(
    keyRingId: string,
    fetchPolicy: FetchPolicy = 'network-only',
    limit?: number,
    nextToken?: string,
  ): Promise<PaginatedPublicKey | undefined> {
    const data = await this.performQuery<GetKeyRingForEmailQuery>({
      query: GetKeyRingForEmailDocument,
      variables: { keyRingId, limit, nextToken },
      fetchPolicy,
      calleeName: this.getKeyRing.name,
    })
    return data.getKeyRingForEmail
  }

  public async getPublicKey(
    keyId: string,
    fetchPolicy: FetchPolicy = 'network-only',
  ): Promise<PublicKey | undefined> {
    const data = await this.performQuery<GetPublicKeyForEmailQuery>({
      query: GetPublicKeyForEmailDocument,
      variables: { keyId },
      fetchPolicy,
      calleeName: this.getPublicKey.name,
    })
    return data.getPublicKeyForEmail ?? undefined
  }

  private async performQuery<Q>({
    variables,
    fetchPolicy,
    query,
    calleeName,
  }: QueryOptions & { calleeName?: string }): Promise<Q> {
    let result
    try {
      result = await this.client.query<Q>({
        variables,
        fetchPolicy,
        query,
      })
    } catch (err) {
      if (isAppSyncNetworkError(err as Error)) {
        throw mapNetworkErrorToClientError(err as AppSyncNetworkError)
      }

      const clientError = err as ApolloError
      this.log.debug('error received', { calleeName, clientError })
      const error = clientError.graphQLErrors?.[0]
      if (error) {
        this.log.debug('appSync query failed with error', { error })
        throw this.graphqlErrorTransformer.toClientError(error)
      } else {
        throw new UnknownGraphQLError(err)
      }
    }

    const error = result.errors?.[0]
    if (error) {
      this.log.debug('error received', { error })
      throw this.graphqlErrorTransformer.toClientError(error)
    }
    if (result.data) {
      return result.data
    } else {
      throw new FatalError(
        `${calleeName ?? '<no callee>'} did not return any result`,
      )
    }
  }

  private async performMutation<M>({
    mutation,
    variables,
    calleeName,
  }: Omit<MutationOptions<M>, 'fetchPolicy'> & {
    calleeName?: string
  }): Promise<M> {
    let result
    try {
      result = await this.client.mutate<M>({
        mutation,
        variables,
      })
    } catch (err) {
      if (isAppSyncNetworkError(err as Error)) {
        throw mapNetworkErrorToClientError(err as AppSyncNetworkError)
      }

      const clientError = err as ApolloError
      this.log.debug('error received', { calleeName, clientError })
      const error = clientError.graphQLErrors?.[0]
      if (error) {
        this.log.debug('appSync mutation failed with error', { error })
        throw this.graphqlErrorTransformer.toClientError(error)
      } else {
        throw new UnknownGraphQLError(err)
      }
    }
    const error = result.errors?.[0]
    if (error) {
      this.log.debug('appSync mutation failed with error', { error })
      throw this.graphqlErrorTransformer.toClientError(error)
    }
    if (result.data) {
      return result.data
    } else {
      throw new FatalError(
        `${calleeName ?? '<no callee>'} did not return any result`,
      )
    }
  }

  private performSubscription<S>({
    query,
    variables,
    calleeName,
  }: Omit<SubscriptionOptions, 'fetchPolicy'> & {
    calleeName?: string
  }): Observable<FetchResult<S>> {
    try {
      return this.client.subscribe<S>({
        query,
        variables,
      })
    } catch (err) {
      const clientError = err as ApolloError
      this.log.debug('error received', { calleeName, clientError })
      const error = clientError.graphQLErrors?.[0]
      if (error) {
        this.log.debug('appSync subscription failed with error', { error })
        throw this.graphqlErrorTransformer.toClientError(error)
      } else {
        throw new UnknownGraphQLError(err)
      }
    }
  }
}
