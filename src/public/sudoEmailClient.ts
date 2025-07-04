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
import { DefaultEmailFolderService } from '../private/data/folder/defaultEmailFolderService'
import { EmailFolderAPITransformer } from '../private/data/folder/transformer/emailFolderAPITransformer'
import { DefaultEmailMessageService } from '../private/data/message/defaultEmailMessageService'
import { EmailMessageAPITransformer } from '../private/data/message/transformer/emailMessageAPITransformer'
import { ListEmailMessagesAPITransformer } from '../private/data/message/transformer/listEmailMessagesAPITransformer'
import { UpdateEmailMessagesResultTransformer } from '../private/data/message/transformer/updateEmailMessagesResultTransformer'
import { EmailDomainEntity } from '../private/domain/entities/emailDomain/emailDomainEntity'
import { EmailAddressBlocklistService } from '../private/domain/entities/blocklist/emailAddressBlocklistService'
import { UpdateEmailMessagesStatus } from '../private/domain/entities/message/updateEmailMessagesStatus'
import { EmailCryptoService } from '../private/domain/entities/secure/emailCryptoService'
import { CheckEmailAddressAvailabilityUseCase } from '../private/domain/use-cases/account/checkEmailAddressAvailabilityUseCase'
import { DeprovisionEmailAccountUseCase } from '../private/domain/use-cases/account/deprovisionEmailAccountUseCase'
import { GetEmailAccountUseCase } from '../private/domain/use-cases/account/getEmailAccountUseCase'
import { GetSupportedEmailDomainsUseCase } from '../private/domain/use-cases/emailDomain/getSupportedEmailDomainsUseCase'
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
import { ListDraftEmailMessageMetadataForEmailAddressIdUseCase } from '../private/domain/use-cases/draft/listDraftEmailMessageMetadataForEmailAddressIdUseCase'
import { ListDraftEmailMessageMetadataUseCase } from '../private/domain/use-cases/draft/listDraftEmailMessageMetadataUseCase'
import { ListDraftEmailMessagesForEmailAddressIdUseCase } from '../private/domain/use-cases/draft/listDraftEmailMessagesForEmailAddressIdUseCase'
import { ListDraftEmailMessagesUseCase } from '../private/domain/use-cases/draft/listDraftEmailMessagesUseCase'
import { SaveDraftEmailMessageUseCase } from '../private/domain/use-cases/draft/saveDraftEmailMessageUseCase'
import { UpdateDraftEmailMessageUseCase } from '../private/domain/use-cases/draft/updateDraftEmailMessageUseCase'
import { CreateCustomEmailFolderUseCase } from '../private/domain/use-cases/folder/createCustomEmailFolderUseCase'
import { ListEmailFoldersForEmailAddressIdUseCase } from '../private/domain/use-cases/folder/listEmailFoldersForEmailAddressIdUseCase'
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
  EmailAttachment,
  ScheduledDraftMessage,
  ScheduledDraftMessageState,
  UpdatedEmailMessageSuccess,
} from './typings'
import {
  BatchOperationResult,
  BatchOperationResultStatus,
  EmailMessageOperationFailureResult,
} from './typings/batchOperationResult'
import {
  BlockedEmailAddressAction,
  UnsealedBlockedAddress,
} from './typings/blockedAddresses'
import { ConfigurationData } from './typings/configurationData'
import { DraftEmailMessage } from './typings/draftEmailMessage'
import { DraftEmailMessageMetadata } from './typings/draftEmailMessageMetadata'
import { EmailAddress, EmailAddressDetail } from './typings/emailAddress'
import { EmailAddressPublicInfo } from './typings/emailAddressPublicInfo'
import { EmailFolder } from './typings/emailFolder'
import {
  EmailMessage,
  EmailMessageSubscriber,
  SendEmailMessageResult,
} from './typings/emailMessage'
import { EmailMessageDateRange } from './typings/emailMessageDateRange'
import { EmailMessageRfc822Data } from './typings/emailMessageRfc822Data'
import { EmailMessageWithBody } from './typings/emailMessageWithBody'
import {
  ListEmailAddressesResult,
  ListEmailMessagesResult,
} from './typings/listOperationResult'
import { SortOrder } from './typings/sortOrder'
import { DefaultEmailCryptoService } from '../private/data/secure/defaultEmailCryptoService'
import { DefaultEmailDomainService } from '../private/data/emailDomain/defaultEmailDomainService'
import { GetConfiguredEmailDomainsUseCase } from '../private/domain/use-cases/emailDomain/getConfiguredEmailDomainsUseCase'
import { EmailDomainEntityTransformer } from '../private/data/emailDomain/transformer/emailDomainEntityTransformer'
import { DeleteEmailMessageSuccessResult } from './typings/deleteEmailMessageSuccessResult'
import { DeleteCustomEmailFolderUseCase } from '../private/domain/use-cases/folder/deleteCustomEmailFolderUseCase'
import { UpdateCustomEmailFolderUseCase } from '../private/domain/use-cases/folder/updateCustomEmailFolderUseCase'
import { DeleteMessagesByFolderIdUseCase } from '../private/domain/use-cases/folder/deleteMessagesByFolderIdUseCase'
import { ScheduleSendDraftMessageUseCase } from '../private/domain/use-cases/draft/scheduleSendDraftMessageUseCase'
import { CancelScheduledDraftMessageUseCase } from '../private/domain/use-cases/draft/cancelScheduledDraftMessageUseCase'
import { ListScheduledDraftMessagesForEmailAddressIdUseCase } from '../private/domain/use-cases/draft/listScheduledDraftMessagesForEmailAddressIdUseCase'

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
 * @property {boolean} allowSymmetricKeyGeneration (optional) If false and no symmetric key is found, a KeyNotFoundError will be thrown. Defaults to true.
 */
