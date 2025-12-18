/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ApiClientManager,
  DefaultApiClientManager,
} from '@sudoplatform/sudo-api-client'
import {
  DefaultLogger,
  FatalError,
  GraphQLNetworkError,
  isGraphQLNetworkError,
  Logger,
  mapNetworkErrorToClientError,
  UnknownGraphQLError,
} from '@sudoplatform/sudo-common'
import { GraphQLOptions } from '@aws-amplify/api-graphql'
import Observable from 'zen-observable'

import {
  AvailableAddresses,
  BlockEmailAddressesBulkUpdateResult,
  BlockEmailAddressesDocument,
  BlockEmailAddressesInput,
  BlockEmailAddressesMutation,
  CancelScheduledDraftMessageDocument,
  CancelScheduledDraftMessageInput,
  CancelScheduledDraftMessageMutation,
  CheckEmailAddressAvailabilityDocument,
  CheckEmailAddressAvailabilityInput,
  CheckEmailAddressAvailabilityQuery,
  ConfiguredDomains,
  CreateCustomEmailFolderDocument,
  CreateCustomEmailFolderInput,
  CreateCustomEmailFolderMutation,
  CreatePublicKeyForEmailDocument,
  CreatePublicKeyForEmailMutation,
  CreatePublicKeyInput,
  DeleteCustomEmailFolderDocument,
  DeleteCustomEmailFolderInput,
  DeleteCustomEmailFolderMutation,
  DeleteEmailMessagesDocument,
  DeleteEmailMessagesInput,
  DeleteEmailMessagesMutation,
  DeleteMessagesByFolderIdDocument,
  DeleteMessagesByFolderIdInput,
  DeleteMessagesByFolderIdMutation,
  DeprovisionEmailAddressDocument,
  DeprovisionEmailAddressInput,
  DeprovisionEmailAddressMutation,
  DeprovisionEmailMaskDocument,
  DeprovisionEmailMaskInput,
  DeprovisionEmailMaskMutation,
  DisableEmailMaskDocument,
  DisableEmailMaskInput,
  DisableEmailMaskMutation,
  EmailAddress,
  EmailAddressConnection,
  EmailAddressWithoutFoldersFragment,
  EmailConfigurationData,
  EmailFolder,
  EmailFolderConnection,
  EmailMask,
  EmailMaskConnection,
  EmailMaskDomains,
  EmailMessageConnection,
  EmailMessageDateRangeInput,
  EnableEmailMaskDocument,
  EnableEmailMaskInput,
  EnableEmailMaskMutation,
  GetConfiguredEmailDomainsDocument,
  GetConfiguredEmailDomainsQuery,
  GetEmailAddressBlocklistDocument,
  GetEmailAddressBlocklistQuery,
  GetEmailAddressBlocklistResponseFragment,
  GetEmailAddressDocument,
  GetEmailAddressQuery,
  GetEmailConfigDocument,
  GetEmailConfigQuery,
  GetEmailDomainsDocument,
  GetEmailDomainsQuery,
  GetEmailMaskDomainsDocument,
  GetEmailMaskDomainsQuery,
  GetEmailMessageDocument,
  GetEmailMessageQuery,
  GetKeyRingForEmailDocument,
  GetKeyRingForEmailQuery,
  GetKeyRingForEmailQueryVariables,
  GetPublicKeyForEmailDocument,
  GetPublicKeyForEmailQuery,
  ListEmailAddressesDocument,
  ListEmailAddressesForSudoIdDocument,
  ListEmailAddressesForSudoIdQuery,
  ListEmailAddressesForSudoIdQueryVariables,
  ListEmailAddressesQuery,
  ListEmailAddressesQueryVariables,
  ListEmailFoldersForEmailAddressIdDocument,
  ListEmailFoldersForEmailAddressIdQuery,
  ListEmailFoldersForEmailAddressIdQueryVariables,
  ListEmailMasksForOwnerDocument,
  ListEmailMasksForOwnerInput,
  ListEmailMasksForOwnerQuery,
  ListEmailMessagesDocument,
  ListEmailMessagesForEmailAddressIdDocument,
  ListEmailMessagesForEmailAddressIdQuery,
  ListEmailMessagesForEmailAddressIdQueryVariables,
  ListEmailMessagesForEmailFolderIdDocument,
  ListEmailMessagesForEmailFolderIdQuery,
  ListEmailMessagesForEmailFolderIdQueryVariables,
  ListEmailMessagesQuery,
  ListEmailMessagesQueryVariables,
  ListScheduledDraftMessagesForEmailAddressIdDocument,
  ListScheduledDraftMessagesForEmailAddressIdInput,
  ListScheduledDraftMessagesForEmailAddressIdQuery,
  LookupEmailAddressesPublicInfoDocument,
  LookupEmailAddressesPublicInfoQuery,
  LookupEmailAddressesPublicInfoResponse,
  OnEmailMessageCreatedDocument,
  OnEmailMessageCreatedSubscription,
  OnEmailMessageDeletedDocument,
  OnEmailMessageDeletedSubscription,
  OnEmailMessageUpdatedDocument,
  OnEmailMessageUpdatedSubscription,
  PaginatedPublicKey,
  ProvisionEmailAddressDocument,
  ProvisionEmailAddressInput,
  ProvisionEmailAddressMutation,
  ProvisionEmailMaskDocument,
  ProvisionEmailMaskInput,
  ProvisionEmailMaskMutation,
  PublicKey,
  ScheduledDraftMessage,
  ScheduledDraftMessageConnection,
  ScheduleSendDraftMessageDocument,
  ScheduleSendDraftMessageInput,
  ScheduleSendDraftMessageMutation,
  SealedEmailMessage,
  SendEmailMessageDocument,
  SendEmailMessageInput,
  SendEmailMessageMutation,
  SendEmailMessageResult,
  SendEncryptedEmailMessageDocument,
  SendEncryptedEmailMessageInput,
  SendEncryptedEmailMessageMutation,
  SendMaskedEmailMessageDocument,
  SendMaskedEmailMessageInput,
  SendMaskedEmailMessageMutation,
  SortOrder,
  SupportedDomains,
  UnblockEmailAddressesDocument,
  UnblockEmailAddressesInput,
  UnblockEmailAddressesMutation,
  UpdateCustomEmailFolderDocument,
  UpdateCustomEmailFolderInput,
  UpdateCustomEmailFolderMutation,
  UpdateEmailAddressMetadataDocument,
  UpdateEmailAddressMetadataInput,
  UpdateEmailAddressMetadataMutation,
  UpdateEmailMaskDocument,
  UpdateEmailMaskInput,
  UpdateEmailMaskMutation,
  UpdateEmailMessagesDocument,
  UpdateEmailMessagesInput,
  UpdateEmailMessagesMutation,
  UpdateEmailMessagesV2Result,
} from '../../../gen/graphqlTypes'
import { ErrorTransformer } from './transformer/errorTransformer'
import { GraphQLClient } from '@sudoplatform/sudo-user'
import { SubscriptionResult } from './subscriptionManager'

