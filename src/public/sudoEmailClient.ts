/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
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
import { EmailAddressPublicInfoTransformer } from '../private/data/account/transformer/emailAddressPublicInfoTransformer'
import { EmailDomainEntityTransformer } from '../private/data/account/transformer/emailDomainEntityTransformer'
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
import { DefaultEmailFolderService } from '../private/data/folder/defaultEmailFolderService'
import { EmailFolderAPITransformer } from '../private/data/folder/transformer/emailFolderAPITransformer'
import { DefaultEmailMessageService } from '../private/data/message/defaultEmailMessageService'
import { EmailMessageAPITransformer } from '../private/data/message/transformer/emailMessageAPITransformer'
import { ListEmailMessagesAPITransformer } from '../private/data/message/transformer/listEmailMessagesAPITransformer'
import { EmailDomainEntity } from '../private/domain/entities/account/emailDomainEntity'
import { EmailAddressBlocklistService } from '../private/domain/entities/blocklist/emailAddressBlocklistService'
import { UpdateEmailMessagesStatus } from '../private/domain/entities/message/updateEmailMessagesStatus'
import { CheckEmailAddressAvailabilityUseCase } from '../private/domain/use-cases/account/checkEmailAddressAvailabilityUseCase'
import { DeprovisionEmailAccountUseCase } from '../private/domain/use-cases/account/deprovisionEmailAccountUseCase'
import { GetEmailAccountUseCase } from '../private/domain/use-cases/account/getEmailAccountUseCase'
import { GetSupportedEmailDomainsUseCase } from '../private/domain/use-cases/account/getSupportedEmailDomainsUseCase'
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
import { DeleteDraftEmailMessagesUseCase } from '../private/domain/use-cases/draft/deleteDraftEmailMessagesUseCase'
import { GetDraftEmailMessageUseCase } from '../private/domain/use-cases/draft/getDraftEmailMessageUseCase'
import { ListDraftEmailMessageMetadataUseCase } from '../private/domain/use-cases/draft/listDraftEmailMessageMetadataUseCase'
import { SaveDraftEmailMessageUseCase } from '../private/domain/use-cases/draft/saveDraftEmailMessageUseCase'
import { UpdateDraftEmailMessageUseCase } from '../private/domain/use-cases/draft/updateDraftEmailMessageUseCase'
import { CreateCustomEmailFolderUseCase } from '../private/domain/use-cases/folder/createCustomEmailFolderUseCase'
import { ListEmailFoldersForEmailAddressIdUseCase } from '../private/domain/use-cases/folder/listEmailFoldersForEmailAddressIdUseCase'
import { DeleteEmailMessagesUseCase } from '../private/domain/use-cases/message/deleteEmailMessagesUseCase'
import { GetEmailMessageRfc822DataUseCase } from '../private/domain/use-cases/message/getEmailMessageRfc822DataUseCase'
import { GetEmailMessageUseCase } from '../private/domain/use-cases/message/getEmailMessageUseCase'
import { ListEmailMessagesForEmailAddressIdUseCase } from '../private/domain/use-cases/message/listEmailMessagesForEmailAddressIdUseCase'
import { ListEmailMessagesForEmailFolderIdUseCase } from '../private/domain/use-cases/message/listEmailMessagesForEmailFolderIdUseCase'
import { ListEmailMessagesUseCase } from '../private/domain/use-cases/message/listEmailMessagesUseCase'
import { SendEmailMessageUseCase } from '../private/domain/use-cases/message/sendEmailMessageUseCase'
import { SubscribeToEmailMessagesUseCase } from '../private/domain/use-cases/message/subscribeToEmailMessagesUseCase'
import { UnsubscribeFromEmailMessagesUseCase } from '../private/domain/use-cases/message/unsubscribeFromEmailMessagesUseCase'
import { UpdateEmailMessagesUseCase } from '../private/domain/use-cases/message/updateEmailMessagesUseCase'
import { InvalidArgumentError } from './errors'
import {
  BatchOperationResult,
  BatchOperationResultStatus,
} from './typings/batchOperationResult'
import { UnsealedBlockedAddress } from './typings/blockedAddresses'
import { ConfigurationData } from './typings/configurationData'
import { DraftEmailMessage } from './typings/draftEmailMessage'
import { DraftEmailMessageMetadata } from './typings/draftEmailMessageMetadata'
import { EmailAddress, EmailAddressDetail } from './typings/emailAddress'
import { EmailAddressPublicInfo } from './typings/emailAddressPublicInfo'
import { EmailFolder } from './typings/emailFolder'
import { EmailMessage, EmailMessageSubscriber } from './typings/emailMessage'
import { EmailMessageDateRange } from './typings/emailMessageDateRange'
import { EmailMessageRfc822Data } from './typings/emailMessageRfc822Data'
import {
  ListEmailAddressesResult,
  ListEmailMessagesResult,
} from './typings/listOperationResult'
import { SortOrder } from './typings/sortOrder'
import { EmailMessageCryptoService } from '../private/domain/entities/secure/emailMessageCryptoService'
import { DefaultEmailMessageCryptoService } from '../private/data/secure/defaultEmailMessageCryptoService'
import { EmailAttachment } from './typings'
import { EmailMessageWithBody } from './typings/emailMessageWithBody'
import { GetEmailMessageWithBodyUseCase } from '../private/domain/use-cases/message/getEmailMessageWithBodyUseCase'

