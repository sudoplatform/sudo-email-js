/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy } from '@sudoplatform/sudo-common'
import {
  EmailMessageOperationFailureResult,
  EmailMessageSubscriber,
  ScheduledDraftMessageState,
  UpdatedEmailMessageSuccess,
} from '../../../../public'
import { EmailMessageDateRange } from '../../../../public/typings/emailMessageDateRange'
import { SortOrder } from '../../../../public/typings/sortOrder'
import { EmailMessageDetails } from '../../../util/rfc822MessageDataProcessor'
import { EmailAddressPublicInfoEntity } from '../account/emailAddressPublicInfoEntity'
import { DraftEmailMessageEntity } from './draftEmailMessageEntity'
import { DraftEmailMessageMetadataEntity } from './draftEmailMessageMetadataEntity'
import { EmailMessageEntity } from './emailMessageEntity'
import { EmailMessageWithBodyEntity } from './emailMessageWithBodyEntity'
import { UpdateEmailMessagesStatus } from './updateEmailMessagesStatus'
import { ScheduledDraftMessageEntity } from './scheduledDraftMessageEntity'

/**
 * Input for `EmailMessageService.saveDraft` method.
 *
 * @interface SaveDraftInput
 * @property {ArrayBuffer} rfc822Data Draft email message in RFC 822 data form to save.
 * @property {string} senderEmailAddressId Identifier of the sender email address that is composing the draft email message.
 * @property {string} id Optional identifier of an existing draft email message to update.
 */
export interface SaveDraftInput {
  rfc822Data: ArrayBuffer
  senderEmailAddressId: string
  id?: string
}

/**
 * Input for `EmailMessageService.getDraft` method.
 *
 * @interface GetDraftInput
 * @property {string} id Identifier of the draft email message to retrieve.
 * @property {string} emailAddressId Identifier of the email address associated with the draft email message.
 */
export interface GetDraftInput {
  id: string
  emailAddressId: string
}

/**
 * Input for `EmailMessageService.listDraftsMetadataForEmailAddressId` method.
 *
 * @interface ListDraftsMetadataForEmailAddressIdInput
 * @property {string} emailAddressId Identifier of the email address associated with the draft email messages.
 */
export interface ListDraftsMetadataForEmailAddressIdInput {
  emailAddressId: string
}

/**
 * Input for `EmailMessageService.deleteDrafts` method.
 *
 * @interface DeleteDraftsInput
 * @property {string[]} ids Identifiers of the draft email messages to be deleted.
 * @property {string} emailAddressId Identifier of the email address associated with the draft email messages.
 */
export interface DeleteDraftsInput {
  ids: string[]
  emailAddressId: string
}

/**
 * Input for `EmailMessageService.scheduleSendDraftMessage` method.
 *
 * @interface ScheduleSendDraftMessageInput
 * @property {string} id The identifier of the draft message to schedule send
 * @property {string} emailAddressId The identifier of the email address to send the draft message from.
 * @property {Date} sendAt Timestamp of when to send the message.
 */
export interface ScheduleSendDraftMessageInput {
  id: string
  emailAddressId: string
  sendAt: Date
}

/**
 * Input for `EmailMessageService.cancelScheduledDraftMessage` method.
 *
 * @interface CancelScheduledDraftMessageInput
 * @property {string} id The identifier of the draft message to cancel
 * @property {string} emailAddressId The identifier of the email address that owns the message.
 */
export interface CancelScheduledDraftMessageInput {
  id: string
  emailAddressId: string
}

interface EqualStateFilter {
  equal: ScheduledDraftMessageState
  oneOf?: never
  notEqual?: never
  notOneOf?: never
}

interface OneOfStateFilter {
  oneOf: ScheduledDraftMessageState[]
  equal?: never
  notEqual?: never
  notOneOf?: never
}

interface NotEqualStateFilter {
  notEqual: ScheduledDraftMessageState
  equal?: never
  oneOf?: never
  notOneOf?: never
}

interface NotOneOfStateFilter {
  notOneOf: ScheduledDraftMessageState[]
  equal?: never
  oneOf?: never
  notEqual?: never
}

/**
 * @interface ScheduledDraftMessageFilterInput
 * @property {ScheduledDraftMessageStateFilterInput} state Used to filter results based on `state` property
 */
export interface ScheduledDraftMessageFilterInput {
  state?:
    | EqualStateFilter
    | OneOfStateFilter
    | NotEqualStateFilter
    | NotOneOfStateFilter
}

