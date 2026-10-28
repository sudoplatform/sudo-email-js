/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DefaultLogger,
  DefaultSudoKeyArchive,
  DefaultSudoKeyManager,
  KeyArchiveKeyType,
  ListOutput,
  Logger,
  ServiceError,
  SudoCryptoProvider,
  SudoKeyManager,
} from '@sudoplatform/sudo-common'
import {
  SudoPlatformSignInCallback,
  SudoUserClient,
  internal as SudoUserInternal,
  SignInGuard,
} from '@sudoplatform/sudo-user'
import { WebSudoCryptoProvider } from '@sudoplatform/sudo-web-crypto-provider'
import { Mutex } from 'async-mutex'
import { DefaultEmailAccountService } from '../private/data/account/defaultEmailAccountService'
import { EmailAddressAPITransformer } from '../private/data/account/transformer/emailAddressAPITransformer'
import { EmailAddressEntityTransformer } from '../private/data/account/transformer/emailAddressEntityTransformer'
import { EmailAddressPublicInfoAPITransformer } from '../private/data/account/transformer/emailAddressPublicInfoAPITransformer'
import { ListEmailAddressesAPITransformer } from '../private/data/account/transformer/listEmailAddressesAPITransformer'
import { DefaultEmailAddressBlocklistService } from '../private/data/blocklist/defaultEmailAddressBlocklistService'
import { ApiClient } from '../private/data/common/apiClient'
import {
  EmailServiceConfig,
  getEmailServiceConfig,
} from '../private/data/common/config'
import { DefaultDeviceKeyWorker } from '../private/data/common/deviceKeyWorker'
import { PrivateSudoEmailClientOptions } from '../private/data/common/privateSudoEmailClientOptions'
import { S3Client } from '../private/data/common/s3Client'
import { DefaultConfigurationDataService } from '../private/data/configuration/defaultConfigurationDataService'
import { ConfigurationDataAPITransformer } from '../private/data/configuration/transformer/configurationDataAPITransformer'
import { DefaultEmailDomainService } from '../private/data/emailDomain/defaultEmailDomainService'
import { EmailDomainEntityTransformer } from '../private/data/emailDomain/transformer/emailDomainEntityTransformer'
import { EmailDomainAPITransformer } from '../private/data/emailDomain/transformer/emailDomainAPITransformer'
import { DefaultEmailFolderService } from '../private/data/folder/defaultEmailFolderService'
import { EmailFolderAPITransformer } from '../private/data/folder/transformer/emailFolderAPITransformer'
import { DefaultEmailAliasService } from '../private/data/alias/defaultEmailAliasService'
import { EmailAliasFilterTransformer } from '../private/data/alias/transformer/emailAliasFilterTransformer'
import { EmailAliasTransformer } from '../private/data/alias/transformer/emailAliasTransformer'
import { DefaultEmailMessageService } from '../private/data/message/defaultEmailMessageService'
import { EmailMessageAPITransformer } from '../private/data/message/transformer/emailMessageAPITransformer'
import { ListEmailMessagesAPITransformer } from '../private/data/message/transformer/listEmailMessagesAPITransformer'
import { UpdateEmailMessagesResultTransformer } from '../private/data/message/transformer/updateEmailMessagesResultTransformer'
import { DefaultEmailCryptoService } from '../private/data/secure/defaultEmailCryptoService'
import { EmailDomainEntity } from '../private/domain/entities/emailDomain/emailDomainEntity'
import { EmailAliasService } from '../private/domain/entities/alias/emailAliasService'
import { CheckEmailAddressAvailabilityUseCase } from '../private/domain/use-cases/account/checkEmailAddressAvailabilityUseCase'
import { DeprovisionEmailAccountUseCase } from '../private/domain/use-cases/account/deprovisionEmailAccountUseCase'
import { GetEmailAccountUseCase } from '../private/domain/use-cases/account/getEmailAccountUseCase'
import { ListEmailAccountsForSudoIdUseCase } from '../private/domain/use-cases/account/listEmailAccountsForSudoIdUseCase'
import { ListEmailAccountsUseCase } from '../private/domain/use-cases/account/listEmailAccountsUseCase'
import { LookupEmailAddressesPublicInfoUseCase } from '../private/domain/use-cases/account/lookupEmailAddressesPublicInfoUseCase'
import { ProvisionEmailAccountUseCase } from '../private/domain/use-cases/account/provisionEmailAccountUseCase'
import { UpdateEmailAccountMetadataUseCase } from '../private/domain/use-cases/account/updateEmailAccountMetadataUseCase'
import { BlockEmailAddressesUseCase } from '../private/domain/use-cases/blocklist/blockEmailAddresses'
import { GetEmailAddressBlocklistUseCase } from '../private/domain/use-cases/blocklist/getEmailAddressBlocklist'
import { UnblockEmailAddressesByHashedValueUseCase } from '../private/domain/use-cases/blocklist/unblockEmailAddressesByHashedValue'
import { GetConfigurationDataUseCase } from '../private/domain/use-cases/configuration/getConfigurationDataUseCase'
import { CancelScheduledDraftMessageUseCase } from '../private/domain/use-cases/draft/cancelScheduledDraftMessageUseCase'
import { DeleteDraftEmailMessagesUseCase } from '../private/domain/use-cases/draft/deleteDraftEmailMessagesUseCase'
import { GetDraftEmailMessageUseCase } from '../private/domain/use-cases/draft/getDraftEmailMessageUseCase'
import { ListDraftEmailMessageMetadataForEmailAddressIdUseCase } from '../private/domain/use-cases/draft/listDraftEmailMessageMetadataForEmailAddressIdUseCase'
import { ListDraftEmailMessagesForEmailAddressIdUseCase } from '../private/domain/use-cases/draft/listDraftEmailMessagesForEmailAddressIdUseCase'
import { ListScheduledDraftMessagesForEmailAddressIdUseCase } from '../private/domain/use-cases/draft/listScheduledDraftMessagesForEmailAddressIdUseCase'
import { SaveDraftEmailMessageUseCase } from '../private/domain/use-cases/draft/saveDraftEmailMessageUseCase'
import { ScheduleSendDraftMessageUseCase } from '../private/domain/use-cases/draft/scheduleSendDraftMessageUseCase'
import { UpdateDraftEmailMessageUseCase } from '../private/domain/use-cases/draft/updateDraftEmailMessageUseCase'
import { GetConfiguredEmailDomainsUseCase } from '../private/domain/use-cases/emailDomain/getConfiguredEmailDomainsUseCase'
import { ListEmailDomainsUseCase } from '../private/domain/use-cases/emailDomain/listEmailDomainsUseCase'
import { CreateCustomEmailFolderUseCase } from '../private/domain/use-cases/folder/createCustomEmailFolderUseCase'
import { DeleteCustomEmailFolderUseCase } from '../private/domain/use-cases/folder/deleteCustomEmailFolderUseCase'
import { DeleteMessagesByFolderIdUseCase } from '../private/domain/use-cases/folder/deleteMessagesByFolderIdUseCase'
import { ListEmailFoldersForEmailAddressIdUseCase } from '../private/domain/use-cases/folder/listEmailFoldersForEmailAddressIdUseCase'
import { UpdateCustomEmailFolderUseCase } from '../private/domain/use-cases/folder/updateCustomEmailFolderUseCase'
import { DeprovisionEmailAliasUseCase } from '../private/domain/use-cases/alias/deprovisionEmailAliasUseCase'
import { DisableEmailAliasUseCase } from '../private/domain/use-cases/alias/disableEmailAliasUseCase'
import { EnableEmailAliasUseCase } from '../private/domain/use-cases/alias/enableEmailAliasUseCase'
import { ListEmailAliasesForOwnerUseCase } from '../private/domain/use-cases/alias/listEmailAliasesForOwnerUseCase'
import { ProvisionEmailAliasUseCase } from '../private/domain/use-cases/alias/provisionEmailAliasUseCase'
import { UpdateEmailAliasUseCase } from '../private/domain/use-cases/alias/updateEmailAliasUseCase'
import { DeleteEmailMessagesUseCase } from '../private/domain/use-cases/message/deleteEmailMessagesUseCase'
import { GetEmailMessageUseCase } from '../private/domain/use-cases/message/getEmailMessageUseCase'
import { GetEmailMessageWithBodyUseCase } from '../private/domain/use-cases/message/getEmailMessageWithBodyUseCase'
import { ListEmailMessagesForEmailAddressIdUseCase } from '../private/domain/use-cases/message/listEmailMessagesForEmailAddressIdUseCase'
import { ListEmailMessagesForEmailFolderIdUseCase } from '../private/domain/use-cases/message/listEmailMessagesForEmailFolderIdUseCase'
import { ListEmailMessagesUseCase } from '../private/domain/use-cases/message/listEmailMessagesUseCase'
import { SendEmailMessageUseCase } from '../private/domain/use-cases/message/sendEmailMessageUseCase'
import { SubscribeToEmailMessagesUseCase } from '../private/domain/use-cases/message/subscribeToEmailMessagesUseCase'
import { UnsubscribeFromEmailMessagesUseCase } from '../private/domain/use-cases/message/unsubscribeFromEmailMessagesUseCase'
import { UpdateEmailMessagesUseCase } from '../private/domain/use-cases/message/updateEmailMessagesUseCase'
import { VerifyExternalEmailAddressUseCase } from '../private/domain/use-cases/alias/verifyExternalEmailAddressUseCase'
import { InvalidArgumentError } from './errors'
import {
  BlockEmailAddressesInput,
  UnblockEmailAddressesByHashedValueInput,
} from './inputs/blockedAddresses'
import { FlushMessageBodyCacheInput } from './inputs/flushMessageBodyCache'
import {
  CancelScheduledDraftMessageInput,
  CreateDraftEmailMessageInput,
  DeleteDraftEmailMessagesInput,
  GetDraftEmailMessageInput,
  ListDraftEmailMessageMetadataForEmailAddressIdInput,
  ListDraftEmailMessagesForEmailAddressIdInput,
  ListScheduledDraftMessagesForEmailAddressIdInput,
  ScheduleSendDraftMessageInput,
  UpdateDraftEmailMessageInput,
} from './inputs/draftEmailMessage'
import {
  CheckEmailAddressAvailabilityInput,
  GetEmailAddressInput,
  ListEmailAddressesForSudoIdInput,
  ListEmailAddressesInput,
  LookupEmailAddressesPublicInfoInput,
  ProvisionEmailAddressInput,
  UpdateEmailAddressMetadataInput,
} from './inputs/emailAddress'
import {
  CreateCustomEmailFolderInput,
  DeleteCustomEmailFolderInput,
  DeleteMessagesForFolderIdInput,
  ListEmailFoldersForEmailAddressIdInput,
  UpdateCustomEmailFolderInput,
} from './inputs/emailFolder'
import {
  DeprovisionEmailAliasInput,
  DisableEmailAliasInput,
  EnableEmailAliasInput,
  ListEmailAliasesForOwnerInput,
  ProvisionEmailAliasInput,
  UpdateEmailAliasInput,
} from './inputs/emailAlias'
import {
  GetEmailMessageInput,
  GetEmailMessageWithBodyInput,
  ListEmailMessagesForEmailAddressIdInput,
  ListEmailMessagesForEmailFolderIdInput,
  ListEmailMessagesInput,
  SendEmailMessageInput,
  SendEmailMessageViaAliasInput,
  UpdateEmailMessagesInput,
} from './inputs/emailMessage'
import { SudoEmailClient, SudoEmailClientOptions } from './sudoEmailClient'
import { ScheduledDraftMessage, UpdatedEmailMessageSuccess } from './typings'
import {
  BatchOperationResult,
  BatchOperationResultStatus,
  EmailMessageOperationFailureResult,
} from './typings/batchOperationResult'
import {
  BlockedEmailAddressAction,
  BlockedEmailAddressLevel,
  UnsealedBlockedAddress,
} from './typings/blockedAddresses'
import { ConfigurationData } from './typings/configurationData'
import { DeleteEmailMessageSuccessResult } from './typings/deleteEmailMessageSuccessResult'
import { DraftEmailMessage } from './typings/draftEmailMessage'
import { DraftEmailMessageMetadata } from './typings/draftEmailMessageMetadata'
import { EmailAddress } from './typings/emailAddress'
import { EmailAddressPublicInfo } from './typings/emailAddressPublicInfo'
import { EmailFolder } from './typings/emailFolder'
import { EmailDomain } from './typings/emailDomain'
import { EmailAlias } from './typings/emailAlias'
import {
  EmailMessage,
  EmailMessageSubscriber,
  SendEmailMessageResult,
} from './typings/emailMessage'
import { EmailMessageWithBody } from './typings/emailMessageWithBody'
import {
  ListEmailAddressesResult,
  ListEmailMessagesResult,
} from './typings/listOperationResult'
import { EmailAddressBlocklistService } from '../private/domain/entities/blocklist/emailAddressBlocklistService'
import { EmailCryptoService } from '../private/domain/entities/secure/emailCryptoService'
import {
  VerifyExternalEmailAddressInput,
  VerifyExternalEmailAddressResult,
} from './typings/verifyExternalEmailAddress'
import { LazyEmailMessageBodyCache } from '../private/data/message/cache/lazyEmailMessageBodyCache'
import { EmailMessageBodyCache } from '../private/domain/entities/message/emailMessageBodyCache'
import { UpdateBlockedAddressesStatus } from '../private/domain/entities/blocklist/updateBlockedAddressesStatus'