export interface CreateCustomEmailFolderInput {
  emailAddressId: string
  customFolderName: string
  allowSymmetricKeyGeneration?: boolean
}

/**
 * Input for `SudoEmailClient.DeleteCustomEmailFolder`.
 *
 * @interface DeleteCustomEmailFolderInput
 * @property {string} emailFolderId The identifier of the email folder to delete.
 * @property {string} emailAddressId The identifier of the email address associated with the folder.
 */
export interface DeleteCustomEmailFolderInput {
  emailFolderId: string
  emailAddressId: string
}

export interface CustomEmailFolderUpdateValuesInput {
  customFolderName?: string
}

/**
 * Input for `SudoEmailClient.UpdateCustomEmailFolder`.
 *
 * @interface UpdateCustomEmailFolderInput
 * @property {string} emailFolderId The identifier of the email folder to update
 * @property {string} emailAddressId The identifier of the email address associated with the folder.
 * @property {CustomEmailFolderUpdateValuesInput} values The values to update
 * @property {boolean} allowSymmetricKeyGeneration (optional) If false and no symmetric key is found, a KeyNotFoundError will be thrown. Defaults to true.
 */
export interface UpdateCustomEmailFolderInput {
  emailFolderId: string
  emailAddressId: string
  values: CustomEmailFolderUpdateValuesInput
  allowSymmetricKeyGeneration?: boolean
}

/**
 * Input for `SudoEmailClient.BlockEmailAddresses`
 *
 * @interface BlockEmailAddressesInput
 * @property {string[]} addresses List of addresses to be blocked in the [local-part]@[domain] format.
 * @property {BlockedEmailAddressAction} action Action to take when receiving messages from blocked addresses.
 * @property {string} emailAddressId If included, the block will only affect the indicated email address.
 */