/**
 * Pagination interface designed to be extended for list interfaces.
 *
 * @interface Pagination
 * @property {number} limit Number of items to return.  Will be defaulted if omitted.
 * @property {string} nextToken A token generated by a previous call.
 */
interface Pagination {
  limit?: number
  nextToken?: string
}

/**
 * Input for `SudoEmailClient.getEmailAddress`.
 *
 * @interface GetEmailAddressInput
 * @property {string} id The identifier of the email address to be retrieved.
 * @property {CachePolicy} cachePolicy Determines how the email address will be fetched. Default usage is `remoteOnly`.
 */
export interface GetEmailAddressInput {
  id: string
  cachePolicy?: CachePolicy
}

/**
 * Input for `SudoEmailClient.listEmailAddresses`.
 *
 * @interface ListEmailAddressesInput
 * @property {CachePolicy} cachePolicy Determines how the email addresses will be fetched. Default usage is
 *   `remoteOnly`.
 */
export interface ListEmailAddressesInput extends Pagination {
  cachePolicy?: CachePolicy
}

/**
 * Input for `SudoEmailClient.listEmailAddressesForSudoId`.
 *
 * @interface ListEmailAddressesForSudoIdInput
 * @property {string} sudoId The identifier of the Sudo that owns the email address.
 * @property {CachePolicy} cachePolicy Determines how the email addresses will be fetched. Default usage is
 *   `remoteOnly`.
 */
export interface ListEmailAddressesForSudoIdInput extends Pagination {
  sudoId: string
  cachePolicy?: CachePolicy
}

/**
 * Input for `SudoEmailClient.lookupEmailAddressesPublicInfoInput`.
 *
 * @interface LookupEmailAddressesPublicInfoInput
 * @property {string[]} emailAddresses A list of email address strings in format 'local-part@domain'.
 */
export interface LookupEmailAddressesPublicInfoInput {
  emailAddresses: string[]
}

/**
 * Input for `SudoEmailClient.listEmailFoldersForEmailAddressId`.
 *
 * @interface ListEmailFoldersForEmailAddressIdInput
 * @property {string} emailAddressId The identifier of the email address associated with the email folders.
 * @property {CachePolicy} cachePolicy Determines how the email folders will be fetched. Default usage is `remoteOnly`.
 */
export interface ListEmailFoldersForEmailAddressIdInput extends Pagination {
  emailAddressId: string
  cachePolicy?: CachePolicy
}

/**
 * Input for `SudoEmailClient.CreateCustomEmailFolder`.
 *
 * @interface CreateCustomEmailFolderInput
 * @property {string} emailAddressId The identifier of the email address to be associated with the custom email folder.
 * @property {string} customFolderName The name of the custom email folder to be created.
 */
export interface CreateCustomEmailFolderInput {
  emailAddressId: string
  customFolderName: string
}

/**
 * Input for `SudoEmailClient.BlockEmailAddresses`
 *
 * @interface BlockEmailAddressesInput
 * @property {string[]} addresses List of addresses to be blocked in the [local-part]@[domain] format
 */
export interface BlockEmailAddressesInput {
  addressesToBlock: string[]
}

/**
 * Input for `SudoEmailClient.UnblockEmailAddresses`
 *
 * @interface UnblockEmailAddressesInput
 * @property {string[]} addresses List of addresses to be unblocked in the [local-part]@[domain] format
 */
export interface UnblockEmailAddressesInput {
  addresses: string[]
}

/**
 * Input for `SudoEmailClient.UnblockEmailAddressesByHashedValue`
 *
 * @interface UnblockEmailAddressesByHashedValueInput
 * @property {string[]} hashedValues List of hashedValues to be unblocked
 */
export interface UnblockEmailAddressesByHashedValueInput {
  hashedValues: string[]
}

/**
 * Input for `SudoEmailClient.provisionEmailAddress`.
 *
 * @interface ProvisionEmailAddressInput
 * @property {string} emailAddress The email address to provision, in the form `${localPart}@${domain}`.
 * @property {string} ownershipProofToken The signed ownership proof of the Sudo to be associated with the provisioned email address.
 *  The ownership proof must contain an audience of "sudoplatform".
 * @property {string} alias An alias for the email address.
 */
export interface ProvisionEmailAddressInput {
  emailAddress: string
  ownershipProofToken: string
  alias?: string
}

/**
 * Input for `SudoEmailClient.updateEmailAddressMetadata`.
 *
 * @interface UpdateEmailAddressMetadataInput
 * @property {string} id The id of the email address to update.
 * @property values The new value(s) to set for each listed email address.
 */
export interface UpdateEmailAddressMetadataInput {
  id: string
  values: {
    alias?: string
  }
}

/**
 * Input for `SudoEmailClient.checkEmailAddressAvailability`.
 *
 * @interface CheckEmailAddressAvailabilityInput
 * @property {Set<string>} localParts The local parts of the email address to check. Local parts require the following
 *   criteria:
 *     - At least one local part is required.
 *     - A maximum of 5 local parts per API request.
 *     - Local parts must not exceed 64 characters.
 *     - Local parts must match the following pattern: `^[a-zA-Z0-9](\.?[-_a-zA-Z0-9])*$`
 * @property {Set<string>} domains The domains of the email address to check. If left undefined, will use default
 *   recognized by the service.
 */
export interface CheckEmailAddressAvailabilityInput {
  localParts: Set<string>
  domains?: Set<string>
}