export class DefaultSudoEmailClient implements SudoEmailClient {
  private readonly apiClient: ApiClient
  private readonly userClient: SudoUserClient
  private readonly configurationDataService: DefaultConfigurationDataService
  private readonly emailAccountService: DefaultEmailAccountService
  private readonly emailDomainService: DefaultEmailDomainService
  private readonly emailFolderService: DefaultEmailFolderService
  private readonly emailMessageService: DefaultEmailMessageService
  private readonly emailAddressBlocklistService: EmailAddressBlocklistService
  private readonly emailAliasService: EmailAliasService
  private readonly emailCryptoService: EmailCryptoService
  private readonly sudoCryptoProvider: SudoCryptoProvider
  private readonly keyManager: SudoKeyManager
  private readonly identityServiceConfig: SudoUserInternal.IdentityServiceConfig
  private readonly emailServiceConfig: EmailServiceConfig
  private readonly signInGuard: SignInGuard
  private readonly emailMessageBodyCache: EmailMessageBodyCache
  private readonly log: Logger
  private readonly mutex: Mutex

  public constructor(opts: SudoEmailClientOptions) {
    this.log = new DefaultLogger(this.constructor.name)
    this.mutex = new Mutex()

    const privateOptions = opts as PrivateSudoEmailClientOptions
    this.apiClient = privateOptions.apiClient ?? new ApiClient()
    this.userClient = opts.sudoUserClient
    this.sudoCryptoProvider =
      opts.sudoCryptoProvider ??
      new WebSudoCryptoProvider(
        'SudoEmailClient',
        'com.sudoplatform.appservicename',
      )

    const config: SudoUserInternal.Config =
      SudoUserInternal.getIdentityServiceConfig()

    this.identityServiceConfig =
      privateOptions.identityServiceConfig ?? config.identityService

    this.emailServiceConfig =
      privateOptions.emailServiceConfig ?? getEmailServiceConfig()

    this.keyManager =
      opts.sudoKeyManager ?? new DefaultSudoKeyManager(this.sudoCryptoProvider)
    // Generate services
    const deviceKeyWorker = new DefaultDeviceKeyWorker(this.keyManager)
    const s3Client = new S3Client(this.userClient, this.identityServiceConfig)
    this.configurationDataService = new DefaultConfigurationDataService(
      this.apiClient,
    )
    this.emailAccountService = new DefaultEmailAccountService(
      this.apiClient,
      deviceKeyWorker,
      {
        enforceSingletonPublicKey:
          opts.sudoEmailClientConfig?.enforceSingletonPublicKey,
      },
    )
    this.emailDomainService = new DefaultEmailDomainService(this.apiClient)
    this.emailFolderService = new DefaultEmailFolderService(
      this.apiClient,
      deviceKeyWorker,
    )
    this.emailCryptoService = new DefaultEmailCryptoService(deviceKeyWorker)
    this.emailMessageBodyCache =
      privateOptions.emailMessageBodyCache ?? new LazyEmailMessageBodyCache()
    this.emailMessageService = new DefaultEmailMessageService(
      this.apiClient,
      this.userClient,
      s3Client,
      deviceKeyWorker,
      this.emailServiceConfig,
      this.emailCryptoService,
      this.emailMessageBodyCache,
    )
    this.emailAddressBlocklistService = new DefaultEmailAddressBlocklistService(
      this.apiClient,
      deviceKeyWorker,
    )
    this.emailAliasService = new DefaultEmailAliasService(
      this.apiClient,
      deviceKeyWorker,
      {
        enforceSingletonPublicKey:
          opts.sudoEmailClientConfig?.enforceSingletonPublicKey,
      },
    )
    this.signInGuard = new SignInGuard(this.userClient)
  }

