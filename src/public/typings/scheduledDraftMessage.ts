/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Owner } from '@sudoplatform/sudo-common'

export enum ScheduledDraftMessageState {
  // Scheduled to be sent.
  SCHEDULED = 'SCHEDULED',
  // Has failed to be sent.
  FAILED = 'FAILED',
  // Has successfully been sent.
  SENT = 'SENT',
  // Has been cancelled.
  CANCELLED = 'CANCELLED',
}

/**
 * The Sudo Platform SDK representation of a draft message that has been scheduled to be sent by the email service.
 * 
 * @interface ScheduledDraftMessage
 * @property {string} id The identifier of the draft message that has been scheduled.
 * @property {string} emailAddressId The identifier of the email address associated with the message.
 * @property {string} owner Identifier of the user that owns the email address.
 * @property {Owner[]} owners List of identifiers of user/accounts associated with this email address.
 * @property {Date} sendAt The timestamp of when the message is scheduled to be sent.
 * @property {ScheduledDraftMessageState} state The current state of the scheduled message.
 * @property {Date} createdAt Date when the scheduled message was created.
 * @property {Date} updatedAt Date when the scheduled message was last updated.
 */
export interface ScheduledDraftMessage {
  id: string
  emailAddressId: string
  owner: string
  owners: Owner[]
  sendAt: Date
  state: ScheduledDraftMessageState
  createdAt: Date
  updatedAt: Date
}