/**
 * Input for `SudoEmailClient.getEmailMessage`.
 *
 * @interface GetEmailMessageInput
 * @property {string} id The identifier of the email message to be retrieved.
 * @property {CachePolicy} cachePolicy Determines how the email message will be fetched. Default usage is `remoteOnly`.
 */
export interface GetEmailMessageInput {
  id: string
  cachePolicy?: CachePolicy
}

/**
 * Input for `SudoEmailClient.listEmailMessages`.
 *
 * @interface ListEmailMessagesInput
 * @property {EmailMessageDateRange} dateRange Email messages matching the specified date range inclusive will be fetched.
 * @property {CachePolicy} cachePolicy Determines how the email messages will be fetched. Default usage is `remoteOnly`.
 * @property {SortOrder} sortOrder The direction in which the email messages are sorted. Defaults to descending.
 */
export interface ListEmailMessagesInput extends Pagination {
  dateRange?: EmailMessageDateRange
  cachePolicy?: CachePolicy
  sortOrder?: SortOrder
}

/**
 * Input for `SudoEmailClient.listEmailMessagesForEmailAddressId`.
 *
 * @interface ListEmailMessagesForEmailAddressIdInput
 * @property {string} emailAddressId The identifier of the email address associated with the email message.
 * @property {EmailMessageDateRange} dateRange Email messages matching the specified date range inclusive will be fetched.
 * @property {CachePolicy} cachePolicy Determines how the email messages will be fetched. Default usage is `remoteOnly`.
 * @property {SortOrder} sortOrder The direction in which the email messages are sorted. Defaults to descending.
 */
export interface ListEmailMessagesForEmailAddressIdInput extends Pagination {
  emailAddressId: string
  dateRange?: EmailMessageDateRange
  cachePolicy?: CachePolicy
  sortOrder?: SortOrder
}

/**
 * Input for `SudoEmailClient.listEmailMessagesForEmailFolderId`.
 *
 * @interface ListEmailMessagesForEmailFolderIdInput
 * @property {string} folderId The identifier of the email folder that contains the email message.
 * @property {EmailMessageDateRange} dateRange Email messages matching the specified date range inclusive will be fetched.
 * @property {CachePolicy} cachePolicy Determines how the email messages will be fetched. Default usage is `remoteOnly`.
 * @property {SortOrder} sortOrder The direction in which the email messages are sorted. Defaults to descending.
 */
export interface ListEmailMessagesForEmailFolderIdInput extends Pagination {
  folderId: string
  dateRange?: EmailMessageDateRange
  cachePolicy?: CachePolicy
  sortOrder?: SortOrder
}

/**
 * Input for `SudoEmailClient.createDraftEmailMessage`.
 *
 * @interface CreateDraftEmailMessageInput
 * @property {ArrayBuffer} rfc822Data Email message data formatted under the RFC 6854.
 * @property {string} senderEmailAddressId The identifier of the email address used to send the email. The identifier
 *  must match the identifier of the email address of the `from` field in the RFC 6854 data.
 */
export interface CreateDraftEmailMessageInput {
  rfc822Data: ArrayBuffer
  senderEmailAddressId: string
}

/**
 * Input for `SudoEmailClient.updateDraftEmailMessage`.
 *
 * @interface UpdateDraftEmailMessageInput
 * @property {string} id The identifier of the draft email message to update.
 * @property {ArrayBuffer} rfc822Data Email message data formatted under the RFC 6854. This will completely replace the existing data.
 * @property {string} senderEmailAddressId The identifier of the email address used to send the email. The identifier
 *  must match the identifier of the email address of the `from` field in the RFC 6854 data.
 */
export interface UpdateDraftEmailMessageInput {
  id: string
  rfc822Data: ArrayBuffer
  senderEmailAddressId: string
}

/**
 * Input for `SudoEmailClient.deleteDraftEmailMessages`.
 *
 * @interface DeleteDraftEmailMessageInput
 * @property {string[]} ids A list of one or more identifiers of the draft email messages to be deleted.
 * @property {string} emailAddressId The identifier of the email address associated with the draft email message.
 */
export interface DeleteDraftEmailMessagesInput {
  ids: string[]
  emailAddressId: string
}

/**
 * Input for `SudoEmailClient.getDraftEmailMessage`.
 *
 * @interface GetDraftEmailMessageInput
 * @property {string} id The identifier of the draft email message to be retrieved.
 * @property {string} emailAddressId The identifier of the email address associated with the draft email message.
 */
export interface GetDraftEmailMessageInput {
  id: string
  emailAddressId: string
}

/**
 * Representation of the email headers formatted under the RFC-6854 (supersedes RFC 822).
 * (https://tools.ietf.org/html/rfc6854) standard. Some further rules (beyond RFC 6854) must also be
 * applied to the data:
 *  - At least one recipient must exist (to, cc, bcc).
 *  - For all email addresses:
 *    - Total length (including both local part and domain) must not exceed 256 characters.
 *    - Local part must not exceed more than 64 characters.
 *    - Input domain parts (domain separated by `.`) must not exceed 63 characters.
 *    - Address must match standard email address pattern:
 *       `^[a-zA-Z0-9](\.?[-_a-zA-Z0-9])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$`.
 *
 * @interface InternetMessageFormatHeader
 * @property {EmailAddressDetail} from The email address belonging to the sender.
 * @property {EmailAddressDetail[]} to The email addresses belonging to the primary recipients.
 * @property {EmailAddressDetail[]} cc The email addresses belonging to the secondary recipients.
 * @property {EmailAddressDetail[]} bcc The email addresses belonging to additional recipients.
 * @property {EmailAddressDetail[]} replyTo The email addresses in which responses are to be sent.
 * @property {string} subject The subject line of the email message.
 */
