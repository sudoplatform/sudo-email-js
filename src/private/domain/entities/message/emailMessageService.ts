/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy } from '@sudoplatform/sudo-common'
import { EmailMessageSubscriber } from '../../../../public'
import { DateRange } from '../../../../public/typings/dateRange'
import { SortOrder } from '../../../../public/typings/sortOrder'
import { DraftEmailMessageEntity } from './draftEmailMessageEntity'
import { DraftEmailMessageMetadataEntity } from './draftEmailMessageMetadataEntity'
import { EmailMessageEntity } from './emailMessageEntity'
import { UpdateEmailMessagesStatus } from './updateEmailMessagesStatus'

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
 * Input for `EmailMessageService.listDraftsMetadata` method.
 *
 * @interface ListDraftsMetadataInput
 * @property {string} emailAddressId Identifier of the email address associated with the draft email messages.
 */
export interface ListDraftsMetadataInput {
  emailAddressId: string
}

/**
 * Input for `EmailMessageService.deleteDrafts` method.
 *
 * @interface DeleteDraftInput
 * @property {string} id Identifier of the draft email message to be deleted.
 * @property {string} emailAddressId Identifier of the email address associated with the draft email message.
 */
export interface DeleteDraftInput {
  id: string
  emailAddressId: string
}

/**
 * Input for `EmailMessageService.sendMessage` method.
 *
 * @interface SendMessageInput
 * @property {ArrayBuffer} rfc822Data RFC 822 data of the email message to be sent.
 * @property {string} senderEmailAddressId Identifier of the sender email address that is composing the email message.
 */
export interface SendMessageInput {
  rfc822Data: ArrayBuffer
  senderEmailAddressId: string
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
 * @property {string[]} successIds List of email message ids that succeeded to update, if any.
 * @property {string[]} failedIds List of email message ids that failed to update, if any.
 */
export interface UpdateEmailMessagesOutput {
  status: UpdateEmailMessagesStatus
  successIds?: string[]
  failureIds?: string[]
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
 * Input for `EmailMessageService.listMessagesForEmailAddressId` method.
 *
 * @interface ListEmailMessagesForEmailAddressIdInput
 * @property {string} emailAddressId The identifier of the email address associated with the email messages.
 * @property {CachePolicy} cachePolicy Cache policy determines the strategy for accessing the email message records.
 * @property {DateRange} dateRange Email messages created within the date range inclusive will be fetched.
 * @property {number} limit Number of records to return. If omitted, the limit defaults to 10.
 * @property {SortOrder} sortOrder The direction in which the email messages are sorted. Defaults to descending.
 * @property {string} nextToken A token generated by a previous call to `EmailMessageService.listMessagesForEmailAddressId`.
 */
export interface ListEmailMessagesForEmailAddressIdInput {
  emailAddressId: string
  cachePolicy?: CachePolicy
  dateRange?: DateRange
  limit?: number
  sortOrder?: SortOrder
  nextToken?: string
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
 * @property {CachePolicy} cachePolicy Cache policy determines the strategy for accessing the email message records.
 * @property {DateRange} dateRange Email messages created within the date range inclusive will be fetched.
 * @property {number} limit Number of records to return. If omitted, the limit defaults to 10.
 * @property {SortOrder} sortOrder The direction in which the email messages are sorted. Defaults to descending.
 * @property {string} nextToken A token generated by a previous call to `EmailMessageService.listMessagesForEmailFolderId`.
 */
export interface ListEmailMessagesForEmailFolderIdInput {
  folderId: string
  cachePolicy?: CachePolicy
  dateRange?: DateRange
  limit?: number
  sortOrder?: SortOrder
  nextToken?: string
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

export class EmailMessageServiceDeleteDraftError extends Error {
  readonly id: string
  constructor(id: string) {
    super(id)
    this.id = id
  }
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
   * Delete a single draft email message.
   *
   * @param {DeleteDraftInput} input Parameters used to delete a draft email message.
   * @returns {string} The identifier of the draft email message that was deleted.
   */
  deleteDraft(input: DeleteDraftInput): Promise<string>

  /**
   * Get a saved draft email message.
   *
   * @param {GetDraftInput} input Parameters used to get a draft email message.
   * @returns {ArrayBuffer | undefined} The draft email message, or undefined if not found.
   */
  getDraft(input: GetDraftInput): Promise<DraftEmailMessageEntity | undefined>

  /**
   * List draft email message identifiers.
   *
   * @param {ListDraftsMetadataInput} input Parameters used to list draft email messages.
   * @returns {string[]} A list of draft email message identifiers. Can be empty if no draft messages found.
   */
  listDraftsMetadata(
    input: ListDraftsMetadataInput,
  ): Promise<DraftEmailMessageMetadataEntity[]>

  /**
   * Send an email message.
   *
   * @param {SendMessageInput} input Parameters used to send an email message.
   * @returns {string} The identifier of the email message that was sent.
   * @memberof EmailMessageService
   */
  sendMessage(input: SendMessageInput): Promise<string>

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
   * Get an email message.
   *
   * @param {GetEmailMessageInput} input Parameters used to get an email message.
   * @returns {EmailMessageEntity | undefined} The email message, or undefined if not found.
   */
  getMessage(
    input: GetEmailMessageInput,
  ): Promise<EmailMessageEntity | undefined>

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