  public setSignInCallback(callback?: SudoPlatformSignInCallback): void {
    this.signInGuard.setCallback(callback)
  }

  public async getConfigurationData(): Promise<ConfigurationData> {
    await this.ensureSignedIn()
    const useCase = new GetConfigurationDataUseCase(
      this.configurationDataService,
    )
    const result = await useCase.execute()

    const apiTransformer = new ConfigurationDataAPITransformer()
    return apiTransformer.transformEntity(result)
  }

  public async provisionEmailAddress({
    emailAddress,
    ownershipProofToken,
    displayName,
    allowSymmetricKeyGeneration = true,
  }: ProvisionEmailAddressInput): Promise<EmailAddress> {
    await this.ensureSignedIn()
    return await this.mutex.runExclusive(async () => {
      const useCase = new ProvisionEmailAccountUseCase(this.emailAccountService)
      const entityTransformer = new EmailAddressEntityTransformer()
      const emailAddressEntity = entityTransformer.transform(
        emailAddress,
        displayName,
      )
      const result = await useCase.execute({
        emailAddressEntity,
        ownershipProofToken: ownershipProofToken,
        allowSymmetricKeyGeneration,
      })
      const apiTransformer = new EmailAddressAPITransformer()
      return apiTransformer.transformEntity(result)
    })
  }