export interface InternetMessageFormatHeader {
  from: EmailAddressDetail
  to: EmailAddressDetail[]
  cc: EmailAddressDetail[]
  bcc: EmailAddressDetail[]
  replyTo: EmailAddressDetail[]
  subject: string
}

/**
 * Input object containing information required to send an email message.
 *
 * @property {string} senderEmailAddressId [Identifier of the [EmailAddress] being used to
 *  send the email. The identifier must match the identifier of the address of the `from` field
 *  in the RFC 6854 data.
 * @property {InternetMessageFormatHeader} emailMessageHeader The email message headers.
 * @property {string} body The text body of the email message.
 * @property {EmailAttachment[]} attachments List of attached files to be sent with the message.
 *  Default is an empty list.
 * @property {EmailAttachment[]} inlineAttachments List of inline attachments to be sent with the message.
 *  Default is an empty list.
 */
export interface SendEmailMessageInput {
  senderEmailAddressId: string
  emailMessageHeader: InternetMessageFormatHeader
  body: string
  attachments: EmailAttachment[]
  inlineAttachments: EmailAttachment[]
}

/**
 * Input for `SudoEmailClient.updateEmailMessages`.
 *
 * @interface UpdateEmailMessagesInput
 * @property {string[]} ids A list of one or more identifiers of the email messages to be updated. There is a limit of
 *   100 email message ids per API request. Exceeding this will cause an error to be thrown.
 * @property values The new value(s) to set for each listed email message.
 */
export interface UpdateEmailMessagesInput {
  ids: string[]
  values: { folderId?: string; seen?: boolean }
}

/**
 * Input for `SudoEmailClient.getEmailMessageRfc822Data`.
 *
 * @interface GetEmailMessageRfc822DataInput
 * @property {string} id The identifier of the email message RFC 822 data to be retrieved.
 * @property {string} emailAddressId The identifier of the email address associated with the email message.
 */
export interface GetEmailMessageRfc822DataInput {
  id: string
  emailAddressId: string
}

/**
 * Input for `SudoEmailClient.getEmailMessageWithBody`.
 *
 * @interface GetEmailMessageWithBodyInput
 * @property {string} id The identifier of the email message RFC 822 data to be retrieved.
 * @property {string} emailAddressId The identifier of the email address associated with the email message.
 */
export interface GetEmailMessageWithBodyInput {
  id: string
  emailAddressId: string
}

export interface SudoEmailClient {
  /**
   * Provision an email address.
   *
   * @param {ProvisionEmailAddressInput} input Parameters used to provision an email address. Email addresses must meet
   * the following criteria:
   *   - Total length (including both local part and domain) must not exceed 256 characters.
   *   - Local part must not exceed more than 64 characters.
   *   - Input domain parts (domain separated by `.`) must not exceed 63 characters.
   *   - Address must match standard email address pattern:
   *     `^[a-zA-Z0-9](\.?[-_a-zA-Z0-9])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$`.
   *   - Domain must be a registered domain retrieved from {@link SudoEmailClient.getSupportedEmailDomains}.
   *
   * @returns {EmailAddress} The provisioned email address.
   *
   * @throws {@link InvalidAddressError}
   * @throws {@link InvalidKeyRingIdError}
   * @throws {@link AddressUnavailableError}
   * @throws NotRegisteredError
   * @throws InvalidTokenError
   * @throws InsufficientEntitlementsError
   * @throws ServiceError
   */
  provisionEmailAddress(
    input: ProvisionEmailAddressInput,
  ): Promise<EmailAddress>

  /**
   * Deprovision an email address.
   *
   * @param {string} id The identifier of the email address to deprovision.
   * @returns {EmailAddress} The deprovisioned email address.
   *
   * @throws {@link AddressNotFoundError}
   * @throws NotRegisteredError
   */
  deprovisionEmailAddress(id: string): Promise<EmailAddress>

  /**
   * Update the metadata of an email address.
   *
   * @param {UpdateEmailAddressMetadataInput} input Parameters used to update the metadata of an email address.
   * @returns {string} The id of the updated email address.
   *
   * @throws NotRegisteredError
   * @throws ServiceError
   */
  updateEmailAddressMetadata(
    input: UpdateEmailAddressMetadataInput,
  ): Promise<string>

  /**
   * Get a list of supported email domains.
   *
   * @param {CachePolicy} cachePolicy Determines how the supported email domains will be fetched. Default usage is
   *   `remoteOnly`.
   * @returns {string[]} A list of supported domains.
   *
   * @throws NotRegisteredError
   * @throws ServiceError
   */
  getSupportedEmailDomains(cachePolicy?: CachePolicy): Promise<string[]>

  /**
   * Check if an email address is available to be provisioned within a domain.
   *
   * @param {CheckEmailAddressAvailabilityInput} input Parameters used to perform the email addresses check.
   * @returns {string[]} Returns the fully qualified email addresses, filtering out already used email addresses.
   *
   * @throws {@link InvalidEmailDomainError}
   * @throws {@link InvalidArgumentError}
   * @throws {@link InvalidAddressError}
   */
  checkEmailAddressAvailability(
    input: CheckEmailAddressAvailabilityInput,
  ): Promise<string[]>

