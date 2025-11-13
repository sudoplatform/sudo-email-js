/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CachePolicy,
  ListOutput,
  SudoCryptoProvider,
  SudoKeyManager,
} from '@sudoplatform/sudo-common'
import { SudoUserClient } from '@sudoplatform/sudo-user'
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
import { ScheduledDraftMessage, UpdatedEmailMessageSuccess } from './typings'
import {
  BatchOperationResult,
  EmailMessageOperationFailureResult,
} from './typings/batchOperationResult'
import { UnsealedBlockedAddress } from './typings/blockedAddresses'
import { ConfigurationData } from './typings/configurationData'
import { DeleteEmailMessageSuccessResult } from './typings/deleteEmailMessageSuccessResult'
import { DraftEmailMessage } from './typings/draftEmailMessage'
import { DraftEmailMessageMetadata } from './typings/draftEmailMessageMetadata'
import { EmailAddress } from './typings/emailAddress'
import { EmailAddressPublicInfo } from './typings/emailAddressPublicInfo'
import { EmailFolder } from './typings/emailFolder'
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
import {
  DeprovisionEmailMaskInput,
  DisableEmailMaskInput,
  EnableEmailMaskInput,
  ListEmailMasksForOwnerInput,
  ProvisionEmailMaskInput,
  UpdateEmailMaskInput,
} from './inputs/emailMask'
import { EmailMask } from './typings/emailMask'

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
   * Get a list of all of the email domains on which email masks may be provisioned.
   *
   * @param {CachePolicy} cachePolicy Determines how the email mask domains will be fetched. Default usage is
   *   `remoteOnly`.
   * @returns {string[]} A list of email mask domains.
   *
   * @throws NotRegisteredError
   * @throws ServiceError
   */
  getEmailMaskDomains(cachePolicy?: CachePolicy): Promise<string[]>

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
   * Cancels a scheduled draft message. If no matching scheduled message is found,
   * the operation completes successfully without error.
   *
   * @param {CancelScheduledDraftMessageInput} input Parameters used to cancel a scheduled draft message
   * @returns {string}
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
   * Send a masked email message using RFC 6854 (supersedes RFC 822)(https://tools.ietf.org/html/rfc6854) data.
   *
   * Email messages sent to in-network recipients (i.e. email addresses/masks that exist within the Sudo Platform)
   * will be sent end-to-end encrypted.
   *
   * @param {SendMaskedEmailMessageInput} input Parameters used to send a masked email message.
   * @returns {string} The identifier of the masked email message that is being sent.
   *
   * @throws {@link UnauthorizedAddressError}
   * @throws {@link InvalidEmailContentsError}
   * @throws NotAuthorizedError
   * @throws NotRegisteredError
   * @throws LimitExceededError
   * @throws InsufficientEntitlementsError
   */
  sendMaskedEmailMessage(
    input: SendMaskedEmailMessageInput,
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
   * Provisions a new email mask with the specified configuration.
   *
   * @param {ProvisionEmailMaskInput} input The input parameters for provisioning the email mask
   * @returns {EmailMask} A promise that resolves to the newly created email mask
   */
  provisionEmailMask(input: ProvisionEmailMaskInput): Promise<EmailMask>

  /**
   * Deprovisions an existing email mask, permanently removing it from the system.
   *
   * @param {DeprovisionEmailMaskInput} input The input parameters for deprovisioning the email mask
   * @returns {EmailMask} A promise that resolves to the deprovisioned email mask
   */
  deprovisionEmailMask(input: DeprovisionEmailMaskInput): Promise<EmailMask>

  /**
   * Updates the metadata or expiration date of an existing email mask.
   *
   * @param {UpdateEmailMaskInput} input The input parameters for updating the email mask
   * @returns {EmailMask} A promise that resolves to the updated email mask
   */
  updateEmailMask(input: UpdateEmailMaskInput): Promise<EmailMask>

  /**
   * Enables a previously disabled email mask, allowing it to forward emails again.
   *
   * @param {EnableEmailMaskInput} input The input parameters for enabling the email mask
   * @returns {EmailMask} A promise that resolves to the enabled email mask
   */
  enableEmailMask(input: EnableEmailMaskInput): Promise<EmailMask>

  /**
   * Disables an active email mask, preventing it from forwarding emails.
   *
   * @param {DisableEmailMaskInput} input The input parameters for disabling the email mask
   * @returns {EmailMask} A promise that resolves to the disabled email mask
   */
  disableEmailMask(input: DisableEmailMaskInput): Promise<EmailMask>

  /**
   * Lists email masks owned by the current user, with optional filtering and pagination.
   *
   * @param {ListEmailMasksForOwnerInput} input The input parameters for filtering and pagination
   * @returns {ListOutput<EmailMask>} A promise that resolves to a list of email masks and pagination info
   */
  listEmailMasksForOwner(
    input?: ListEmailMasksForOwnerInput,
  ): Promise<ListOutput<EmailMask>>

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