  public async deprovisionEmailAddress(id: string): Promise<EmailAddress> {
    await this.ensureSignedIn()
    return await this.mutex.runExclusive(async () => {
      const useCase = new DeprovisionEmailAccountUseCase(
        this.emailAccountService,
        this.emailMessageBodyCache,
      )
      const result = await useCase.execute(id)
      const transformer = new EmailAddressAPITransformer()
      return transformer.transformEntity(result)
    })
  }

  public async updateEmailAddressMetadata({
    id,
    values,
  }: UpdateEmailAddressMetadataInput): Promise<string> {
    await this.ensureSignedIn()
    const updateEmailAddressMetadataUseCase =
      new UpdateEmailAccountMetadataUseCase(this.emailAccountService)
    return await updateEmailAddressMetadataUseCase.execute({
      id,
      values: { alias: values.displayName },
    })
  }

  public async sendEmailMessage({
    senderEmailAddressId,
    emailMessageHeader,
    body,
    attachments,
    inlineAttachments,
    replyingMessageId,
    forwardingMessageId,
  }: SendEmailMessageInput): Promise<SendEmailMessageResult> {
    await this.ensureSignedIn()
    const sendEmailMessageUseCase = new SendEmailMessageUseCase(
      this.emailMessageService,
      this.emailAccountService,
      this.emailDomainService,
      this.configurationDataService,
    )
    return await sendEmailMessageUseCase.execute({
      senderEmailAddressId,
      emailMessageHeader,
      body,
      attachments,
      inlineAttachments,
      replyingMessageId,
      forwardingMessageId,
    })
  }

  public async sendEmailMessageViaAlias({
    senderEmailAliasId,
    emailMessageHeader,
    body,
    attachments,
    inlineAttachments,
    replyingMessageId,
    forwardingMessageId,
  }: SendEmailMessageViaAliasInput): Promise<SendEmailMessageResult> {
    await this.ensureSignedIn()
    const sendEmailMessageUseCase = new SendEmailMessageUseCase(
      this.emailMessageService,
      this.emailAccountService,
      this.emailDomainService,
      this.configurationDataService,
    )
    return await sendEmailMessageUseCase.execute({
      senderEmailAliasId,
      emailMessageHeader,
      body,
      attachments,
      inlineAttachments,
      replyingMessageId,
      forwardingMessageId,
    })
  }

  public async updateEmailMessages({
    ids,
    values,
  }: UpdateEmailMessagesInput): Promise<
    BatchOperationResult<
      UpdatedEmailMessageSuccess,
      EmailMessageOperationFailureResult
    >
  > {
    await this.ensureSignedIn()
    this.log.debug(this.provisionEmailAddress.name, { ids, values })
    const idSet = new Set(ids)
    const useCase = new UpdateEmailMessagesUseCase(
      this.emailMessageService,
      this.configurationDataService,
    )
    const useCaseResult = await useCase.execute({
      ids: idSet,
      values,
    })

    const transformer = new UpdateEmailMessagesResultTransformer()
    return transformer.fromAPItoGraphQL(useCaseResult)
  }

  public async deleteEmailMessage(
    id: string,
  ): Promise<DeleteEmailMessageSuccessResult | undefined> {
    await this.ensureSignedIn()
    const idSet = new Set([id])
    const deleteEmailMessageUseCase = new DeleteEmailMessagesUseCase(
      this.emailMessageService,
      this.configurationDataService,
      this.emailMessageBodyCache,
    )
    const { successIds } = await deleteEmailMessageUseCase.execute(idSet)
    return successIds.length === idSet.size ? { id } : undefined
  }

  public async deleteMessagesForFolderId(
    input: DeleteMessagesForFolderIdInput,
  ): Promise<string> {
    await this.ensureSignedIn()
    const deleteMessagesByFolderIdUseCase = new DeleteMessagesByFolderIdUseCase(
      this.emailFolderService,
    )
    return await deleteMessagesByFolderIdUseCase.execute({
      emailAddressId: input.emailAddressId,
      emailFolderId: input.emailFolderId,
      hardDelete: input.hardDelete,
    })
  }

  public async deleteEmailMessages(
    ids: string[],
  ): Promise<
    BatchOperationResult<
      DeleteEmailMessageSuccessResult,
      EmailMessageOperationFailureResult
    >
  > {
    await this.ensureSignedIn()
    const idSet = new Set(ids)
    const deleteEmailMessageUseCase = new DeleteEmailMessagesUseCase(
      this.emailMessageService,
      this.configurationDataService,
      this.emailMessageBodyCache,
    )

    const deleteResult = await deleteEmailMessageUseCase.execute(idSet)
    const failureValues = deleteResult.failureMessages
    const successValues: DeleteEmailMessageSuccessResult[] =
      deleteResult.successIds.map((id) => ({ id }))

    if (successValues.length === idSet.size) {
      return {
        status: BatchOperationResultStatus.Success,
        successValues,
        failureValues: [],
      }
    }
    if (failureValues.length === idSet.size) {
      return {
        status: BatchOperationResultStatus.Failure,
        failureValues,
        successValues: [],
      }
    }
    return {
      status: BatchOperationResultStatus.Partial,
      failureValues,
      successValues,
    }
  }

  public async getConfiguredEmailDomains(): Promise<string[]> {
    await this.ensureSignedIn()
    const useCase = new GetConfiguredEmailDomainsUseCase(
      this.emailDomainService,
    )
    const result = await useCase.execute()
    return result.map((domain) => domain.domain)
  }

  public async listEmailDomains(): Promise<EmailDomain[]> {
    await this.ensureSignedIn()
    const useCase = new ListEmailDomainsUseCase(this.emailDomainService)
    const transformer = new EmailDomainAPITransformer()
    const result = await useCase.execute()
    return result.map((domain) => transformer.transformEntity(domain))
  }

  public async checkEmailAddressAvailability({
    localParts,
    domains,
  }: CheckEmailAddressAvailabilityInput): Promise<string[]> {
    await this.ensureSignedIn()
    const useCase = new CheckEmailAddressAvailabilityUseCase(
      this.emailAccountService,
    )
    const domainTransformer = new EmailDomainEntityTransformer()
    let domainEntities: EmailDomainEntity[] | undefined
    if (domains) {
      domainEntities = [...domains].map((domain) =>
        domainTransformer.transformGraphQL(domain),
      )
    }
    const result = await useCase.execute({
      localParts: [...localParts],
      domains: domainEntities,
    })
    return result.map((emailAddress) => emailAddress.emailAddress)
  }

