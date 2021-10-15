/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ApiClientManager,
  DefaultApiClientManager,
} from '@sudoplatform/sudo-api-client'
import {
  AppSyncError,
  DefaultLogger,
  FatalError,
  UnknownGraphQLError,
} from '@sudoplatform/sudo-common'
import { NormalizedCacheObject } from 'apollo-cache-inmemory'
import { OperationVariables } from 'apollo-client/core/types'
import {
  FetchPolicy,
  MutationOptions,
  QueryOptions,
} from 'apollo-client/core/watchQueryOptions'
import { ApolloError } from 'apollo-client/errors/ApolloError'
import AWSAppSyncClient from 'aws-appsync'
import {
  AvailableAddresses,
  CheckEmailAddressAvailabilityDocument,
  CheckEmailAddressAvailabilityInput,
  CheckEmailAddressAvailabilityQuery,
  CreatePublicKeyForEmailDocument,
  CreatePublicKeyForEmailMutation,
  CreatePublicKeyInput,
  DateRangeInput,
  DeleteEmailMessagesDocument,
  DeleteEmailMessagesInput,
  DeleteEmailMessagesMutation,
  DeprovisionEmailAddressDocument,
  DeprovisionEmailAddressInput,
  DeprovisionEmailAddressMutation,
  EmailAddress,
  EmailAddressConnection,
  EmailAddressFilterInput,
  EmailFolderConnection,
  EmailFolderFilterInput,
  EmailMessageConnection,
  EmailMessageFilterInput,
  GetEmailAddressDocument,
  GetEmailAddressQuery,
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
  ListEmailMessagesForEmailAddressIdDocument,
  ListEmailMessagesForEmailAddressIdQuery,
  ListEmailMessagesForEmailFolderIdDocument,
  ListEmailMessagesForEmailFolderIdQuery,
  PaginatedPublicKey,
  ProvisionEmailAddressDocument,
  ProvisionEmailAddressInput,
  ProvisionEmailAddressMutation,
  PublicKey,
  SealedEmailMessage,
  SendEmailMessageDocument,
  SendEmailMessageInput,
  SendEmailMessageMutation,
  SortOrder,
  SupportedDomains,
  UpdateEmailAddressMetadataDocument,
  UpdateEmailAddressMetadataInput,
  UpdateEmailAddressMetadataMutation,
  UpdateEmailMessagesDocument,
  UpdateEmailMessagesInput,
  UpdateEmailMessagesMutation,
  UpdateEmailMessagesResult,
} from '../../../gen/graphqlTypes'
import { ErrorTransformer } from './transformer/errorTransformer'

export class ApiClient {
  private readonly log = new DefaultLogger(this.constructor.name)
  private readonly client: AWSAppSyncClient<NormalizedCacheObject>

  private readonly graphqlErrorTransformer = new ErrorTransformer()