  /**
   * Get an email address identified by id.
   *
   * @param {GetEmailAddressInput} input Parameters used to retrieve an email address.
   * @returns {EmailAddress | undefined} The email address identified by id or undefined if the email address
   *  cannot be found.
   */
  getEmailAddress(
    input: GetEmailAddressInput,
  ): Promise<EmailAddress | undefined>

  /**
   * Get a list of all provisioned email addresses for the signed in user.
   *
   * @param {ListEmailAddressesInput} input Parameters used to retrieve a list of provisioned email addresses.
   * @returns {ListEmailAddressesResult} List operation result.
   */
  listEmailAddresses(
    input?: ListEmailAddressesInput,
  ): Promise<ListEmailAddressesResult>

  /**
   * Get a list of provisioned email addresses owned by the Sudo identified by sudoId.
   *
   * @param {ListEmailAddressesForSudoIdInput} input Parameters used to retrieve a list of provisioned email addresses for a sudoId.
   * @returns {ListEmailAddressesResult} List operation result.
   */
  listEmailAddressesForSudoId(
    input: ListEmailAddressesForSudoIdInput,
  ): Promise<ListEmailAddressesResult>

  /**
   * Get a list of public information objects associated with the provided email addresses.

   * Results can only be retrieved in batches of 50. Anything greater will throw a {@link LimitExceededError}.
   *
   * @param {LookupEmailAddressesPublicInfoInput} input Parameters used to retrieve a list of public information objects for a list
   * of email addresses.
   * @returns {EmailAddressPublicInfo[]} An array of public info objects, or an empty array if email addresses
   * or their public keys cannot be found.
   *
   * @throws LimitExceededError
   */
  lookupEmailAddressesPublicInfo(
    input: LookupEmailAddressesPublicInfoInput,
  ): Promise<EmailAddressPublicInfo[]>

  /**
   * Get a list of email folders associated with the email address identified by emailAddressId.
   *
   * @param {ListEmailFoldersForEmailAddressIdInput} input Parameters used to retrieve a list of email folders for an emailAddressId.
   * @returns {ListOutput<EmailFolder>} An array of email folders or an empty array if no matching email folders
   *  can be found.
   */
  listEmailFoldersForEmailAddressId(
    input: ListEmailFoldersForEmailAddressIdInput,
  ): Promise<ListOutput<EmailFolder>>

  /**
   * Create a custom email folder for the email address identified by emailAddressId.
   *
   * @param {CreateCustomEmailFolderInput} input Parameters used to create a custom email folder.
   * @returns {EmailFolder} The created custom email folder.
   */
  createCustomEmailFolder(
    input: CreateCustomEmailFolderInput,
  ): Promise<EmailFolder>

  /**
   * Block email address(es) for the given owner
   *
   * @param {BlockEmailAddressesInput} input Parameters to block email addresses
   * @returns {Promise<BatchOperationResult<string>>} The results of the operation
   */
  blockEmailAddresses(
    input: BlockEmailAddressesInput,
  ): Promise<BatchOperationResult<string>>

  /**
   * Unblock email address(es) for the given owner
   *
   * @param {UnblockEmailAddressesInput} input Parameters to unblock email addresses
   * @returns {Promise<BatchOperationResult<string>>} The results of the operation
   */
  unblockEmailAddresses(
    input: UnblockEmailAddressesInput,
  ): Promise<BatchOperationResult<string>>

  /**
   * Unblock email address(es) for the given owner
   *
   * @param {UnblockEmailAddressesByHashedValueInput} input Parameters to unblock email addresses
   * @returns {Promise<BatchOperationResult<string>>} The results of the operation
   */
  unblockEmailAddressesByHashedValue(
    input: UnblockEmailAddressesByHashedValueInput,
  ): Promise<BatchOperationResult<string>>

  /**
   * Get email address blocklist for logged in user
   *
   * @returns {Promise<UnsealedBlockedAddress[]>} The list of unsealed blocked addresses
   */
  getEmailAddressBlocklist(): Promise<UnsealedBlockedAddress[]>

  /**
   * Create a draft email message in RFC 6854 (supersedes RFC 822)(https://tools.ietf.org/html/rfc6854) format.
   *
   * @param {CreateDraftEmailMessageInput} input Parameters used to create a draft email message.
   * @returns {DraftEmailMessageMetadata} The metadata of the saved draft email message.
   *
   * @throws {@link AddressNotFoundError}
   */
  createDraftEmailMessage(
    input: CreateDraftEmailMessageInput,
  ): Promise<DraftEmailMessageMetadata>

  /**
   * Update a draft email message in RFC 6854 (supersedes RFC 822)(https://tools.ietf.org/html/rfc6854) format.
   *
   * @param {UpdateDraftEmailMessageInput} input Parameters used to update a draft email message.
   * @returns {DraftEmailMessageMetadata} The metadata of the updated draft email message.
   *
   * @throws {@link AddressNotFoundError}
   * @throws {@link MessageNotFoundError}
   */
  updateDraftEmailMessage(
    input: UpdateDraftEmailMessageInput,
  ): Promise<DraftEmailMessageMetadata>