  public async getEmailAddress({
    id,
  }: GetEmailAddressInput): Promise<EmailAddress | undefined> {
    await this.ensureSignedIn()
    return await this.mutex.runExclusive(async () => {
      this.log.debug(this.getEmailAddress.name, {
        id,
      })
      const useCase = new GetEmailAccountUseCase(this.emailAccountService)
      const result = await useCase.execute({
        id,
      })
      const transformer = new EmailAddressAPITransformer()
      return result ? transformer.transformEntity(result) : undefined
    })
  }

  public async listEmailAddresses(
    input?: ListEmailAddressesInput,
  ): Promise<ListEmailAddressesResult> {
    await this.ensureSignedIn()
    return await this.mutex.runExclusive(async () => {
      this.log.debug(this.listEmailAddresses.name, { input })
      const useCase = new ListEmailAccountsUseCase(this.emailAccountService)
      const { emailAccounts, nextToken: resultNextToken } =
        await useCase.execute(input ?? {})
      const transformer = new ListEmailAddressesAPITransformer()
      const result = transformer.transform(emailAccounts, resultNextToken)
      return result
    })
  }

  public async listEmailAddressesForSudoId({
    sudoId,
    limit,
    nextToken,
  }: ListEmailAddressesForSudoIdInput): Promise<ListEmailAddressesResult> {
    await this.ensureSignedIn()
    return await this.mutex.runExclusive(async () => {
      this.log.debug(this.listEmailAddressesForSudoId.name, {
        sudoId,
        limit,
        nextToken,
      })
      const useCase = new ListEmailAccountsForSudoIdUseCase(
        this.emailAccountService,
      )
      const { emailAccounts, nextToken: resultNextToken } =
        await useCase.execute({ sudoId, limit, nextToken })
      const transformer = new ListEmailAddressesAPITransformer()
      const result = transformer.transform(emailAccounts, resultNextToken)
      return result
    })
  }

  public async lookupEmailAddressesPublicInfo({
    emailAddresses,
  }: LookupEmailAddressesPublicInfoInput): Promise<EmailAddressPublicInfo[]> {
    await this.ensureSignedIn()
    this.log.debug(this.lookupEmailAddressesPublicInfo.name, {
      emailAddresses,
    })

    const useCase = new LookupEmailAddressesPublicInfoUseCase(
      this.emailAccountService,
    )

    const result = await useCase.execute({ emailAddresses })

    return result.map((publicInfo) =>
      EmailAddressPublicInfoAPITransformer.transformEntity(publicInfo),
    )
  }

  public async listEmailFoldersForEmailAddressId({
    emailAddressId,
    limit,
    nextToken,
  }: ListEmailFoldersForEmailAddressIdInput): Promise<ListOutput<EmailFolder>> {
    await this.ensureSignedIn()
    this.log.debug(this.listEmailFoldersForEmailAddressId.name, {
      emailAddressId,
      limit,
      nextToken,
    })
    const useCase = new ListEmailFoldersForEmailAddressIdUseCase(
      this.emailFolderService,
    )
    const { folders, nextToken: resultNextToken } = await useCase.execute({
      emailAddressId,
      limit,
      nextToken,
    })

    const folderTransformer = new EmailFolderAPITransformer()
    const transformedFolders = folders.map((folder) =>
      folderTransformer.transformEntity(folder),
    )

    return { items: transformedFolders, nextToken: resultNextToken }
  }

  public async createCustomEmailFolder({
    emailAddressId,
    customFolderName,
    allowSymmetricKeyGeneration = true,
  }: CreateCustomEmailFolderInput): Promise<EmailFolder> {
    await this.ensureSignedIn()
    this.log.debug(this.createCustomEmailFolder.name, {
      emailAddressId,
      customFolderName,
    })

    const useCase = new CreateCustomEmailFolderUseCase(this.emailFolderService)
    const result = await useCase.execute({
      emailAddressId,
      customFolderName,
      allowSymmetricKeyGeneration,
    })

    const apiTransformer = new EmailFolderAPITransformer()
    return apiTransformer.transformEntity(result)
  }

  public async deleteCustomEmailFolder({
    emailFolderId,
    emailAddressId,
  }: DeleteCustomEmailFolderInput): Promise<EmailFolder | undefined> {
    await this.ensureSignedIn()
    this.log.debug(this.deleteCustomEmailFolder.name, {
      emailFolderId,
      emailAddressId,
    })

    const useCase = new DeleteCustomEmailFolderUseCase(this.emailFolderService)
    const result = await useCase.execute({ emailFolderId, emailAddressId })

    const apiTransformer = new EmailFolderAPITransformer()
    return result ? apiTransformer.transformEntity(result) : result
  }

  public async updateCustomEmailFolder({
    emailAddressId,
    emailFolderId,
    values,
    allowSymmetricKeyGeneration = true,
  }: UpdateCustomEmailFolderInput): Promise<EmailFolder> {
    await this.ensureSignedIn()
    this.log.debug(this.updateCustomEmailFolder.name, {
      emailAddressId,
      emailFolderId,
      values,
    })

    const useCase = new UpdateCustomEmailFolderUseCase(this.emailFolderService)
    const result = await useCase.execute({
      emailAddressId,
      emailFolderId,
      values,
      allowSymmetricKeyGeneration,
    })

    const apiTransformer = new EmailFolderAPITransformer()
    return apiTransformer.transformEntity(result)
  }