export class ApiClient {
  private readonly log: Logger
  private readonly client: GraphQLClient

  private readonly graphqlErrorTransformer: ErrorTransformer

  public constructor(apiClientManager?: ApiClientManager) {
    this.log = new DefaultLogger(this.constructor.name)
    this.graphqlErrorTransformer = new ErrorTransformer()
    const clientManager =
      apiClientManager ?? DefaultApiClientManager.getInstance()
    this.client = clientManager.getClient({
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

  public async deleteCustomEmailFolder(
    input: DeleteCustomEmailFolderInput,
  ): Promise<EmailFolder | undefined> {
    const data = await this.performMutation<DeleteCustomEmailFolderMutation>({
      mutation: DeleteCustomEmailFolderDocument,
      variables: { input },
      calleeName: this.deleteCustomEmailFolder.name,
    })
    return data.deleteCustomEmailFolder || undefined
  }

  public async updateCustomEmailFolder(
    input: UpdateCustomEmailFolderInput,
  ): Promise<EmailFolder> {
    const data = await this.performMutation<UpdateCustomEmailFolderMutation>({
      mutation: UpdateCustomEmailFolderDocument,
      variables: { input },
      calleeName: this.updateCustomEmailFolder.name,
    })
    return data.updateCustomEmailFolder
  }

  public async deleteMessagesByFolderId(
    input: DeleteMessagesByFolderIdInput,
  ): Promise<string> {
    const data = await this.performMutation<DeleteMessagesByFolderIdMutation>({
      mutation: DeleteMessagesByFolderIdDocument,
      variables: { input },
      calleeName: this.deleteMessagesByFolderId.name,
    })
    return data.deleteMessagesByFolderId
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
  ): Promise<GetEmailAddressBlocklistResponseFragment> {
    const data = await this.performQuery<GetEmailAddressBlocklistQuery>({
      query: GetEmailAddressBlocklistDocument,
      variables: { input: { owner } },
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

  public async getSupportedEmailDomains(): Promise<SupportedDomains> {
    const data = await this.performQuery<GetEmailDomainsQuery>({
      query: GetEmailDomainsDocument,
      calleeName: this.getSupportedEmailDomains.name,
    })
    return data.getEmailDomains
  }

  public async getConfiguredEmailDomains(): Promise<ConfiguredDomains> {
    const data = await this.performQuery<GetConfiguredEmailDomainsQuery>({
      query: GetConfiguredEmailDomainsDocument,
      calleeName: this.getConfiguredEmailDomains.name,
    })
    return data.getConfiguredEmailDomains
  }

  public async getEmailMaskDomains(): Promise<EmailMaskDomains> {
    const data = await this.performQuery<GetEmailMaskDomainsQuery>({
      query: GetEmailMaskDomainsDocument,
      calleeName: this.getEmailMaskDomains.name,
    })
    return data.getEmailMaskDomains
  }

  public async checkEmailAddressAvailability(
    input: CheckEmailAddressAvailabilityInput,
  ): Promise<AvailableAddresses> {
    const data = await this.performQuery<CheckEmailAddressAvailabilityQuery>({
      query: CheckEmailAddressAvailabilityDocument,
      variables: { input },
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

  public async getEmailAddress(id: string): Promise<EmailAddress | undefined> {
    const data = await this.performQuery<GetEmailAddressQuery>({
      query: GetEmailAddressDocument,
      variables: { id },
      calleeName: this.getEmailAddress.name,
    })
    return data.getEmailAddress ?? undefined
  }

  public async listEmailAddresses(
    limit?: number,
    nextToken?: string,
  ): Promise<EmailAddressConnection> {
    const data = await this.performQuery<ListEmailAddressesQuery>({
      query: ListEmailAddressesDocument,
      variables: {
        input: { limit, nextToken },
      } as ListEmailAddressesQueryVariables,
      calleeName: this.listEmailAddresses.name,
    })
    return data.listEmailAddresses
  }

  public async listEmailAddressesForSudoId(
    sudoId: string,
    limit?: number,
    nextToken?: string,
  ): Promise<EmailAddressConnection> {
    const data = await this.performQuery<ListEmailAddressesForSudoIdQuery>({
      query: ListEmailAddressesForSudoIdDocument,
      variables: {
        input: { sudoId, limit, nextToken },
      } as ListEmailAddressesForSudoIdQueryVariables,
      calleeName: this.listEmailAddressesForSudoId.name,
    })
    return data.listEmailAddressesForSudoId
  }

  public async lookupEmailAddressesPublicInfo(
    emailAddresses: string[],
  ): Promise<LookupEmailAddressesPublicInfoResponse> {
    const data = await this.performQuery<LookupEmailAddressesPublicInfoQuery>({
      query: LookupEmailAddressesPublicInfoDocument,
      variables: { input: { emailAddresses } },
      calleeName: this.lookupEmailAddressesPublicInfo.name,
    })
    return data.lookupEmailAddressesPublicInfo
  }

  public async listEmailFoldersForEmailAddressId(
    emailAddressId: string,
    limit?: number,
    nextToken?: string,
  ): Promise<EmailFolderConnection> {
    const data =
      await this.performQuery<ListEmailFoldersForEmailAddressIdQuery>({
        query: ListEmailFoldersForEmailAddressIdDocument,
        variables: {
          input: { emailAddressId, limit, nextToken },
        } as ListEmailFoldersForEmailAddressIdQueryVariables,
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

  public async sendMaskedEmailMessage(
    input: SendMaskedEmailMessageInput,
  ): Promise<SendEmailMessageResult> {
    const data = await this.performMutation<SendMaskedEmailMessageMutation>({
      mutation: SendMaskedEmailMessageDocument,
      variables: { input },
      calleeName: this.sendMaskedEmailMessage.name,
    })
    return data.sendMaskedEmailMessage
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
  ): Promise<SealedEmailMessage | undefined> {
    const data = await this.performQuery<GetEmailMessageQuery>({
      query: GetEmailMessageDocument,
      variables: { id },
      calleeName: this.getEmailMessage.name,
    })
    return data.getEmailMessage ?? undefined
  }

  public async listEmailMessages(
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
      } as ListEmailMessagesQueryVariables,
      calleeName: this.listEmailMessages.name,
    })
    return data.listEmailMessages
  }

  public async listEmailMessagesForEmailAddressId(
    emailAddressId: string,
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
        } as ListEmailMessagesForEmailAddressIdQueryVariables,
        calleeName: this.listEmailMessagesForEmailAddressId.name,
      })
    return data.listEmailMessagesForEmailAddressId
  }

  public async listEmailMessagesForEmailFolderId(
    folderId: string,
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
        } as ListEmailMessagesForEmailFolderIdQueryVariables,
        calleeName: this.listEmailMessagesForEmailFolderId.name,
      })
    return data.listEmailMessagesForEmailFolderId
  }

  public async scheduleSendDraftMessage(
    input: ScheduleSendDraftMessageInput,
  ): Promise<ScheduledDraftMessage> {
    const data = await this.performMutation<ScheduleSendDraftMessageMutation>({
      mutation: ScheduleSendDraftMessageDocument,
      variables: { input },
      calleeName: this.scheduleSendDraftMessage.name,
    })
    return data.scheduleSendDraftMessage
  }

  public async cancelScheduledDraftMessage(
    input: CancelScheduledDraftMessageInput,
  ): Promise<string> {
    const data =
      await this.performMutation<CancelScheduledDraftMessageMutation>({
        mutation: CancelScheduledDraftMessageDocument,
        variables: { input },
        calleeName: this.cancelScheduledDraftMessage.name,
      })
    return data.cancelScheduledDraftMessage
  }

  public async listScheduledDraftMessagesForEmailAddressId(
    input: ListScheduledDraftMessagesForEmailAddressIdInput,
  ): Promise<ScheduledDraftMessageConnection> {
    const data =
      await this.performQuery<ListScheduledDraftMessagesForEmailAddressIdQuery>(
        {
          query: ListScheduledDraftMessagesForEmailAddressIdDocument,
          variables: { input },
          calleeName: this.listScheduledDraftMessagesForEmailAddressId.name,
        },
      )
    return data.listScheduledDraftMessagesForEmailAddressId
  }

  public async provisionEmailMask(
    input: ProvisionEmailMaskInput,
  ): Promise<EmailMask> {
    const data = await this.performMutation<ProvisionEmailMaskMutation>({
      mutation: ProvisionEmailMaskDocument,
      variables: { input },
      calleeName: this.provisionEmailMask.name,
    })
    return data.provisionEmailMask
  }

  public async deprovisionEmailMask(
    input: DeprovisionEmailMaskInput,
  ): Promise<EmailMask> {
    const data = await this.performMutation<DeprovisionEmailMaskMutation>({
      mutation: DeprovisionEmailMaskDocument,
      variables: { input },
      calleeName: this.deprovisionEmailMask.name,
    })
    return data.deprovisionEmailMask
  }

  public async updateEmailMask(
    input: UpdateEmailMaskInput,
  ): Promise<EmailMask> {
    const data = await this.performMutation<UpdateEmailMaskMutation>({
      mutation: UpdateEmailMaskDocument,
      variables: { input },
      calleeName: this.updateEmailMask.name,
    })
    return data.updateEmailMask
  }

  public async enableEmailMask(
    input: EnableEmailMaskInput,
  ): Promise<EmailMask> {
    const data = await this.performMutation<EnableEmailMaskMutation>({
      mutation: EnableEmailMaskDocument,
      variables: { input },
      calleeName: this.enableEmailMask.name,
    })
    return data.enableEmailMask
  }

  public async disableEmailMask(
    input: DisableEmailMaskInput,
  ): Promise<EmailMask> {
    const data = await this.performMutation<DisableEmailMaskMutation>({
      mutation: DisableEmailMaskDocument,
      variables: { input },
      calleeName: this.disableEmailMask.name,
    })
    return data.disableEmailMask
  }

  public async listEmailMasksForOwner(
    input: ListEmailMasksForOwnerInput,
  ): Promise<EmailMaskConnection> {
    const data = await this.performQuery<ListEmailMasksForOwnerQuery>({
      query: ListEmailMasksForOwnerDocument,
      variables: { input },
      calleeName: this.listEmailMasksForOwner.name,
    })
    return data.listEmailMasksForOwner
  }

  public onEmailMessageDeleted(
    ownerId: string,
  ): Promise<
    Observable<SubscriptionResult<OnEmailMessageDeletedSubscription>>
  > {
    return this.performSubscription({
      subscription: OnEmailMessageDeletedDocument,
      variables: { owner: ownerId },
      calleeName: this.onEmailMessageDeleted.name,
    })
  }

  public onEmailMessageCreated(
    ownerId: string,
  ): Promise<
    Observable<SubscriptionResult<OnEmailMessageCreatedSubscription>>
  > {
    return this.performSubscription({
      subscription: OnEmailMessageCreatedDocument,
      variables: { owner: ownerId },
      calleeName: this.onEmailMessageCreated.name,
    })
  }

  public onEmailMessageUpdated(
    ownerId: string,
  ): Promise<
    Observable<SubscriptionResult<OnEmailMessageUpdatedSubscription>>
  > {
    return this.performSubscription({
      subscription: OnEmailMessageUpdatedDocument,
      variables: { owner: ownerId },
      calleeName: this.onEmailMessageUpdated.name,
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
    limit?: number,
    nextToken?: string,
  ): Promise<PaginatedPublicKey | undefined> {
    const data = await this.performQuery<GetKeyRingForEmailQuery>({
      query: GetKeyRingForEmailDocument,
      variables: {
        keyRingId,
        limit,
        nextToken,
      } as GetKeyRingForEmailQueryVariables,
      calleeName: this.getKeyRing.name,
    })
    return data.getKeyRingForEmail
  }

  public async getPublicKey(keyId: string): Promise<PublicKey | undefined> {
    const data = await this.performQuery<GetPublicKeyForEmailQuery>({
      query: GetPublicKeyForEmailDocument,
      variables: { keyId },
      calleeName: this.getPublicKey.name,
    })
    return data.getPublicKeyForEmail ?? undefined
  }

  private async performQuery<Q>({
    variables,
    query,
    calleeName,
  }: GraphQLOptions & { calleeName?: string }): Promise<Q> {
    let result
    try {
      result = await this.client.query<Q>({
        variables,
        query,
      })
    } catch (err) {
      if (isGraphQLNetworkError(err as Error)) {
        throw mapNetworkErrorToClientError(err as GraphQLNetworkError)
      }
      throw this.mapGraphQLCallError(err as Error)
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
  }: Omit<GraphQLOptions, 'query'> & {
    mutation: GraphQLOptions['query']
    calleeName?: string
  }): Promise<M> {
    let result
    try {
      result = await this.client.mutate<M>({
        mutation,
        variables,
      })
    } catch (err) {
      if (isGraphQLNetworkError(err as Error)) {
        throw mapNetworkErrorToClientError(err as GraphQLNetworkError)
      }
      throw this.mapGraphQLCallError(err as Error)
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
    subscription,
    variables,
    calleeName,
  }: Omit<GraphQLOptions, 'query'> & {
    subscription: GraphQLOptions['query']
    calleeName?: string
  }): Promise<Observable<SubscriptionResult<S>>> {
    try {
      return this.client.subscribe<S>({
        subscription,
        variables,
      })
    } catch (err) {
      if (isGraphQLNetworkError(err as Error)) {
        throw mapNetworkErrorToClientError(err as GraphQLNetworkError)
      }
      this.log.debug('appSync subscription failed with error', {
        error: err as Error,
        calleeName,
      })
      throw this.mapGraphQLCallError(err as Error)
    }
  }
  mapGraphQLCallError = (err: Error): Error => {
    if ('graphQLErrors' in err && Array.isArray(err.graphQLErrors)) {
      const error = err.graphQLErrors[0] as {
        errorType: string
        message: string
        name: string
      }
      if (error) {
        this.log.debug('appSync operation failed with error', { err })
        return this.graphqlErrorTransformer.toClientError(error)
      }
    }
    if ('errorType' in err) {
      this.log.debug('appSync operation failed with error', { err })
      return this.graphqlErrorTransformer.toClientError(
        err as { errorType: string; message: string; errorInfo?: string },
      )
    }
    return new UnknownGraphQLError(err)
  }
}