  /**
   * Delete the draft email messages identified by the list of ids.
   *
   * Draft email messages can only be deleted in batches of 10. Anything greater will throw a {@link LimitExceededError}.
   *
   * Any draft email message ids that do not exist will be marked as success.
   * Any emailAddressId that is not owned or does not exist, will throw an error.
   *
   * @param {DeleteDraftEmailMessageInput} input Parameters used to delete a draft email message.
   * @returns The status of the delete:
   *    Success - All draft email messages succeeded to delete.
   *    Partial - Only a partial amount of draft email messages succeeded to delete. Includes a list of the
   *              identifiers of the draft email messages that failed and succeeded to delete.
   *    Failure - All draft email messages failed to delete.
   *
   * @throws {@link AddressNotFoundError}
   * @throws {@link LimitExceededError}
   */
  deleteDraftEmailMessages(
    input: DeleteDraftEmailMessagesInput,
  ): Promise<BatchOperationResult<string>>

  /**
   * Get a draft email message that has been previously saved.
   *
   * @param {GetDraftEmailMessageInput} input Parameters used to retrieve a draft email message.
   * @returns {DraftEmailMessage | undefined} The draft email message identified by id or undefined if not found.
   */
  getDraftEmailMessage(
    input: GetDraftEmailMessageInput,
  ): Promise<DraftEmailMessage | undefined>

  /**
   * Get the list of draft email message metadata for the specified email address.
   *
   * @param {string} emailAddressId The identifier of the email address associated with the draft email messages.
   * @returns {DraftEmailMessageMetadata[]} An array of draft email message metadata or an empty array if no matching draft email messages
   *  can be found.
   */
  listDraftEmailMessageMetadata(
    emailAddressId: string,
  ): Promise<DraftEmailMessageMetadata[]>

  /**
   * Send an email message using RFC 6854 (supersedes RFC 822)(https://tools.ietf.org/html/rfc6854) data.
   *
   * @param {SendEmailMessageInput} input Parameters used to send an email message.
   * @returns {string} The identifier of the email message that is being sent.
   *
   * @throws {@link UnauthorizedAddressError}
   * @throws {@link InvalidEmailContentsError}
   * @throws NotAuthorizedError
   * @throws NotRegisteredError
   * @throws LimitExceededError
   * @throws InsufficientEntitlementsError
   */
  sendEmailMessage(input: SendEmailMessageInput): Promise<string>

  /**
   * Update the email messages identified by the list of ids.
   *
   * Email messages can only be updated in batches of 100. Anything greater will throw a {@link LimitExceededError}.
   *
   * @param {UpdateEmailMessagesInput} input Parameters used to update a list of email messages.
   * @returns The status of the update:
   *    Success - All email messages succeeded to update.
   *    Partial - Only a partial amount of messages succeeded to update. Includes a list of the
   *              identifiers of the email messages that failed and succeeded to update.
   *    Failure - All email messages failed to update.
   *
   * @throws NotRegisteredError
   * @throws LimitExceededError
   * @throws InvalidArgumentError
   */
  updateEmailMessages(
    input: UpdateEmailMessagesInput,
  ): Promise<BatchOperationResult<string>>

  /**
   * Delete the email messages identified by the list of ids.
   *
   * Email messages can only be deleted in batches of 100. Anything greater will throw a {@link LimitExceededError}.
   *
   * @param {string[]} ids A list of one or more identifiers of the email messages to be deleted. There is a limit of
   *   100 email message ids per API request. Exceeding this will cause an error to be thrown.
   *
   * @returns The status of the delete:
   *    Success - All email messages succeeded to delete.
   *    Partial - Only a partial amount of messages succeeded to delete. Includes a list of the
   *              identifiers of the email messages that failed and succeeded to delete.
   *    Failure - All email messages failed to delete.
   *
   * @throws NotRegisteredError
   * @throws InvalidArgumentError
   * @throws LimitExceededError
   * @throws ServiceError
   */
  deleteEmailMessages(ids: string[]): Promise<BatchOperationResult<string>>

  /**
   * Delete a single email message identified by id.
   *
   * @param {string} id The identifier of the email message to be deleted.
   * @returns {string | undefined} The identifier of the email message that was deleted or undefined if the
   * email message could not be deleted.
   *
   * @throws NotRegisteredError
   * @throws LimitExceededError
   * @throws ServiceError
   */
  deleteEmailMessage(id: string): Promise<string | undefined>

  /**
   * Get an email message identified by id.
   *
   * @param {GetEmailMessageInput} input Parameters used to retrieve an email message.
   * @returns {EmailMessage | undefined} The email message identified by id or undefined if the email message
   *  cannot be found.
   */
  getEmailMessage(
    input: GetEmailMessageInput,
  ): Promise<EmailMessage | undefined>

  /**
   * Get the body and attachment data of an EmailMessage
   *
   * @param {GetEmailMessageWithBodyInput} input PArameters used to retrieve the data of the email message.
   * @returns {EmailMessageWithBody | undefined} The data associated with the email message or undefined if not found
   */
  getEmailMessageWithBody(
    input: GetEmailMessageWithBodyInput,
  ): Promise<EmailMessageWithBody | undefined>

  /**
   * Get the RFC 6854 (supersedes RFC 822) data of the email message.
   *
   * @param {GetEmailMessageRfc822DataInput} input Parameters used to retrieve the data of the email message.
   * @returns {EmailMessageRfc822Data | undefined} The data associated with the email message or
   *  undefined if the email message cannot be found.
   */
  getEmailMessageRfc822Data(
    input: GetEmailMessageRfc822DataInput,
  ): Promise<EmailMessageRfc822Data | undefined>