  public async blockEmailAddresses(
    input: BlockEmailAddressesInput,
  ): Promise<BatchOperationResult<string>> {
    await this.ensureSignedIn()
    this.log.debug(this.blockEmailAddresses.name, { input })

    const useCase = new BlockEmailAddressesUseCase(
      this.emailAddressBlocklistService,
      this.userClient,
      this.emailAccountService,
    )
    const result = await useCase.execute({
      blockedAddresses: input.addressesToBlock,
      blockLevel: input.blockLevel ?? BlockedEmailAddressLevel.ADDRESS,
      action: input.action ?? BlockedEmailAddressAction.DROP,
      emailAddressId: input.emailAddressId,
    })

    switch (result.status) {
      case UpdateBlockedAddressesStatus.Success:
        return { status: BatchOperationResultStatus.Success }
      case UpdateBlockedAddressesStatus.Failed:
        return { status: BatchOperationResultStatus.Failure }
      case UpdateBlockedAddressesStatus.Partial:
        return {
          status: BatchOperationResultStatus.Partial,
          failureValues: result.failedAddresses ?? [],
          successValues: result.successAddresses ?? [],
        }
      default:
        throw new ServiceError(`Invalid Update Status ${result.status}`)
    }
  }

  public async unblockEmailAddressesByHashedValue(
    input: UnblockEmailAddressesByHashedValueInput,
  ): Promise<BatchOperationResult<string>> {
    await this.ensureSignedIn()
    this.log.debug(this.unblockEmailAddressesByHashedValue.name, { input })

    const useCase = new UnblockEmailAddressesByHashedValueUseCase(
      this.emailAddressBlocklistService,
      this.userClient,
    )
    const result = await useCase.execute({ hashedValues: input.hashedValues })

    switch (result.status) {
      case UpdateBlockedAddressesStatus.Success:
        return { status: BatchOperationResultStatus.Success }
      case UpdateBlockedAddressesStatus.Failed:
        return { status: BatchOperationResultStatus.Failure }
      case UpdateBlockedAddressesStatus.Partial:
        return {
          status: BatchOperationResultStatus.Partial,
          failureValues: result.failedAddresses ?? [],
          successValues: result.successAddresses ?? [],
        }
      default:
        throw new ServiceError(`Invalid Update Status ${result.status}`)
    }
  }

  public async getEmailAddressBlocklist(): Promise<UnsealedBlockedAddress[]> {
    await this.ensureSignedIn()
    const useCase = new GetEmailAddressBlocklistUseCase(
      this.emailAddressBlocklistService,
      this.userClient,
    )

    return await useCase.execute()
  }

  public async createDraftEmailMessage({
    rfc822Data,
    senderEmailAddressId,
    emailAliasId,
  }: CreateDraftEmailMessageInput): Promise<DraftEmailMessageMetadata> {
    await this.ensureSignedIn()
    this.log.debug(this.createDraftEmailMessage.name, {
      rfc822Data,
      senderEmailAddressId,
      emailAliasId,
    })
    const useCase = new SaveDraftEmailMessageUseCase(
      this.emailAccountService,
      this.emailMessageService,
      this.emailDomainService,
      this.configurationDataService,
      this.emailCryptoService,
    )
    return await useCase.execute({
      rfc822Data,
      senderEmailAddressId,
      emailAliasId,
    })
  }

  public async updateDraftEmailMessage({
    id,
    rfc822Data,
    senderEmailAddressId,
    emailAliasId,
  }: UpdateDraftEmailMessageInput): Promise<DraftEmailMessageMetadata> {
    await this.ensureSignedIn()
    this.log.debug(this.updateDraftEmailMessage.name, {
      id,
      rfc822Data,
      senderEmailAddressId,
      emailAliasId,
    })
    const useCase = new UpdateDraftEmailMessageUseCase(
      this.emailAccountService,
      this.emailMessageService,
      this.emailDomainService,
      this.configurationDataService,
      this.emailCryptoService,
    )
    return await useCase.execute({
      id,
      rfc822Data,
      senderEmailAddressId,
      emailAliasId,
    })
  }

  public async deleteDraftEmailMessages({
    ids,
    emailAddressId,
    emailAliasId,
  }: DeleteDraftEmailMessagesInput): Promise<
    BatchOperationResult<
      DeleteEmailMessageSuccessResult,
      EmailMessageOperationFailureResult
    >
  > {
    await this.ensureSignedIn()
    const idSet = new Set(ids)
    const useCase = new DeleteDraftEmailMessagesUseCase(
      this.emailAccountService,
      this.emailMessageService,
    )

    const deleteResult = await useCase.execute({
      ids: idSet,
      emailAddressId,
      emailAliasId,
    })
    const failureValues = deleteResult.failureMessages
    const successValues: DeleteEmailMessageSuccessResult[] =
      deleteResult.successIds.map((id) => ({ id }))

    if (successValues.length === idSet.size) {
      return {
        status: BatchOperationResultStatus.Success,
        successValues,
        failureValues: [],
      }
    }
    if (failureValues.length === idSet.size) {
      return {
        status: BatchOperationResultStatus.Failure,
        failureValues,
        successValues: [],
      }
    }
    return {
      status: BatchOperationResultStatus.Partial,
      failureValues,
      successValues,
    }
  }

  public async getDraftEmailMessage({
    id,
    emailAddressId,
    emailAliasId,
  }: GetDraftEmailMessageInput): Promise<DraftEmailMessage | undefined> {
    await this.ensureSignedIn()
    this.log.debug(this.deleteDraftEmailMessages.name, {
      id,
      emailAddressId,
      emailAliasId,
    })
    const useCase = new GetDraftEmailMessageUseCase(this.emailMessageService)
    return await useCase.execute({
      id,
      emailAddressId,
      emailAliasId,
    })
  }

  public async listDraftEmailMessagesForEmailAddressId({
    emailAddressId,
    limit = 10,
    nextToken = undefined,
  }: ListDraftEmailMessagesForEmailAddressIdInput): Promise<
    ListOutput<DraftEmailMessage>
  > {
    await this.ensureSignedIn()
    this.log.debug(this.listDraftEmailMessagesForEmailAddressId.name, {
      emailAddressId,
      limit,
      nextToken,
    })

    const useCase = new ListDraftEmailMessagesForEmailAddressIdUseCase(
      this.emailMessageService,
    )
    const { draftMessages, nextToken: resultNextToken } = await useCase.execute(
      {
        emailAddressId,
        limit,
        nextToken,
      },
    )

    return {
      items: draftMessages,
      nextToken: resultNextToken,
    }
  }