/**
 * Input for `EmailMessageService.listScheduledDraftMessagesForEmailAddressId` method.
 *
 * @interface ListScheduledDraftMessagesForEmailAddressIdInput
 * @property {string} emailAddressId The identifier of the email address to list for.
 * @property {ScheduledDraftMessageFilterInput} filter Properties used to filter the results.
 * @property {number} limit Number of records to return. If omitted, the limit defaults to 10.
 * @property {string} nextToken A token generated by a previous call to `EmailMessageService.listScheduledDraftMessagesForEmailAddressId`.
 */
export interface ListScheduledDraftMessagesForEmailAddressIdInput {
  emailAddressId: string
  filter?: ScheduledDraftMessageFilterInput
  limit?: number
  nextToken?: string
}

/**
 * Input for `EmailMessageService.sendMessage` method.
 *
 * @interface SendMessageInput
 * @property {EmailMessageDetails} message The email message header and contents to be sent.
 * @property {string} senderEmailAddressId Identifier of the sender email address that is composing the email message.
 * @property {number} emailMessageMaxOutboundMessageSize The maximum size of an outbound email message.
 */
export interface SendMessageInput {
  message: EmailMessageDetails
  senderEmailAddressId: string
  emailMessageMaxOutboundMessageSize: number
}

/**
 * Input for `EmailMessageService.sendEncryptedMessage` method.
 *
 * @interface SendEncryptedMessageInput
 * @property {EmailMessageDetails} message The email message header and contents to be sent.
 * @property {string} senderEmailAddressId Identifier of the sender email address that is composing the email message.
 * @property {EmailAddressPublicInfoEntity[]} emailAddressesPublicInfo The public key information for each recipient and the sender of the email message.
 * @property {number} emailMessageMaxOutboundMessageSize The maximum size of an outbound email message.
 */
export interface SendEncryptedMessageInput {
  message: EmailMessageDetails
  senderEmailAddressId: string
  emailAddressesPublicInfo: EmailAddressPublicInfoEntity[]
  emailMessageMaxOutboundMessageSize: number
}

/**
 * Output for `EmailMessageService.sendEmailMessage` method.
 *
 * @interface SendEmailMessageOutput
 * @property {string} id The unique identifier of the message.
 * @property {Date} createdAt The timestamp in which the message was created.
 */
export interface SendEmailMessageOutput {
  id: string
  createdAt: Date
}

/**
 * Input for `EmailMessageService.updateMessages` method.
 *
 * @interface UpdateEmailMessagesInput
 * @property {string[]} ids The identifiers of email messages to be updated.
 * @property values The new value(s) to set for each listed email message.
 */
export interface UpdateEmailMessagesInput {
  ids: string[]
  values: { folderId?: string; seen?: boolean }
}

/**
 * Output for `EmailMessageService.updateMessages` method.
 *
 * @interface UpdateEmailMessagesOutput
 * @property {UpdateEmailMessagesStatus} status The status of the email message update operation.
 * @property {UpdatedEmailMessageSuccess[]} successMessages List of email messages that updated and their timestamps.
 * @property {EmailMessageOperationFailureResult[]} failureMessages List of email messages that failed and their error type.
 */
export interface UpdateEmailMessagesOutput {
  status: UpdateEmailMessagesStatus
  successMessages?: UpdatedEmailMessageSuccess[]
  failureMessages?: EmailMessageOperationFailureResult[]
}

/**
 * Input for `EmailMessageService.deleteMessages` method.
 *
 * @interface DeleteEmailMessagesInput
 * @property {string[]} ids Identifiers of email messages to be deleted.
 */
export interface DeleteEmailMessagesInput {
  ids: string[]
}

/**
 * Input for `EmailMessageService.getEmailMessageRfc822Data` method.
 *
 * @interface GetEmailMessageRfc822DataInput
 * @property {string} id Identifier of the message to retrieve.
 * @property {string} emailAddressId Identifier of the email address associated with the email message.
 */
export interface GetEmailMessageRfc822DataInput {
  id: string
  emailAddressId: string
}

/**
 * Input for `EmailMessageService.getEmailMessageWithBody` method.
 *
 * @interface GetEmailMessageWithBodyInput
 * @property {string} id Identifier of the message to retrieve.
 * @property {string} emailAddressId Identifier of the email address associated with the email message.
 */
export interface GetEmailMessageWithBodyInput {
  id: string
  emailAddressId: string
}

/**
 * Input for `EmailMessageService.getMessage` method.
 *
 * @interface GetEmailMessageInput
 * @property {string} id The identifier of the email message to retrieve.
 * @property {CachePolicy} cachePolicy Cache policy determines the strategy for accessing the email message records.
 */