  /**
   * Get the list of all email messages for the user.
   *
   * @param {ListEmailMessagesInput} input Parameters used to retrieve a list of all email messages for a user.
   * @returns {ListEmailMessagesResult} List operation result.
   */
  listEmailMessages(
    input: ListEmailMessagesInput,
  ): Promise<ListEmailMessagesResult>

  /**
   * Get the list of email messages for the specified email address.
   *
   * @param {ListEmailMessagesForEmailAddressIdInput} input Parameters used to retrieve a list of email messages for an emailAddressId.
   * @returns {ListEmailMessagesResult} List operation result.
   */
  listEmailMessagesForEmailAddressId(
    input: ListEmailMessagesForEmailAddressIdInput,
  ): Promise<ListEmailMessagesResult>

  /**
   * Get the list of email messages for the specified email folder.
   *
   * @param {ListEmailMessagesForEmailFolderIdInput} input Parameters used to retrieve a list of email messages for a folderId.
   * @returns {ListEmailMessagesResult} List operation result.
   */
  listEmailMessagesForEmailFolderId(
    input: ListEmailMessagesForEmailFolderIdInput,
  ): Promise<ListEmailMessagesResult>

  /**
   * Subscribe to email message events.
   *
   * @param {string} subscriptionId unique identifier to differentiate subscriptions; note that specifying a duplicate subscription
   * id will replace the previous subscription.
   * @param {EmailMessageSubscriber} subscriber implementation of callback to be invoked when email message event occurs
   * @returns {void}
   */
  subscribeToEmailMessages(
    subscriptionId: string,
    subscriber: EmailMessageSubscriber,
  ): Promise<void>

  /**
   * Unsubscribe from email message events.
   *
   * @param {string} subscriptionId unique identifier to differentiate subscription
   * @returns {void}
   **/
  unsubscribeFromEmailMessages(subscriptionId: string): void

  /**
   * Get the configuration data for the email service.
   *
   * @returns {ConfigurationData} The configuration data for the email service.
   */
  getConfigurationData(): Promise<ConfigurationData>

  /**
   * Export the cryptographic keys to a key archive.
   *
   * @return Key archive data.
   */
  exportKeys(): Promise<ArrayBuffer>

  /**
   * Imports cryptographic keys from a key archive.
   *
   * @param archiveData Key archive data to import the keys from.
   */
  importKeys(archiveData: ArrayBuffer): Promise<void>

  /**
   * Removes any cached data maintained by this client.
   */
  reset(): Promise<void>
}

export type SudoEmailClientConfig = {
  enforceSingletonPublicKey?: boolean
}

export type SudoEmailClientOptions = {
  /** Sudo User client to use. No default */
  sudoUserClient: SudoUserClient

  /** SudoCryptoProvider to use. Default is to create a WebSudoCryptoProvider */
  sudoCryptoProvider?: SudoCryptoProvider

  /** SudoKeyManager to use. Default is to create a DefaultSudoKeyManager */
  sudoKeyManager?: SudoKeyManager

  /** Client configuration to use. No default */
  sudoEmailClientConfig?: SudoEmailClientConfig
}