export interface BlockEmailAddressesInput {
  addressesToBlock: string[]
  action?: BlockedEmailAddressAction
  emailAddressId?: string
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
 * @property {boolean} allowSymmetricKeyGeneration (optional) If false and no symmetric key is found, a KeyNotFoundError will be thrown. Defaults to true.
 */
export interface ProvisionEmailAddressInput {
  emailAddress: string
  ownershipProofToken: string
  alias?: string
  allowSymmetricKeyGeneration?: boolean
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
 * @property {boolean} includeDeletedMessages A flag to indicate if deleted messages should be included. Defaults to false.
 */
export interface ListEmailMessagesInput extends Pagination {
  dateRange?: EmailMessageDateRange
  cachePolicy?: CachePolicy
  sortOrder?: SortOrder
  includeDeletedMessages?: boolean
}

/**
 * Input for `SudoEmailClient.listEmailMessagesForEmailAddressId`.
 *
 * @interface ListEmailMessagesForEmailAddressIdInput
 * @property {string} emailAddressId The identifier of the email address associated with the email message.
 * @property {EmailMessageDateRange} dateRange Email messages matching the specified date range inclusive will be fetched.
 * @property {CachePolicy} cachePolicy Determines how the email messages will be fetched. Default usage is `remoteOnly`.
 * @property {SortOrder} sortOrder The direction in which the email messages are sorted. Defaults to descending.
 * @property {boolean} includeDeletedMessages A flag to indicate if deleted messages should be included. Defaults to false.
 */
export interface ListEmailMessagesForEmailAddressIdInput extends Pagination {
  emailAddressId: string
  dateRange?: EmailMessageDateRange
  cachePolicy?: CachePolicy
  sortOrder?: SortOrder
  includeDeletedMessages?: boolean
}

/**
 * Input for `SudoEmailClient.listEmailMessagesForEmailFolderId`.
 *
 * @interface ListEmailMessagesForEmailFolderIdInput
 * @property {string} folderId The identifier of the email folder that contains the email message.
 * @property {EmailMessageDateRange} dateRange Email messages matching the specified date range inclusive will be fetched.
 * @property {CachePolicy} cachePolicy Determines how the email messages will be fetched. Default usage is `remoteOnly`.
 * @property {SortOrder} sortOrder The direction in which the email messages are sorted. Defaults to descending.
 * @property {boolean} includeDeletedMessages A flag to indicate if deleted messages should be included. Defaults to false.
 */
export interface ListEmailMessagesForEmailFolderIdInput extends Pagination {
  folderId: string
  dateRange?: EmailMessageDateRange
  cachePolicy?: CachePolicy
  sortOrder?: SortOrder
  includeDeletedMessages?: boolean
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
 * @interface DeleteDraftEmailMessagesInput
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
 * @property {string} senderEmailAddressId Identifier of the email address being used to
 *  send the email. The identifier must match the identifier of the address of the `from` field
 *  in the RFC 6854 data.
 * @property {InternetMessageFormatHeader} emailMessageHeader The email message headers.
 * @property {string} body The text body of the email message.
 * @property {EmailAttachment[]} attachments List of attached files to be sent with the message.
 *  Default is an empty list.
 * @property {EmailAttachment[]} inlineAttachments List of inline attachments to be sent with the message.
 *  Default is an empty list.
 * @property {string} replyingMessageId Optional identifier of the message being replied to.
 * @property {string} forwardingMessageId Optional identifier of the message being forwarded.
 */
export interface SendEmailMessageInput {
  senderEmailAddressId: string
  emailMessageHeader: InternetMessageFormatHeader
  body: string
  attachments: EmailAttachment[]
  inlineAttachments: EmailAttachment[]
  replyingMessageId?: string
  forwardingMessageId?: string
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

/**
 * Input for `SudoEmailClient.deleteMessagesForFolderId`.
 *
 * @interface DeleteMessagesForFolderIdInput
 * @property {string} emailFolderId The identifier of the folder to delete messages from
 * @property {string} emailAddressId The identifier of the email address associated with the folder.
 * @property {boolean} hardDelete If true (default), messages will be completely deleted. If false, messages will be moved to TRASH, unless the folder itself is TRASH.
 */
export interface DeleteMessagesForFolderIdInput {
  emailFolderId: string
  emailAddressId: string
  hardDelete?: boolean
}

/**
 * Input for `SudoEmailClient.scheduleSendDraftMessage`.
 *
 * @interface ScheduleSendDraftMessageInput
 * @property {string} id The identifier of the draft message to schedule send.
 * @property {string} emailAddressId The identifier of the email address to send the message from.
 * @property {Date} sendAt The timestamp of when to send the message. Must be in the future.
 */
export interface ScheduleSendDraftMessageInput {
  id: string
  emailAddressId: string
  sendAt: Date
}

/**
 * Input for `SudoEmailClient.cancelScheduledDraftMessage` method.
 *
 * @interface CancelScheduledDraftMessageInput
 * @property {string} id The identifier of the draft message to cancel
 * @property {string} emailAddressId The identifier of the email address that owns the message.
 */
export interface CancelScheduledDraftMessageInput {
  id: string
  emailAddressId: string
}

/**
 * @property {ScheduledDraftMessageState} equal Return only results that match the given state.
 */
export interface EqualStateFilter {
  equal: ScheduledDraftMessageState
  oneOf?: never
  notEqual?: never
  notOneOf?: never
}

/**
 * @property {ScheduledDraftMessageState[]} oneOf Return only results that match one of the given states.
 */
export interface OneOfStateFilter {
  oneOf: ScheduledDraftMessageState[]
  equal?: never
  notEqual?: never
  notOneOf?: never
}

/**
 * @property {ScheduledDraftMessageState} notEqual Return only results that do not match the given state.
 */
export interface NotEqualStateFilter {
  notEqual: ScheduledDraftMessageState
  equal?: never
  oneOf?: never
  notOneOf?: never
}

/**
 * @property {ScheduledDraftMessageState[]} notOneOf Return only results that do not match any of the given states.
 */
export interface NotOneOfStateFilter {
  notOneOf: ScheduledDraftMessageState[]
  equal?: never
  oneOf?: never
  notEqual?: never
}

/**
 * @interface ScheduledDraftMessageFilterInput
 * @property {EqualStateFilter | OneOfStateFilter | NotEqualStateFilter | NotOneOfStateFilter} state Used to filter results based on `state` property
 */
export interface ScheduledDraftMessageFilterInput {
  state?:
    | EqualStateFilter
    | OneOfStateFilter
    | NotEqualStateFilter
    | NotOneOfStateFilter
}

/**
 * Input for `SudoEmailClient.listScheduledDraftMessagesForEmailAddressId` method.
 *
 * @interface ListScheduledDraftMessagesForEmailAddressIdInput
 * @property {string} emailAddressId The identifier of the email address to list for.
 * @property {ScheduledDraftMessageFilterInput} filter Properties used to filter the results.
 */
export interface ListScheduledDraftMessagesForEmailAddressIdInput
  extends Pagination {
  emailAddressId: string
  filter?: ScheduledDraftMessageFilterInput
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
   * Get a list of all of the email domains on which emails may be provisioned.
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
   * Get a list of all of the email domains for which end-to-end encryption is supported.
   *
   * @param {CachePolicy} cachePolicy Determines how the configured email domains will be fetched. Default usage is
   *   `remoteOnly`.
   * @returns {string[]} A list of all configured domains.
   *
   * @throws NotRegisteredError
   * @throws ServiceError
   */
  getConfiguredEmailDomains(cachePolicy?: CachePolicy): Promise<string[]>

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
   * Delete a custom email folder for the email address identified by emailAddressId.
   * When a custom folder is deleted, any messages in the folder will be moved to TRASH.
   *
   * @param {DeleteCustomEmailFolderInput} input Parameters used to delete a custom email folder.
   * @returns {EmailFolder | undefined} The deleted folder, or undefined if folder was not found.
   */
  deleteCustomEmailFolder(
    input: DeleteCustomEmailFolderInput,
  ): Promise<EmailFolder | undefined>

  /**
   * Update the custom email folder identified by emailFolderId
   *
   * @param {UpdateCustomEmailFolderInput} input Parameters used to update a custom email folder.
   * @returns {EmailFolder} The updated email folder.
   */
  updateCustomEmailFolder(
    input: UpdateCustomEmailFolderInput,
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
   * Any draft email message ids that do not exist will be marked as success.
   * Any emailAddressId that is not owned or does not exist, will throw an error.
   *
   * @param {DeleteDraftEmailMessagesInput} input Parameters used to delete a draft email message.
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
  ): Promise<
    BatchOperationResult<
      DeleteEmailMessageSuccessResult,
      EmailMessageOperationFailureResult
    >
  >

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
   * Lists the metadata and content of all draft email messages for the user.
   *
   * @returns {DraftEmailMessage[]} An array of draft email messages or an empty array if no
   *  matching draft email messages can be found.
   */
  listDraftEmailMessages(): Promise<DraftEmailMessage[]>

  /**
   * Lists the metadata and content of all draft messages for the specified email address identifier.
   *
   * @param {string} emailAddressId The identifier of the email address associated with the draft email messages.
   * @returns {DraftEmailMessage[]} An array of draft email messages or an empty array if no
   *  matching draft email messages can be found.
   */
  listDraftEmailMessagesForEmailAddressId(
    emailAddressId: string,
  ): Promise<DraftEmailMessage[]>

  /**
   * Lists the metadata of all draft email messages for the user.
   *
   * @returns {DraftEmailMessageMetadata[]} An array of draft email message metadata or an empty array if no
   *  matching draft email messages can be found.
   */
  listDraftEmailMessageMetadata(): Promise<DraftEmailMessageMetadata[]>

  /**
   * Lists the metadata of all draft email messages for the specified email address identifier.
   *
   * @param {string} emailAddressId The identifier of the email address associated with the draft email messages.
   * @returns {DraftEmailMessageMetadata[]} An array of draft email message metadata or an empty array if no
   *  matching draft email messages can be found.
   */
  listDraftEmailMessageMetadataForEmailAddressId(
    emailAddressId: string,
  ): Promise<DraftEmailMessageMetadata[]>

  /**
   *
   * @param {ScheduleSendDraftMessageInput} input Parameters used to schedule send a draft message.
   * @returns {ScheduledDraftMessage}
   */
  scheduleSendDraftMessage(
    input: ScheduleSendDraftMessageInput,
  ): Promise<ScheduledDraftMessage>

  /**
   * Cancel a scheduled draft message. If no record of the draft message having been scheduled can be found
   * a RecordNotFoundError will be thrown
   *
   * @param {CancelScheduledDraftMessageInput} input Parameters used to cancel a scheduled draft message
   * @returns {string}
   * @throws {RecordNotFoundError}
   */
  cancelScheduledDraftMessage(
    input: CancelScheduledDraftMessageInput,
  ): Promise<string>

  /**
   * List scheduled draft messages associated with an email address.
   * @param {ListScheduledDraftMessagesForEmailAddressIdInput} input Parameters ued to list scheduled draft messages for an email address
   * @returns {ListOutput<ScheduledDraftMessage>}
   */
  listScheduledDraftMessagesForEmailAddressId(
    input: ListScheduledDraftMessagesForEmailAddressIdInput,
  ): Promise<ListOutput<ScheduledDraftMessage>>

  /**
   * Send an email message using RFC 6854 (supersedes RFC 822)(https://tools.ietf.org/html/rfc6854) data.
   *
   * Email messages sent to in-network recipients (i.e. email addresses that exist within the Sudo Platform)
   * will be sent end-to-end encrypted.
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
  sendEmailMessage(
    input: SendEmailMessageInput,
  ): Promise<SendEmailMessageResult>

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
  ): Promise<
    BatchOperationResult<
      UpdatedEmailMessageSuccess,
      EmailMessageOperationFailureResult
    >
  >

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
  deleteEmailMessages(
    ids: string[],
  ): Promise<
    BatchOperationResult<
      DeleteEmailMessageSuccessResult,
      EmailMessageOperationFailureResult
    >
  >

  /**
   * Delete a single email message identified by id.
   *
   * @param {string} id The identifier of the email message to be deleted.
   * @returns {DeleteEmailMessageSuccessResult | undefined} Result object containing the identifier of the email
   *  message that was deleted, or undefined if the email message could not be deleted.
   *
   * @throws NotRegisteredError
   * @throws LimitExceededError
   * @throws ServiceError
   */
  deleteEmailMessage(
    id: string,
  ): Promise<DeleteEmailMessageSuccessResult | undefined>

  /**
   * Delete all messages for in an email folder.
   * Deletion will be processed asynchronously since it may take a substantial amount of time.
   * This method does not wait for deletion to complete. To check for completion, listen for subscriptions or check list endpoints.
   *
   * @param {DeleteMessagesForFolderIdInput} input Parameters used to delete messages from a folder
   * @returns {string} The id of the folder
   */
  deleteMessagesForFolderId(
    input: DeleteMessagesForFolderIdInput,
  ): Promise<string>

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
   * @param {GetEmailMessageWithBodyInput} input Parameters used to retrieve the data of the email message.
   * @returns {EmailMessageWithBody | undefined} The data associated with the email message or undefined if not found
   */
  getEmailMessageWithBody(
    input: GetEmailMessageWithBodyInput,
  ): Promise<EmailMessageWithBody | undefined>

  /**
   * @deprecated Use `getEmailMessageWithBody` instead to retrieve the body and attachment data.
   *
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
  private readonly emailDomainService: DefaultEmailDomainService
  private readonly emailFolderService: DefaultEmailFolderService
  private readonly emailMessageService: DefaultEmailMessageService
  private readonly emailAddressBlocklistService: EmailAddressBlocklistService
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

  public async listDraftEmailMessageMetadataForEmailAddressId(
    emailAddressId: string,
  ): Promise<DraftEmailMessageMetadata[]> {
    this.log.debug(this.listDraftEmailMessageMetadataForEmailAddressId.name, {
      emailAddressId,
    })

    const useCase = new ListDraftEmailMessageMetadataForEmailAddressIdUseCase(
      this.emailMessageService,
    )
    const { metadata } = await useCase.execute({ emailAddressId })

    return metadata
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
  }: ListScheduledDraftMessagesForEmailAddressIdInput): Promise<
    ListOutput<ScheduledDraftMessage>
  > {
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