  public async listDraftEmailMessageMetadataForEmailAddressId({
    emailAddressId,
    limit = 10,
    nextToken = undefined,
  }: ListDraftEmailMessageMetadataForEmailAddressIdInput): Promise<
    ListOutput<DraftEmailMessageMetadata>
  > {
    await this.ensureSignedIn()
    this.log.debug(this.listDraftEmailMessageMetadataForEmailAddressId.name, {
      emailAddressId,
      limit,
      nextToken,
    })

    const useCase = new ListDraftEmailMessageMetadataForEmailAddressIdUseCase(
      this.emailMessageService,
    )

    const { metadata, nextToken: resultNextToken } = await useCase.execute({
      emailAddressId,
      limit,
      nextToken,
    })

    return {
      items: metadata,
      nextToken: resultNextToken,
    }
  }

  public async scheduleSendDraftMessage({
    id,
    emailAddressId,
    emailAliasId,
    sendAt,
  }: ScheduleSendDraftMessageInput): Promise<ScheduledDraftMessage> {
    await this.ensureSignedIn()
    this.log.debug(this.scheduleSendDraftMessage.name, {
      id,
      emailAddressId,
      emailAliasId,
      sendAt,
    })

    const useCase = new ScheduleSendDraftMessageUseCase(
      this.emailAccountService,
      this.emailMessageService,
    )
    const result = await useCase.execute({
      id,
      emailAddressId,
      emailAliasId,
      sendAt,
    })
    return result
  }

  public async cancelScheduledDraftMessage({
    id,
    emailAddressId,
    emailAliasId,
  }: CancelScheduledDraftMessageInput): Promise<string> {
    await this.ensureSignedIn()
    this.log.debug(this.cancelScheduledDraftMessage.name, {
      id,
      emailAddressId,
      emailAliasId,
    })

    const useCase = new CancelScheduledDraftMessageUseCase(
      this.emailAccountService,
      this.emailMessageService,
    )
    const result = await useCase.execute({
      id,
      emailAddressId,
      emailAliasId,
    })
    return result
  }

  public async listScheduledDraftMessagesForEmailAddressId({
    emailAddressId,
    filter,
    limit,
    nextToken,
  }: ListScheduledDraftMessagesForEmailAddressIdInput): Promise<
    ListOutput<ScheduledDraftMessage>
  > {
    await this.ensureSignedIn()
    this.log.debug(this.listScheduledDraftMessagesForEmailAddressId.name, {
      emailAddressId,
      filter,
      limit,
      nextToken,
    })

    const useCase = new ListScheduledDraftMessagesForEmailAddressIdUseCase(
      this.emailAccountService,
      this.emailMessageService,
    )

    const { scheduledDraftMessages, nextToken: resultNextToken } =
      await useCase.execute({
        emailAddressId,
        filter,
        limit,
        nextToken,
      })

    return {
      items: scheduledDraftMessages,
      nextToken: resultNextToken,
    }
  }

  public async getEmailMessage({
    id,
  }: GetEmailMessageInput): Promise<EmailMessage | undefined> {
    await this.ensureSignedIn()
    this.log.debug(this.getEmailMessage.name, {
      id,
    })
    const useCase = new GetEmailMessageUseCase(this.emailMessageService)
    const result = await useCase.execute({
      id,
    })
    const transformer = new EmailMessageAPITransformer()
    return result ? transformer.transformEntity(result) : undefined
  }

  public async getEmailMessageWithBody({
    id,
    emailAddressId,
  }: GetEmailMessageWithBodyInput): Promise<EmailMessageWithBody | undefined> {
    await this.ensureSignedIn()
    this.log.debug(this.getEmailMessageWithBody.name, { id, emailAddressId })
    const getEmailMessageWithBodyUseCase = new GetEmailMessageWithBodyUseCase(
      this.emailMessageService,
    )
    return await getEmailMessageWithBodyUseCase.execute({ id, emailAddressId })
  }

  public async listEmailMessages({
    dateRange,
    limit,
    sortOrder,
    nextToken,
    includeDeletedMessages,
  }: ListEmailMessagesInput): Promise<ListEmailMessagesResult> {
    await this.ensureSignedIn()
    this.log.debug(this.listEmailMessages.name, {
      dateRange,
      limit,
      sortOrder,
      nextToken,
      includeDeletedMessages,
    })
    const useCase = new ListEmailMessagesUseCase(this.emailMessageService)
    const { emailMessages, nextToken: resultNextToken } = await useCase.execute(
      {
        dateRange,
        limit,
        sortOrder,
        nextToken,
        includeDeletedMessages,
      },
    )
    const transformer = new ListEmailMessagesAPITransformer()
    const result = transformer.transform(emailMessages, resultNextToken)
    return result
  }

  public async listEmailMessagesForEmailAddressId({
    emailAddressId,
    dateRange,
    limit,
    sortOrder,
    nextToken,
    includeDeletedMessages,
  }: ListEmailMessagesForEmailAddressIdInput): Promise<ListEmailMessagesResult> {
    await this.ensureSignedIn()
    this.log.debug(this.listEmailMessagesForEmailAddressId.name, {
      emailAddressId,
      dateRange,
      limit,
      sortOrder,
      nextToken,
      includeDeletedMessages,
    })
    const useCase = new ListEmailMessagesForEmailAddressIdUseCase(
      this.emailMessageService,
    )
    const { emailMessages, nextToken: resultNextToken } = await useCase.execute(
      {
        emailAddressId,
        dateRange,
        limit,
        sortOrder,
        nextToken,
        includeDeletedMessages,
      },
    )
    const transformer = new ListEmailMessagesAPITransformer()
    const result = transformer.transform(emailMessages, resultNextToken)
    return result
  }

  public async listEmailMessagesForEmailFolderId({
    filter,
    folderId,
    dateRange,
    limit,
    sortOrder,
    nextToken,
    includeDeletedMessages,
  }: ListEmailMessagesForEmailFolderIdInput): Promise<ListEmailMessagesResult> {
    await this.ensureSignedIn()
    this.log.debug(this.listEmailMessagesForEmailFolderId.name, {
      filter,
      folderId,
      dateRange,
      limit,
      sortOrder,
      nextToken,
      includeDeletedMessages,
    })
    const useCase = new ListEmailMessagesForEmailFolderIdUseCase(
      this.emailMessageService,
    )
    const { emailMessages, nextToken: resultNextToken } = await useCase.execute(
      {
        filter,
        folderId,
        dateRange,
        limit,
        sortOrder,
        nextToken,
        includeDeletedMessages,
      },
    )
    const transformer = new ListEmailMessagesAPITransformer()
    const result = transformer.transform(emailMessages, resultNextToken)
    return result
  }