export class DefaultSudoEmailClient implements SudoEmailClient {
  private readonly apiClient: ApiClient
  private readonly userClient: SudoUserClient
  private readonly configurationDataService: DefaultConfigurationDataService
  private readonly emailAccountService: DefaultEmailAccountService
  private readonly emailFolderService: DefaultEmailFolderService
  private readonly emailMessageService: DefaultEmailMessageService
  private readonly emailAddressBlocklistService: EmailAddressBlocklistService
  private readonly emailMessageCryptoService: EmailMessageCryptoService
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
    this.emailFolderService = new DefaultEmailFolderService(
      this.apiClient,
      deviceKeyWorker,
    )
    this.emailMessageCryptoService = new DefaultEmailMessageCryptoService(
      deviceKeyWorker,
    )
    this.emailMessageService = new DefaultEmailMessageService(
      this.apiClient,
      this.userClient,
      s3Client,
      deviceKeyWorker,
      this.emailServiceConfig,
      this.emailMessageCryptoService,
    )
    this.emailAddressBlocklistService = new DefaultEmailAddressBlocklistService(
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

  public async provisionEmailAddress(
    input: ProvisionEmailAddressInput,
  ): Promise<EmailAddress> {
    return await this.mutex.runExclusive(async () => {
      const useCase = new ProvisionEmailAccountUseCase(this.emailAccountService)
      const entityTransformer = new EmailAddressEntityTransformer()
      const emailAddressEntity = entityTransformer.transform(
        input.emailAddress,
        input.alias,
      )
      const result = await useCase.execute({
        emailAddressEntity,
        ownershipProofToken: input.ownershipProofToken,
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
  }: SendEmailMessageInput): Promise<string> {
    const sendEmailMessageUseCase = new SendEmailMessageUseCase(
      this.emailMessageService,
      this.emailAccountService,
      this.configurationDataService,
    )
    return await sendEmailMessageUseCase.execute({
      senderEmailAddressId,
      emailMessageHeader,
      body,
      attachments,
      inlineAttachments,
    })
  }

  public async updateEmailMessages({
    ids,
    values,
  }: UpdateEmailMessagesInput): Promise<BatchOperationResult<string>> {
    this.log.debug(this.provisionEmailAddress.name, { ids, values })
    const idSet = new Set(ids)
    const useCase = new UpdateEmailMessagesUseCase(this.emailMessageService)
    const { status, successIds, failureIds } = await useCase.execute({
      ids: idSet,
      values,
    })
    if (status === UpdateEmailMessagesStatus.Success) {
      return { status: BatchOperationResultStatus.Success }
    }
    if (status === UpdateEmailMessagesStatus.Failed) {
      return { status: BatchOperationResultStatus.Failure }
    }
    return {
      status: BatchOperationResultStatus.Partial,
      failureValues: failureIds ?? [],
      successValues: successIds ?? [],
    }
  }

  public async deleteEmailMessage(id: string): Promise<string | undefined> {
    const idSet = new Set([id])
    const deleteEmailMessageUseCase = new DeleteEmailMessagesUseCase(
      this.emailMessageService,
    )
    const { successIds } = await deleteEmailMessageUseCase.execute(idSet)
    return successIds.length === idSet.size ? id : undefined
  }

  public async deleteEmailMessages(
    ids: string[],
  ): Promise<BatchOperationResult<string>> {
    const idSet = new Set(ids)
    const deleteEmailMessageUseCase = new DeleteEmailMessagesUseCase(
      this.emailMessageService,
    )
    const { successIds, failureIds } = await deleteEmailMessageUseCase.execute(
      idSet,
    )
    if (successIds.length === idSet.size) {
      return { status: BatchOperationResultStatus.Success }
    }
    if (failureIds.length === idSet.size) {
      return { status: BatchOperationResultStatus.Failure }
    }
    return {
      status: BatchOperationResultStatus.Partial,
      failureValues: failureIds,
      successValues: successIds,
    }
  }

  public async getSupportedEmailDomains(
    cachePolicy: CachePolicy,
  ): Promise<string[]> {
    const useCase = new GetSupportedEmailDomainsUseCase(
      this.emailAccountService,
    )
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
      EmailAddressPublicInfoTransformer.transformEntity(publicInfo),
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
  }: CreateCustomEmailFolderInput): Promise<EmailFolder> {
    this.log.debug(this.createCustomEmailFolder.name, {
      emailAddressId,
      customFolderName,
    })

    const useCase = new CreateCustomEmailFolderUseCase(this.emailFolderService)
    const result = await useCase.execute({
      emailAddressId,
      customFolderName,
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
    )
    const result = await useCase.execute({
      blockedAddresses: input.addressesToBlock,
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
    )
    return await useCase.execute({ id, rfc822Data, senderEmailAddressId })
  }

  public async deleteDraftEmailMessages({
    ids,
    emailAddressId,
  }: DeleteDraftEmailMessagesInput): Promise<BatchOperationResult<string>> {
    const idSet = new Set(ids)
    const useCase = new DeleteDraftEmailMessagesUseCase(
      this.emailAccountService,
      this.emailMessageService,
    )
    const { successIds, failureIds } = await useCase.execute({
      ids: idSet,
      emailAddressId,
    })
    if (successIds.length == idSet.size) {
      return { status: BatchOperationResultStatus.Success }
    }
    if (failureIds.length == idSet.size) {
      return { status: BatchOperationResultStatus.Failure }
    }
    return {
      status: BatchOperationResultStatus.Partial,
      failureValues: failureIds,
      successValues: successIds,
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

  public async listDraftEmailMessageMetadata(
    emailAddressId: string,
  ): Promise<DraftEmailMessageMetadata[]> {
    this.log.debug(this.listDraftEmailMessageMetadata.name, { emailAddressId })

    const useCase = new ListDraftEmailMessageMetadataUseCase(
      this.emailMessageService,
    )
    const { metadata } = await useCase.execute({ emailAddressId })

    return metadata
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
  }: ListEmailMessagesInput): Promise<ListEmailMessagesResult> {
    this.log.debug(this.listEmailMessages.name, {
      dateRange,
      cachePolicy,
      limit,
      sortOrder,
      nextToken,
    })
    const useCase = new ListEmailMessagesUseCase(this.emailMessageService)
    const { emailMessages, nextToken: resultNextToken } = await useCase.execute(
      {
        dateRange,
        cachePolicy,
        limit,
        sortOrder,
        nextToken,
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
  }: ListEmailMessagesForEmailAddressIdInput): Promise<ListEmailMessagesResult> {
    this.log.debug(this.listEmailMessagesForEmailAddressId.name, {
      emailAddressId,
      dateRange,
      cachePolicy,
      limit,
      sortOrder,
      nextToken,
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
  }: ListEmailMessagesForEmailFolderIdInput): Promise<ListEmailMessagesResult> {
    this.log.debug(this.listEmailMessagesForEmailFolderId.name, {
      folderId,
      dateRange,
      cachePolicy,
      limit,
      sortOrder,
      nextToken,
    })
    const useCase = new ListEmailMessagesForEmailFolderIdUseCase(
      this.emailMessageService,
    )
    const { emailMessages, nextToken: resultNextToken } = await useCase.execute(
      { folderId, dateRange, cachePolicy, limit, sortOrder, nextToken },
    )
    const transformer = new ListEmailMessagesAPITransformer()
    const result = transformer.transform(emailMessages, resultNextToken)
    return result
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