export interface GetEmailMessageInput {
  id: string
  cachePolicy?: CachePolicy
}

/**
 * Input for `EmailMessageService.listMessages` method.
 *
 * @interface ListEmailMessagesInput
 * @property {EmailMessageDateRange} dateRange Email messages matching the specified date range inclusive will be fetched.
 * @property {CachePolicy} cachePolicy Cache policy determines the strategy for accessing the email message records.
 * @property {number} limit Number of records to return. If omitted, the limit defaults to 10.
 * @property {SortOrder} sortOrder The direction in which the email messages are sorted. Defaults to descending.
 * @property {string} nextToken A token generated by a previous call to `EmailMessageService.listMessages`.
 * @property {boolean} includeDeletedMessages A flag to indicate if deleted messages should be included. Defaults to false.
 */
export interface ListEmailMessagesInput {
  dateRange?: EmailMessageDateRange
  cachePolicy?: CachePolicy
  limit?: number
  sortOrder?: SortOrder
  nextToken?: string
  includeDeletedMessages?: boolean
}

/**
 * Output for `EmailMessageService.listMessages` method.
 *
 * @interface ListEmailMessagesOutput
 * @property {EmailMessageEntity[]} emailMessages The list of email messages retrieved in this query.
 * @property {string} nextToken A token generated by a previous call. This allows for pagination.
 */
export interface ListEmailMessagesOutput {
  emailMessages: EmailMessageEntity[]
  nextToken?: string
}

/**
 * Input for `EmailMessageService.listMessagesForEmailAddressId` method.
 *
 * @interface ListEmailMessagesForEmailAddressIdInput
 * @property {string} emailAddressId The identifier of the email address associated with the email messages.
 * @property {EmailMessageDateRange} dateRange Email messages matching the specified date range inclusive will be fetched.
 * @property {CachePolicy} cachePolicy Cache policy determines the strategy for accessing the email message records.
 * @property {number} limit Number of records to return. If omitted, the limit defaults to 10.
 * @property {SortOrder} sortOrder The direction in which the email messages are sorted. Defaults to descending.
 * @property {string} nextToken A token generated by a previous call to `EmailMessageService.listMessagesForEmailAddressId`.
 * @property {boolean} includeDeletedMessages A flag to indicate if deleted messages should be included. Defaults to false.
 */
export interface ListEmailMessagesForEmailAddressIdInput {
  emailAddressId: string
  dateRange?: EmailMessageDateRange
  cachePolicy?: CachePolicy
  limit?: number
  sortOrder?: SortOrder
  nextToken?: string
  includeDeletedMessages?: boolean
}

/**
 * Output for `EmailMessageService.listMessagesForEmailAddressId` method.
 *
 * @interface ListEmailMessagesForEmailAddressIdOutput
 * @property {EmailMessageEntity[]} emailMessages The list of email messages retrieved in this query.
 * @property {string} nextToken A token generated by a previous call. This allows for pagination.
 */
export interface ListEmailMessagesForEmailAddressIdOutput {
  emailMessages: EmailMessageEntity[]
  nextToken?: string
}

/**
 * Input for `EmailMessageService.listMessagesForEmailFolderId` method.
 *
 * @interface ListEmailMessagesForEmailFolderIdInput
 * @property {string} folderId The identifier of the email folder associated with the email messages.
 * @property {EmailMessageDateRange} dateRange Email messages matching the specified date range inclusive will be fetched.
 * @property {CachePolicy} cachePolicy Cache policy determines the strategy for accessing the email message records.
 * @property {number} limit Number of records to return. If omitted, the limit defaults to 10.
 * @property {SortOrder} sortOrder The direction in which the email messages are sorted. Defaults to descending.
 * @property {string} nextToken A token generated by a previous call to `EmailMessageService.listMessagesForEmailFolderId`.
 * @property {boolean} includeDeletedMessages A flag to indicate if deleted messages should be included. Defaults to false.
 */
export interface ListEmailMessagesForEmailFolderIdInput {
  folderId: string
  dateRange?: EmailMessageDateRange
  cachePolicy?: CachePolicy
  limit?: number
  sortOrder?: SortOrder
  nextToken?: string
  includeDeletedMessages?: boolean
}

/**
 * Output for `EmailMessageService.listMessagesForEmailFolderId` method.
 *
 * @interface ListEmailMessagesForEmailFolderIdOutput
 * @property {EmailMessageEntity[]} emailMessages The list of email messages retrieved in this query.
 * @property {string} nextToken A token generated by a previous call. This allows for pagination.
 */