  public async provisionEmailAlias({
    aliasAddress,
    realAddress,
    ownershipProofToken,
    expiresAt,
    metadata,
  }: ProvisionEmailAliasInput): Promise<EmailAlias> {
    await this.ensureSignedIn()
    this.log.debug(this.provisionEmailAlias.name, {
      aliasAddress,
      realAddress,
      ownershipProofToken,
      expiresAt,
      metadata,
    })

    const useCase = new ProvisionEmailAliasUseCase(this.emailAliasService)
    const result = await useCase.execute({
      aliasAddress,
      realAddress,
      ownershipProofToken,
      expiresAt,
      metadata,
    })

    return EmailAliasTransformer.entityToApi(result)
  }

  public async deprovisionEmailAlias(
    input: DeprovisionEmailAliasInput,
  ): Promise<EmailAlias> {
    await this.ensureSignedIn()
    this.log.debug(this.deprovisionEmailAlias.name, { input })

    const useCase = new DeprovisionEmailAliasUseCase(this.emailAliasService)
    const result = await useCase.execute({
      emailAliasId: input.emailAliasId,
    })

    return EmailAliasTransformer.entityToApi(result)
  }

  public async updateEmailAlias(
    input: UpdateEmailAliasInput,
  ): Promise<EmailAlias> {
    await this.ensureSignedIn()
    this.log.debug(this.updateEmailAlias.name, { input })

    const useCase = new UpdateEmailAliasUseCase(this.emailAliasService)
    const result = await useCase.execute({
      emailAliasId: input.emailAliasId,
      metadata: input.metadata,
      expiresAt: input.expiresAt,
      realAddress: input.realAddress,
    })

    return EmailAliasTransformer.entityToApi(result)
  }

  public async enableEmailAlias(
    input: EnableEmailAliasInput,
  ): Promise<EmailAlias> {
    await this.ensureSignedIn()
    this.log.debug(this.enableEmailAlias.name, { input })

    const useCase = new EnableEmailAliasUseCase(this.emailAliasService)
    const result = await useCase.execute({
      emailAliasId: input.emailAliasId,
    })

    return EmailAliasTransformer.entityToApi(result)
  }

  public async disableEmailAlias(
    input: DisableEmailAliasInput,
  ): Promise<EmailAlias> {
    await this.ensureSignedIn()
    this.log.debug(this.disableEmailAlias.name, { input })

    const useCase = new DisableEmailAliasUseCase(this.emailAliasService)
    const result = await useCase.execute({
      emailAliasId: input.emailAliasId,
    })

    return EmailAliasTransformer.entityToApi(result)
  }

  public async listEmailAliasesForOwner(
    input?: ListEmailAliasesForOwnerInput,
  ): Promise<ListOutput<EmailAlias>> {
    await this.ensureSignedIn()
    this.log.debug(this.listEmailAliasesForOwner.name, { input })

    const useCase = new ListEmailAliasesForOwnerUseCase(this.emailAliasService)

    const result = await useCase.execute({
      filter: input?.filter
        ? EmailAliasFilterTransformer.apiToEntity(input.filter)
        : undefined,
      limit: input?.limit,
      nextToken: input?.nextToken,
    })

    const emailAliases = await Promise.all(
      result.emailAliases.map(async (entity) =>
        EmailAliasTransformer.entityToApi(entity),
      ),
    )

    return {
      items: emailAliases,
      nextToken: result.nextToken,
    }
  }

  public async verifyExternalEmailAddress(
    input: VerifyExternalEmailAddressInput,
  ): Promise<VerifyExternalEmailAddressResult | undefined> {
    await this.ensureSignedIn()
    this.log.debug(this.verifyExternalEmailAddress.name, { input })
    const useCase = new VerifyExternalEmailAddressUseCase(
      this.emailAliasService,
    )
    return useCase.execute({
      emailAddress: input.emailAddress,
      emailAliasId: input.emailAliasId ?? '',
      verificationCode: input.verificationCode,
    })
  }

  public async subscribeToEmailMessages(
    subscriptionId: string,
    subscriber: EmailMessageSubscriber,
  ): Promise<void> {
    const useCase = new SubscribeToEmailMessagesUseCase(
      this.emailMessageService,
      this.userClient,
    )
    await useCase.execute({ subscriptionId, subscriber })
  }

  public unsubscribeFromEmailMessages(subscriptionId: string): void {
    const useCase = new UnsubscribeFromEmailMessagesUseCase(
      this.emailMessageService,
    )
    useCase.execute({ subscriptionId })
  }

  public async exportKeys(): Promise<ArrayBuffer> {
    const keyArchive = new DefaultSudoKeyArchive(this.keyManager, {
      excludedKeyTypes: new Set([KeyArchiveKeyType.PublicKey]),
    })
    await keyArchive.loadKeys()
    return await keyArchive.archive(undefined)
  }

  public async importKeys(archiveData: ArrayBuffer): Promise<void> {
    if (archiveData.byteLength === 0) {
      throw new InvalidArgumentError()
    }
    const unarchiver = new DefaultSudoKeyArchive(this.keyManager, {
      archiveData,
    })
    await unarchiver.unarchive(undefined)
    await unarchiver.saveKeys()
  }

  public async reset(): Promise<void> {
    await this.keyManager.removeAllKeys()
    await this.emailMessageBodyCache.flushAll()
  }

  public async flushMessageBodyCache(
    input: FlushMessageBodyCacheInput,
  ): Promise<void> {
    await this.emailMessageBodyCache.flush(input)
  }

  public async setCacheSizeLimit(bytes: number): Promise<void> {
    await this.emailMessageBodyCache.setCacheSizeLimit(bytes)
  }

  /**
   * Checks if user is signed in and invokes callback if needed.
   * Only performs check if callback is configured.
   *
   * Throws: Any error thrown by the sign-in callback
   */
  private async ensureSignedIn(): Promise<void> {
    await this.signInGuard.ensureSignedIn()
  }
}