  public constructor(apiClientManager?: ApiClientManager) {
    const clientManager =
      apiClientManager ?? DefaultApiClientManager.getInstance()
    this.client = clientManager.getClient({ disableOffline: true })
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

  public async deprovisionEmailAddress(
    input: DeprovisionEmailAddressInput,
  ): Promise<EmailAddress> {
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
    fetchPolicy: FetchPolicy,
  ): Promise<SupportedDomains> {
    const data = await this.performQuery<GetEmailDomainsQuery>({
      query: GetEmailDomainsDocument,
      fetchPolicy,
      calleeName: this.getSupportedEmailDomains.name,
    })
    return data.getEmailDomains
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

  public async getEmailAddress(
    id: string,
    fetchPolicy: FetchPolicy,
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
    fetchPolicy: FetchPolicy,
    filter?: EmailAddressFilterInput,
    limit?: number,
    nextToken?: string,
  ): Promise<EmailAddressConnection> {
    const data = await this.performQuery<ListEmailAddressesQuery>({
      query: ListEmailAddressesDocument,
      variables: { input: { filter, limit, nextToken } },
      fetchPolicy,
      calleeName: this.listEmailAddresses.name,
    })
    return data.listEmailAddresses
  }

  public async listEmailAddressesForSudoId(
    sudoId: string,
    fetchPolicy: FetchPolicy,
    filter?: EmailAddressFilterInput,
    limit?: number,
    nextToken?: string,
  ): Promise<EmailAddressConnection> {
    const data = await this.performQuery<ListEmailAddressesForSudoIdQuery>({
      query: ListEmailAddressesForSudoIdDocument,
      variables: { input: { sudoId, filter, limit, nextToken } },
      fetchPolicy,
      calleeName: this.listEmailAddressesForSudoId.name,
    })
    return data.listEmailAddressesForSudoId
  }

  public async listEmailFoldersForEmailAddressId(
    emailAddressId: string,
    fetchPolicy: FetchPolicy,
    filter?: EmailFolderFilterInput,
    limit?: number,
    nextToken?: string,
  ): Promise<EmailFolderConnection> {
    const data =
      await this.performQuery<ListEmailFoldersForEmailAddressIdQuery>({
        query: ListEmailFoldersForEmailAddressIdDocument,
        variables: { input: { emailAddressId, filter, limit, nextToken } },
        fetchPolicy,
        calleeName: this.listEmailFoldersForEmailAddressId.name,
      })
    return data.listEmailFoldersForEmailAddressId
  }

  public async sendEmailMessage(input: SendEmailMessageInput): Promise<string> {
    const data = await this.performMutation<SendEmailMessageMutation>({
      mutation: SendEmailMessageDocument,
      variables: { input },
      calleeName: this.sendEmailMessage.name,
    })
    return data.sendEmailMessage
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
  ): Promise<UpdateEmailMessagesResult> {
    const data = await this.performMutation<UpdateEmailMessagesMutation>({
      mutation: UpdateEmailMessagesDocument,
      variables: { input },
      calleeName: this.updateEmailMessages.name,
    })
    return data.updateEmailMessages
  }

  public async getEmailMessage(
    id: string,
    fetchPolicy: FetchPolicy,
  ): Promise<SealedEmailMessage | undefined> {
    const data = await this.performQuery<GetEmailMessageQuery>({
      query: GetEmailMessageDocument,
      variables: { id },
      fetchPolicy,
      calleeName: this.getEmailMessage.name,
    })
    return data.getEmailMessage ?? undefined
  }

  public async listEmailMessagesForEmailAddressId(
    emailAddressId: string,
    fetchPolicy: FetchPolicy,
    dateRange?: DateRangeInput,
    filter?: EmailMessageFilterInput,
    limit?: number,
    sortOrder?: SortOrder,
    nextToken?: string,
  ): Promise<EmailMessageConnection> {
    const data =
      await this.performQuery<ListEmailMessagesForEmailAddressIdQuery>({
        query: ListEmailMessagesForEmailAddressIdDocument,
        variables: {
          input: {
            emailAddressId,
            dateRange,
            filter,
            limit,
            sortOrder,
            nextToken,
          },
        },
        fetchPolicy,
        calleeName: this.listEmailMessagesForEmailAddressId.name,
      })
    return data.listEmailMessagesForEmailAddressId
  }

  public async listEmailMessagesForEmailFolderId(
    folderId: string,
    fetchPolicy: FetchPolicy,
    dateRange?: DateRangeInput,
    filter?: EmailMessageFilterInput,
    limit?: number,
    sortOrder?: SortOrder,
    nextToken?: string,
  ): Promise<EmailMessageConnection> {
    const data =
      await this.performQuery<ListEmailMessagesForEmailFolderIdQuery>({
        query: ListEmailMessagesForEmailFolderIdDocument,
        variables: {
          input: { folderId, dateRange, filter, limit, sortOrder, nextToken },
        },
        fetchPolicy,
        calleeName: this.listEmailMessagesForEmailFolderId.name,
      })
    return data.listEmailMessagesForEmailFolderId
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
    fetchPolicy: FetchPolicy,
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
    fetchPolicy: FetchPolicy,
  ): Promise<PublicKey | undefined> {
    const data = await this.performQuery<GetPublicKeyForEmailQuery>({
      query: GetPublicKeyForEmailDocument,
      variables: { keyId },
      fetchPolicy,
      calleeName: this.getPublicKey.name,
    })
    return data.getPublicKeyForEmail ?? undefined
  }

  async performQuery<Q, QVariables = OperationVariables>({
    variables,
    fetchPolicy,
    query,
    calleeName,
  }: QueryOptions<QVariables> & { calleeName?: string }): Promise<Q> {
    let result
    try {
      result = await this.client.query<Q>({
        variables: variables,
        fetchPolicy: fetchPolicy,
        query: query,
      })
    } catch (err: any) {
      const clientError = err as ApolloError
      this.log.debug('error received', { calleeName, clientError })
      const error = clientError.graphQLErrors?.[0]
      if (error) {
        this.log.debug('appSync query failed with error', { error })
        throw this.graphqlErrorTransformer.toClientError(error)
      } else {
        throw new UnknownGraphQLError(err as AppSyncError)
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

  async performMutation<M, MVariables = OperationVariables>({
    mutation,
    variables,
    calleeName,
  }: Omit<MutationOptions<M, MVariables>, 'fetchPolicy'> & {
    calleeName?: string
  }): Promise<M> {
    let result
    try {
      result = await this.client.mutate<M>({
        mutation: mutation,
        variables: variables,
      })
    } catch (err) {
      const clientError = err as ApolloError
      this.log.debug('error received', { calleeName, clientError })
      const error = clientError.graphQLErrors?.[0]
      if (error) {
        this.log.debug('appSync mutation failed with error', { error })
        throw this.graphqlErrorTransformer.toClientError(error)
      } else {
        throw new UnknownGraphQLError(err as AppSyncError)
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
}