export interface ListEmailMessagesForEmailFolderIdOutput {
  emailMessages: EmailMessageEntity[]
  nextToken?: string
}

/**
 * Output for `EmailMessageService.listScheduledDraftMessagesForEmailAddressId` method.
 *
 * @interface ListScheduledDraftMessagesOutput
 * @property {ScheduledDraftMessageEntity[]} scheduledDraftMessages The list of scheduled draft messages retrieved in this query.
 * @property {string} nextToken A token generated by a previous call. This allows for pagination.
 */
export interface ListScheduledDraftMessagesOutput {
  scheduledDraftMessages: ScheduledDraftMessageEntity[]
  nextToken?: string
}

/**
 * Input for `EmailMessageService.subscribeToEmailMessages` method.
 *
 * @interface EmailMessageServiceSubscribeToEmailMessagesInput
 * @property {string} subscriptionId ID that will be used to identity the subscription.
 * @property {string} ownerId ID of the calling owner.
 * @property {EmailAddressSubscriber} subscriber Object representing the email address subscriber.
 */
export interface EmailMessageServiceSubscribeToEmailMessagesInput {
  subscriptionId: string
  ownerId: string
  subscriber: EmailMessageSubscriber
}

/**
 * Input for `EmailMessageService.unsubscribeFromEmailMessages` method.
 *
 * @interface EmailMessageServiceUnsubscribeFromEmailMessagesInput
 * @property {string} subscriptionId ID of the subscription from which to be unsubscribed.
 */
export interface EmailMessageServiceUnsubscribeFromEmailMessagesInput {
  subscriptionId: string
}

export class EmailMessageServiceDeleteDraftsError extends Error {
  readonly ids: string[]
  readonly message: string
  constructor(ids: string[], message: string) {
    super(`Failed to delete ids: ${ids}`)
    this.ids = ids
    this.message = message
  }
}

/**
 * Core entity representation of an email message service used in business logic. Used to perform operations for email messages.
 *
 * @interface EmailMessageService
 */
export interface EmailMessageService {
  /**
   * Save a draft email message.
   *
   * @param {SaveDraftInput} input Parameters used to save a draft email message.
   * @returns {string} Identifier of the draft email message that was saved.
   */
  saveDraft(input: SaveDraftInput): Promise<DraftEmailMessageMetadataEntity>

  /**
   * Delete draft email messages.
   *
   * @param {DeleteDraftsInput} input Parameters used to delete draft email messages.
   * @returns {{ id: string; reason: string }[]} The id and reason for any failed deletes.
   */
  deleteDrafts(
    input: DeleteDraftsInput,
  ): Promise<{ id: string; reason: string }[]>

  /**
   * Get a saved draft email message.
   *
   * @param {GetDraftInput} input Parameters used to get a draft email message.
   * @returns {ArrayBuffer | undefined} The draft email message, or undefined if not found.
   */
  getDraft(input: GetDraftInput): Promise<DraftEmailMessageEntity | undefined>

  /**
   * List draft email message metadata for the specified email address identifier.
   *
   * @param {ListDraftsMetadataForEmailAddressIdInput} input Parameters used to list draft email message metadata.
   * @returns {DraftEmailMessageMetadataEntity[]} A list of draft email message metadata. Can be empty if no draft messages found.
   */
  listDraftsMetadataForEmailAddressId(
    input: ListDraftsMetadataForEmailAddressIdInput,
  ): Promise<DraftEmailMessageMetadataEntity[]>

  /**
   * Schedule a draft message to be sent
   *
   * @param {ScheduleSendDraftMessageInput} input Parameters used to schedule a draft message to be sent.
   * @returns {ScheduledDraftMessageEntity}
   */
  scheduleSendDraftMessage(
    input: ScheduleSendDraftMessageInput,
  ): Promise<ScheduledDraftMessageEntity>

  /**
   * Cancel a scheduled draft message. If the scheduled draft cannot be found, an error will be thrown.
   *
   * @param {CancelScheduledDraftMessageInput} input Parameters used to cancel a scheduled draft message
   * @returns {string} The identifier of the schduled draft that has been cancelled.
   */
  cancelScheduledDraftMessage(
    input: CancelScheduledDraftMessageInput,
  ): Promise<string>

  /**
   *List scheduled draft messages for an email address
   * @param {ListScheduledDraftMessagesForEmailAddressIdInput} input Parameters needed to list scheduled draft messages for an email address
   * @returns {ListScheduledDraftMessagesOutput}
   */
  listScheduledDraftMessagesForEmailAddressId(
    input: ListScheduledDraftMessagesForEmailAddressIdInput,
  ): Promise<ListScheduledDraftMessagesOutput>

