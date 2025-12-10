/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CachePolicy,
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
  SudoUserClient,
  internal as SudoUserInternal,
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
import { DefaultEmailFolderService } from '../private/data/folder/defaultEmailFolderService'
import { EmailFolderAPITransformer } from '../private/data/folder/transformer/emailFolderAPITransformer'
import { DefaultEmailMaskService } from '../private/data/mask/defaultEmailMaskService'
import { EmailMaskFilterTransformer } from '../private/data/mask/transformer/emailMaskFilterTransformer'
import { EmailMaskTransformer } from '../private/data/mask/transformer/emailMaskTransformer'
import { DefaultEmailMessageService } from '../private/data/message/defaultEmailMessageService'
import { EmailMessageAPITransformer } from '../private/data/message/transformer/emailMessageAPITransformer'
import { ListEmailMessagesAPITransformer } from '../private/data/message/transformer/listEmailMessagesAPITransformer'
import { UpdateEmailMessagesResultTransformer } from '../private/data/message/transformer/updateEmailMessagesResultTransformer'
import { DefaultEmailCryptoService } from '../private/data/secure/defaultEmailCryptoService'
import { EmailDomainEntity } from '../private/domain/entities/emailDomain/emailDomainEntity'
import { UpdateEmailMessagesStatus } from '../private/domain/entities/message/updateEmailMessagesStatus'
import { EmailMaskService } from '../private/domain/entities/mask/emailMaskService'
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
import { UnblockEmailAddressesUseCase } from '../private/domain/use-cases/blocklist/unblockEmailAddresses'
import { UnblockEmailAddressesByHashedValueUseCase } from '../private/domain/use-cases/blocklist/unblockEmailAddressesByHashedValue'
import { GetConfigurationDataUseCase } from '../private/domain/use-cases/configuration/getConfigurationDataUseCase'
import { CancelScheduledDraftMessageUseCase } from '../private/domain/use-cases/draft/cancelScheduledDraftMessageUseCase'
import { DeleteDraftEmailMessagesUseCase } from '../private/domain/use-cases/draft/deleteDraftEmailMessagesUseCase'
import { GetDraftEmailMessageUseCase } from '../private/domain/use-cases/draft/getDraftEmailMessageUseCase'
import { ListDraftEmailMessageMetadataForEmailAddressIdUseCase } from '../private/domain/use-cases/draft/listDraftEmailMessageMetadataForEmailAddressIdUseCase'
import { ListDraftEmailMessageMetadataUseCase } from '../private/domain/use-cases/draft/listDraftEmailMessageMetadataUseCase'
import { ListDraftEmailMessagesForEmailAddressIdUseCase } from '../private/domain/use-cases/draft/listDraftEmailMessagesForEmailAddressIdUseCase'
import { ListDraftEmailMessagesUseCase } from '../private/domain/use-cases/draft/listDraftEmailMessagesUseCase'
import { ListScheduledDraftMessagesForEmailAddressIdUseCase } from '../private/domain/use-cases/draft/listScheduledDraftMessagesForEmailAddressIdUseCase'
import { SaveDraftEmailMessageUseCase } from '../private/domain/use-cases/draft/saveDraftEmailMessageUseCase'
import { ScheduleSendDraftMessageUseCase } from '../private/domain/use-cases/draft/scheduleSendDraftMessageUseCase'
import { UpdateDraftEmailMessageUseCase } from '../private/domain/use-cases/draft/updateDraftEmailMessageUseCase'
import { GetConfiguredEmailDomainsUseCase } from '../private/domain/use-cases/emailDomain/getConfiguredEmailDomainsUseCase'
import { GetEmailMaskDomainsUseCase } from '../private/domain/use-cases/emailDomain/getEmailMaskDomainsUseCase'
import { GetSupportedEmailDomainsUseCase } from '../private/domain/use-cases/emailDomain/getSupportedEmailDomainsUseCase'
import { CreateCustomEmailFolderUseCase } from '../private/domain/use-cases/folder/createCustomEmailFolderUseCase'
import { DeleteCustomEmailFolderUseCase } from '../private/domain/use-cases/folder/deleteCustomEmailFolderUseCase'
import { DeleteMessagesByFolderIdUseCase } from '../private/domain/use-cases/folder/deleteMessagesByFolderIdUseCase'
import { ListEmailFoldersForEmailAddressIdUseCase } from '../private/domain/use-cases/folder/listEmailFoldersForEmailAddressIdUseCase'
import { UpdateCustomEmailFolderUseCase } from '../private/domain/use-cases/folder/updateCustomEmailFolderUseCase'
import { DeprovisionEmailMaskUseCase } from '../private/domain/use-cases/mask/deprovisionEmailMaskUseCase'
import { DisableEmailMaskUseCase } from '../private/domain/use-cases/mask/disableEmailMaskUseCase'
import { EnableEmailMaskUseCase } from '../private/domain/use-cases/mask/enableEmailMaskUseCase'
import { ListEmailMasksForOwnerUseCase } from '../private/domain/use-cases/mask/listEmailMasksForOwnerUseCase'
import { ProvisionEmailMaskUseCase } from '../private/domain/use-cases/mask/provisionEmailMaskUseCase'
import { UpdateEmailMaskUseCase } from '../private/domain/use-cases/mask/updateEmailMaskUseCase'
import { DeleteEmailMessagesUseCase } from '../private/domain/use-cases/message/deleteEmailMessagesUseCase'
import { GetEmailMessageRfc822DataUseCase } from '../private/domain/use-cases/message/getEmailMessageRfc822DataUseCase'
import { GetEmailMessageUseCase } from '../private/domain/use-cases/message/getEmailMessageUseCase'
import { GetEmailMessageWithBodyUseCase } from '../private/domain/use-cases/message/getEmailMessageWithBodyUseCase'
import { ListEmailMessagesForEmailAddressIdUseCase } from '../private/domain/use-cases/message/listEmailMessagesForEmailAddressIdUseCase'
import { ListEmailMessagesForEmailFolderIdUseCase } from '../private/domain/use-cases/message/listEmailMessagesForEmailFolderIdUseCase'
import { ListEmailMessagesUseCase } from '../private/domain/use-cases/message/listEmailMessagesUseCase'
import { SendEmailMessageUseCase } from '../private/domain/use-cases/message/sendEmailMessageUseCase'
import { SubscribeToEmailMessagesUseCase } from '../private/domain/use-cases/message/subscribeToEmailMessagesUseCase'
import { UnsubscribeFromEmailMessagesUseCase } from '../private/domain/use-cases/message/unsubscribeFromEmailMessagesUseCase'
import { UpdateEmailMessagesUseCase } from '../private/domain/use-cases/message/updateEmailMessagesUseCase'
import { InvalidArgumentError } from './errors'
import {
  BlockEmailAddressesInput,
  UnblockEmailAddressesByHashedValueInput,
  UnblockEmailAddressesInput,
} from './inputs/blockedAddresses'
import {
  CancelScheduledDraftMessageInput,
  CreateDraftEmailMessageInput,
  DeleteDraftEmailMessagesInput,
  GetDraftEmailMessageInput,
  ListDraftEmailMessageMetadataForEmailAddressIdInput,
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
  DeprovisionEmailMaskInput,
  DisableEmailMaskInput,
  EnableEmailMaskInput,
  ListEmailMasksForOwnerInput,
  ProvisionEmailMaskInput,
  UpdateEmailMaskInput,
} from './inputs/emailMask'
import {
  GetEmailMessageInput,
  GetEmailMessageRfc822DataInput,
  GetEmailMessageWithBodyInput,
  ListEmailMessagesForEmailAddressIdInput,
  ListEmailMessagesForEmailFolderIdInput,
  ListEmailMessagesInput,
  SendEmailMessageInput,
  SendMaskedEmailMessageInput,
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
import { EmailMask } from './typings/emailMask'
import {
  EmailMessage,
  EmailMessageSubscriber,
  SendEmailMessageResult,
} from './typings/emailMessage'
import { EmailMessageRfc822Data } from './typings/emailMessageRfc822Data'
import { EmailMessageWithBody } from './typings/emailMessageWithBody'
import {
  ListEmailAddressesResult,
  ListEmailMessagesResult,
} from './typings/listOperationResult'
import { EmailAddressBlocklistService } from '../private/domain/entities/blocklist/emailAddressBlocklistService'
import { EmailCryptoService } from '../private/domain/entities/secure/emailCryptoService'

export class DefaultSudoEmailClient implements SudoEmailClient {
  private readonly apiClient: ApiClient
  private readonly userClient: SudoUserClient
  private readonly configurationDataService: DefaultConfigurationDataService
  private readonly emailAccountService: DefaultEmailAccountService
  private readonly emailDomainService: DefaultEmailDomainService
  private readonly emailFolderService: DefaultEmailFolderService
  private readonly emailMessageService: DefaultEmailMessageService
  private readonly emailAddressBlocklistService: EmailAddressBlocklistService
  private readonly emailMaskService: EmailMaskService
  private readonly emailCryptoService: EmailCryptoService
  private readonly sudoCryptoProvider: SudoCryptoProvider
  private readonly keyManager: SudoKeyManager
  private readonly identityServiceConfig: SudoUserInternal.IdentityServiceConfig
  private readonly emailServiceConfig: EmailServiceConfig
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
    this.emailMessageService = new DefaultEmailMessageService(
      this.apiClient,
      this.userClient,
      s3Client,
      deviceKeyWorker,
      this.emailServiceConfig,
      this.emailCryptoService,
    )
    this.emailAddressBlocklistService = new DefaultEmailAddressBlocklistService(
      this.apiClient,
      deviceKeyWorker,
    )
    this.emailMaskService = new DefaultEmailMaskService(
      this.apiClient,
      deviceKeyWorker,
    )
  }

  public async getConfigurationData(): Promise<ConfigurationData> {
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
    alias,
    allowSymmetricKeyGeneration = true,
  }: ProvisionEmailAddressInput): Promise<EmailAddress> {
    return await this.mutex.runExclusive(async () => {
      const useCase = new ProvisionEmailAccountUseCase(this.emailAccountService)
      const entityTransformer = new EmailAddressEntityTransformer()
      const emailAddressEntity = entityTransformer.transform(
        emailAddress,
        alias,
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
    return await this.mutex.runExclusive(async () => {
      const useCase = new DeprovisionEmailAccountUseCase(
        this.emailAccountService,
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
    const updateEmailAddressMetadataUseCase =
      new UpdateEmailAccountMetadataUseCase(this.emailAccountService)
    return await updateEmailAddressMetadataUseCase.execute({
      id,
      values,
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

  public async sendMaskedEmailMessage({
    senderEmailMaskId,
    emailMessageHeader,
    body,
    attachments,
    inlineAttachments,
    replyingMessageId,
    forwardingMessageId,
  }: SendMaskedEmailMessageInput): Promise<SendEmailMessageResult> {
    const sendEmailMessageUseCase = new SendEmailMessageUseCase(
      this.emailMessageService,
      this.emailAccountService,
      this.emailDomainService,
      this.configurationDataService,
    )
    return await sendEmailMessageUseCase.execute({
      senderEmailMaskId,
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
    const idSet = new Set([id])
    const deleteEmailMessageUseCase = new DeleteEmailMessagesUseCase(
      this.emailMessageService,
      this.configurationDataService,
    )
    const { successIds } = await deleteEmailMessageUseCase.execute(idSet)
    return successIds.length === idSet.size ? { id } : undefined
  }

  public async deleteMessagesForFolderId(
    input: DeleteMessagesForFolderIdInput,
  ): Promise<string> {
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
    const idSet = new Set(ids)
    const deleteEmailMessageUseCase = new DeleteEmailMessagesUseCase(
      this.emailMessageService,
      this.configurationDataService,
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

  public async getSupportedEmailDomains(
    cachePolicy: CachePolicy,
  ): Promise<string[]> {
    const useCase = new GetSupportedEmailDomainsUseCase(this.emailDomainService)
    const result = await useCase.execute(cachePolicy)
    return result.map((domain) => domain.domain)
  }

  public async getConfiguredEmailDomains(
    cachePolicy: CachePolicy,
  ): Promise<string[]> {
    const useCase = new GetConfiguredEmailDomainsUseCase(
      this.emailDomainService,
    )
    const result = await useCase.execute(cachePolicy)
    return result.map((domain) => domain.domain)
  }

  public async getEmailMaskDomains(
    cachePolicy: CachePolicy = CachePolicy.RemoteOnly,
  ): Promise<string[]> {
    const useCase = new GetEmailMaskDomainsUseCase(this.emailDomainService)
    const result = await useCase.execute(cachePolicy)
    return result.map((domain) => domain.domain)
  }

  public async checkEmailAddressAvailability({
    localParts,
    domains,
  }: CheckEmailAddressAvailabilityInput): Promise<string[]> {
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
    cachePolicy,
  }: GetEmailAddressInput): Promise<EmailAddress | undefined> {
    return await this.mutex.runExclusive(async () => {
      this.log.debug(this.getEmailAddress.name, {
        id,
        cachePolicy,
      })
      const useCase = new GetEmailAccountUseCase(this.emailAccountService)
      const result = await useCase.execute({
        id,
        cachePolicy,
      })
      const transformer = new EmailAddressAPITransformer()
      return result ? transformer.transformEntity(result) : undefined
    })
  }

  public async listEmailAddresses(
    input?: ListEmailAddressesInput,
  ): Promise<ListEmailAddressesResult> {
    return await this.mutex.runExclusive(async () => {
      this.log.debug(this.listEmailAddresses.name, { input })
      const useCase = new ListEmailAccountsUseCase(this.emailAccountService)
      const { emailAccounts, nextToken: resultNextToken } =
        await useCase.execute(input)
      const transformer = new ListEmailAddressesAPITransformer()
      const result = transformer.transform(emailAccounts, resultNextToken)
      return result
    })
  }

  public async listEmailAddressesForSudoId({
    sudoId,
    cachePolicy,
    limit,
    nextToken,
  }: ListEmailAddressesForSudoIdInput): Promise<ListEmailAddressesResult> {
    return await this.mutex.runExclusive(async () => {
      this.log.debug(this.listEmailAddressesForSudoId.name, {
        sudoId,
        cachePolicy,
        limit,
        nextToken,
      })
      const useCase = new ListEmailAccountsForSudoIdUseCase(
        this.emailAccountService,
      )
      const { emailAccounts, nextToken: resultNextToken } =
        await useCase.execute({ sudoId, cachePolicy, limit, nextToken })
      const transformer = new ListEmailAddressesAPITransformer()
      const result = transformer.transform(emailAccounts, resultNextToken)
      return result
    })
  }

  public async lookupEmailAddressesPublicInfo({
    emailAddresses,
  }: LookupEmailAddressesPublicInfoInput): Promise<EmailAddressPublicInfo[]> {
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
    cachePolicy,
    limit,
    nextToken,
  }: ListEmailFoldersForEmailAddressIdInput): Promise<ListOutput<EmailFolder>> {
    this.log.debug(this.listEmailFoldersForEmailAddressId.name, {
      emailAddressId,
      cachePolicy,
      limit,
      nextToken,
    })
    const useCase = new ListEmailFoldersForEmailAddressIdUseCase(
      this.emailFolderService,
    )
    const { folders, nextToken: resultNextToken } = await useCase.execute({
      emailAddressId,
      cachePolicy,
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
      case UpdateEmailMessagesStatus.Success:
        return { status: BatchOperationResultStatus.Success }
      case UpdateEmailMessagesStatus.Failed:
        return { status: BatchOperationResultStatus.Failure }
      case UpdateEmailMessagesStatus.Partial:
        return {
          status: BatchOperationResultStatus.Partial,
          failureValues: result.failedAddresses ?? [],
          successValues: result.successAddresses ?? [],
        }
      default:
        throw new ServiceError(`Invalid Update Status ${result.status}`)
    }
  }

  public async unblockEmailAddresses(
    input: UnblockEmailAddressesInput,
  ): Promise<BatchOperationResult<string>> {
    this.log.debug(this.unblockEmailAddresses.name, { input })

    const useCase = new UnblockEmailAddressesUseCase(
      this.emailAddressBlocklistService,
      this.userClient,
    )
    const result = await useCase.execute({
      unblockedAddresses: input.addresses,
    })

    switch (result.status) {
      case UpdateEmailMessagesStatus.Success:
        return { status: BatchOperationResultStatus.Success }
      case UpdateEmailMessagesStatus.Failed:
        return { status: BatchOperationResultStatus.Failure }
      case UpdateEmailMessagesStatus.Partial:
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
    this.log.debug(this.unblockEmailAddressesByHashedValue.name, { input })

    const useCase = new UnblockEmailAddressesByHashedValueUseCase(
      this.emailAddressBlocklistService,
      this.userClient,
    )
    const result = await useCase.execute({ hashedValues: input.hashedValues })

    switch (result.status) {
      case UpdateEmailMessagesStatus.Success:
        return { status: BatchOperationResultStatus.Success }
      case UpdateEmailMessagesStatus.Failed:
        return { status: BatchOperationResultStatus.Failure }
      case UpdateEmailMessagesStatus.Partial:
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
    const useCase = new GetEmailAddressBlocklistUseCase(
      this.emailAddressBlocklistService,
      this.userClient,
    )

    return await useCase.execute()
  }

  public async createDraftEmailMessage({
    rfc822Data,
    senderEmailAddressId,
  }: CreateDraftEmailMessageInput): Promise<DraftEmailMessageMetadata> {
    this.log.debug(this.createDraftEmailMessage.name, {
      rfc822Data,
      senderEmailAddressId,
    })
    const useCase = new SaveDraftEmailMessageUseCase(
      this.emailAccountService,
      this.emailMessageService,
      this.emailDomainService,
      this.configurationDataService,
      this.emailCryptoService,
    )
    return await useCase.execute({ rfc822Data, senderEmailAddressId })
  }

  public async updateDraftEmailMessage({
    id,
    rfc822Data,
    senderEmailAddressId,
  }: UpdateDraftEmailMessageInput): Promise<DraftEmailMessageMetadata> {
    this.log.debug(this.updateDraftEmailMessage.name, {
      id,
      rfc822Data,
      senderEmailAddressId,
    })
    const useCase = new UpdateDraftEmailMessageUseCase(
      this.emailAccountService,
      this.emailMessageService,
      this.emailDomainService,
      this.configurationDataService,
      this.emailCryptoService,
    )
    return await useCase.execute({ id, rfc822Data, senderEmailAddressId })
  }

  public async deleteDraftEmailMessages({
    ids,
    emailAddressId,
  }: DeleteDraftEmailMessagesInput): Promise<
    BatchOperationResult<
      DeleteEmailMessageSuccessResult,
      EmailMessageOperationFailureResult
    >
  > {
    const idSet = new Set(ids)
    const useCase = new DeleteDraftEmailMessagesUseCase(
      this.emailAccountService,
      this.emailMessageService,
    )

    const deleteResult = await useCase.execute({
      ids: idSet,
      emailAddressId,
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
  }: GetDraftEmailMessageInput): Promise<DraftEmailMessage | undefined> {
    this.log.debug(this.deleteDraftEmailMessages.name, { id })
    const useCase = new GetDraftEmailMessageUseCase(this.emailMessageService)
    return await useCase.execute({ id, emailAddressId })
  }

  public async listDraftEmailMessages(): Promise<DraftEmailMessage[]> {
    this.log.debug(this.listDraftEmailMessages.name)

    const useCase = new ListDraftEmailMessagesUseCase(
      this.emailAccountService,
      this.emailMessageService,
    )
    const { draftMessages } = await useCase.execute()

    return draftMessages
  }

  public async listDraftEmailMessagesForEmailAddressId(
    emailAddressId: string,
  ): Promise<DraftEmailMessage[]> {
    this.log.debug(this.listDraftEmailMessagesForEmailAddressId.name, {
      emailAddressId,
    })

    const useCase = new ListDraftEmailMessagesForEmailAddressIdUseCase(
      this.emailMessageService,
    )
    const { draftMessages } = await useCase.execute({ emailAddressId })

    return draftMessages
  }

  /**
   * @deprecated The method should not be used. Instead use listDraftEmailMessageMetadataForEmailAddressId.
   */
  public async listDraftEmailMessageMetadata(): Promise<
    DraftEmailMessageMetadata[]
  > {
    this.log.debug(this.listDraftEmailMessageMetadata.name)

    const useCase = new ListDraftEmailMessageMetadataUseCase(
      this.emailAccountService,
      this.emailMessageService,
    )
    const { metadata } = await useCase.execute()

    return metadata
  }

  public async listDraftEmailMessageMetadataForEmailAddressId({
    emailAddressId,
    limit = 10,
    nextToken = undefined,
  }: ListDraftEmailMessageMetadataForEmailAddressIdInput): Promise<
    ListOutput<DraftEmailMessageMetadata>
  > {
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
    sendAt,
  }: ScheduleSendDraftMessageInput): Promise<ScheduledDraftMessage> {
    this.log.debug(this.scheduleSendDraftMessage.name, {
      id,
      emailAddressId,
      sendAt,
    })

    const useCase = new ScheduleSendDraftMessageUseCase(
      this.emailAccountService,
      this.emailMessageService,
    )
    const result = await useCase.execute({
      id,
      emailAddressId,
      sendAt,
    })
    return result
  }

  public async cancelScheduledDraftMessage({
    id,
    emailAddressId,
  }: CancelScheduledDraftMessageInput): Promise<string> {
    this.log.debug(this.cancelScheduledDraftMessage.name, {
      id,
      emailAddressId,
    })

    const useCase = new CancelScheduledDraftMessageUseCase(
      this.emailAccountService,
      this.emailMessageService,
    )
    const result = await useCase.execute({ id, emailAddressId })
    return result
  }

  public async listScheduledDraftMessagesForEmailAddressId({
    emailAddressId,
    filter,
    limit,
    nextToken,
    cachePolicy,
  }: ListScheduledDraftMessagesForEmailAddressIdInput): Promise<
    ListOutput<ScheduledDraftMessage>
  > {
    this.log.debug(this.listScheduledDraftMessagesForEmailAddressId.name, {
      emailAddressId,
      filter,
      limit,
      nextToken,
      cachePolicy,
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
        cachePolicy,
      })

    return {
      items: scheduledDraftMessages,
      nextToken: resultNextToken,
    }
  }

  public async getEmailMessage({
    id,
    cachePolicy,
  }: GetEmailMessageInput): Promise<EmailMessage | undefined> {
    this.log.debug(this.getEmailMessage.name, {
      id,
      cachePolicy,
    })
    const useCase = new GetEmailMessageUseCase(this.emailMessageService)
    const result = await useCase.execute({
      id,
      cachePolicy,
    })
    const transformer = new EmailMessageAPITransformer()
    return result ? transformer.transformEntity(result) : undefined
  }

  public async getEmailMessageWithBody({
    id,
    emailAddressId,
  }: GetEmailMessageWithBodyInput): Promise<EmailMessageWithBody | undefined> {
    this.log.debug(this.getEmailMessageWithBody.name, { id, emailAddressId })
    const getEmailMessageWithBodyUseCase = new GetEmailMessageWithBodyUseCase(
      this.emailMessageService,
    )
    return await getEmailMessageWithBodyUseCase.execute({ id, emailAddressId })
  }

  public async getEmailMessageRfc822Data({
    id,
    emailAddressId,
  }: GetEmailMessageRfc822DataInput): Promise<
    EmailMessageRfc822Data | undefined
  > {
    const getEmailMessageRfc822DataUseCase =
      new GetEmailMessageRfc822DataUseCase(this.emailMessageService)
    return await getEmailMessageRfc822DataUseCase.execute({
      id,
      emailAddressId,
    })
  }

  public async listEmailMessages({
    dateRange,
    cachePolicy,
    limit,
    sortOrder,
    nextToken,
    includeDeletedMessages,
  }: ListEmailMessagesInput): Promise<ListEmailMessagesResult> {
    this.log.debug(this.listEmailMessages.name, {
      dateRange,
      cachePolicy,
      limit,
      sortOrder,
      nextToken,
      includeDeletedMessages,
    })
    const useCase = new ListEmailMessagesUseCase(this.emailMessageService)
    const { emailMessages, nextToken: resultNextToken } = await useCase.execute(
      {
        dateRange,
        cachePolicy,
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
    cachePolicy,
    limit,
    sortOrder,
    nextToken,
    includeDeletedMessages,
  }: ListEmailMessagesForEmailAddressIdInput): Promise<ListEmailMessagesResult> {
    this.log.debug(this.listEmailMessagesForEmailAddressId.name, {
      emailAddressId,
      dateRange,
      cachePolicy,
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
        cachePolicy,
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
    folderId,
    dateRange,
    cachePolicy,
    limit,
    sortOrder,
    nextToken,
    includeDeletedMessages,
  }: ListEmailMessagesForEmailFolderIdInput): Promise<ListEmailMessagesResult> {
    this.log.debug(this.listEmailMessagesForEmailFolderId.name, {
      folderId,
      dateRange,
      cachePolicy,
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
        folderId,
        dateRange,
        cachePolicy,
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

  public async provisionEmailMask({
    maskAddress,
    realAddress,
    ownershipProofToken,
    expiresAt,
    metadata,
  }: ProvisionEmailMaskInput): Promise<EmailMask> {
    this.log.debug(this.provisionEmailMask.name, {
      maskAddress,
      realAddress,
      ownershipProofToken,
      expiresAt,
      metadata,
    })

    const useCase = new ProvisionEmailMaskUseCase(this.emailMaskService)
    const result = await useCase.execute({
      maskAddress,
      realAddress,
      ownershipProofToken,
      expiresAt,
      metadata,
    })

    return EmailMaskTransformer.entityToApi(result)
  }

  public async deprovisionEmailMask(
    input: DeprovisionEmailMaskInput,
  ): Promise<EmailMask> {
    this.log.debug(this.deprovisionEmailMask.name, { input })

    const useCase = new DeprovisionEmailMaskUseCase(this.emailMaskService)
    const result = await useCase.execute({
      emailMaskId: input.emailMaskId,
    })

    return EmailMaskTransformer.entityToApi(result)
  }

  public async updateEmailMask(
    input: UpdateEmailMaskInput,
  ): Promise<EmailMask> {
    this.log.debug(this.updateEmailMask.name, { input })

    const useCase = new UpdateEmailMaskUseCase(this.emailMaskService)
    const result = await useCase.execute({
      emailMaskId: input.emailMaskId,
      metadata: input.metadata,
      expiresAt: input.expiresAt,
    })

    return EmailMaskTransformer.entityToApi(result)
  }

  public async enableEmailMask(
    input: EnableEmailMaskInput,
  ): Promise<EmailMask> {
    this.log.debug(this.enableEmailMask.name, { input })

    const useCase = new EnableEmailMaskUseCase(this.emailMaskService)
    const result = await useCase.execute({
      emailMaskId: input.emailMaskId,
    })

    return EmailMaskTransformer.entityToApi(result)
  }

  public async disableEmailMask(
    input: DisableEmailMaskInput,
  ): Promise<EmailMask> {
    this.log.debug(this.disableEmailMask.name, { input })

    const useCase = new DisableEmailMaskUseCase(this.emailMaskService)
    const result = await useCase.execute({
      emailMaskId: input.emailMaskId,
    })

    return EmailMaskTransformer.entityToApi(result)
  }

  public async listEmailMasksForOwner(
    input?: ListEmailMasksForOwnerInput,
  ): Promise<ListOutput<EmailMask>> {
    this.log.debug(this.listEmailMasksForOwner.name, { input })

    const useCase = new ListEmailMasksForOwnerUseCase(this.emailMaskService)

    const result = await useCase.execute({
      filter: input?.filter
        ? EmailMaskFilterTransformer.apiToEntity(input.filter)
        : undefined,
      limit: input?.limit,
      nextToken: input?.nextToken,
    })

    const emailMasks = await Promise.all(
      result.emailMasks.map(async (entity) =>
        EmailMaskTransformer.entityToApi(entity),
      ),
    )

    return {
      items: emailMasks,
      nextToken: result.nextToken,
    }
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
  }
}