  /**
   * Send an email message.
   *
   * @param {SendMessageInput} input Parameters used to send an email message.
   * @returns {string} The identifier of the email message that was sent.
   * @memberof EmailMessageService
   */
  sendMessage(input: SendMessageInput): Promise<SendEmailMessageOutput>

  /**
   * Send an E2E encrypted message.
   *
   * @param {SendEncryptedMessageInput} input Parameters used to send an E2E encrypted message.
   * @returns {string} The identifier of the email message that was sent.
   * @memberof EmailMessageService
   */
  sendEncryptedMessage(
    input: SendEncryptedMessageInput,
  ): Promise<SendEmailMessageOutput>

  /**
   * Update a list of email messages.
   *
   * @param {UpdateEmailMessagesInput} input Parameters used to update a list of email messages.
   * @returns {UpdateEmailMessagesOutput} A list of any email messages that failed and succeeded to update.
   */
  updateMessages(
    input: UpdateEmailMessagesInput,
  ): Promise<UpdateEmailMessagesOutput>

  /**
   * Delete email messages
   *
   * @param {EmailMessageServiceMessageDraftInput} input Parameters used to delete a draft email message.
   * @returns {string[]} The identifiers of any email messages that failed to delete.
   */
  deleteMessages(input: DeleteEmailMessagesInput): Promise<string[]>

  /**
   * Get the RFC 822 data of an email message.
   *
   * @param {GetEmailMessageRfc822DataInput} input Parameters used to get the RFC 822 data of an email message.
   * @returns {ArrayBuffer | undefined} The draft email message, or undefined if not found.
   */
  getEmailMessageRfc822Data(
    input: GetEmailMessageRfc822DataInput,
  ): Promise<ArrayBuffer | undefined>

  /**
   * Get the body and attachments of an email message.
   *
   * @param {GetEmailMessageWithBodyInput} input Parameters used to get the body of an email message
   * @returns {EmailMessageWithBodyEntity | undefined} The email message with the body and attachments or undefined if not found
   */
  getEmailMessageWithBody(
    input: GetEmailMessageWithBodyInput,
  ): Promise<EmailMessageWithBodyEntity | undefined>

  /**
   * Get an email message.
   *
   * @param {GetEmailMessageInput} input Parameters used to get an email message.
   * @returns {EmailMessageEntity | undefined} The email message, or undefined if not found.
   */
  getMessage(
    input: GetEmailMessageInput,
  ): Promise<EmailMessageEntity | undefined>

  /**
   * List all email messages associated with the user.
   *
   * @param {ListEmailMessagesInput} input Parameters used to get a list of all email messages for a user.
   * @returns {ListEmailMessagesOutput} The list of any email messages. Can be empty if no messages found.
   */
  listMessages(input: ListEmailMessagesInput): Promise<ListEmailMessagesOutput>

  /**
   * List email messages associated with the email address.
   *
   * @param {ListEmailMessagesForEmailAddressIdInput} input Parameters used to get a list of email messages for an email address.
   * @returns {ListEmailMessagesForEmailAddressIdOutput} The list of any email messages. Can be empty if no messages found.
   */
  listMessagesForEmailAddressId(
    input: ListEmailMessagesForEmailAddressIdInput,
  ): Promise<ListEmailMessagesForEmailAddressIdOutput>

  /**
   * List email messages associated with an email folder.
   *
   * @param {ListEmailMessagesForEmailFolderIdInput} input Parameters used to get a list of email messages for an email folder.
   * @returns {ListEmailMessagesForEmailFolderIdOutput} The list of any email messages. Can be empty if no messages found.
   */
  listMessagesForEmailFolderId(
    input: ListEmailMessagesForEmailFolderIdInput,
  ): Promise<ListEmailMessagesForEmailFolderIdOutput>

  /**
   * Subscribe to email message events.
   *
   * @param {EmailMessageServiceSubscribeToEmailMessagesInput} input Input parameters to subscribe to email message events.
   */
  subscribeToEmailMessages(
    input: EmailMessageServiceSubscribeToEmailMessagesInput,
  ): void

  /**
   * Unsubcribe from email message events.
   *
   * @param {EmailMessageServiceUnsubscribeFromEmailMessagesInput} input Input parameters to unsubscribe from email message events.
   */
  unsubscribeFromEmailMessages(
    input: EmailMessageServiceUnsubscribeFromEmailMessagesInput,
  ): void
}
