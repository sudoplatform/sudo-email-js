/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The Sudo Platform SDK representation of the result of a successful update to an email message.
 *
 * @interface UpdatedEmailMessageSuccess
 * @property {string} id The unique id of the message.
 * @property {Date} createdAt The timestamp of when the message was created
 * @property {Date} updatedAt The timestamp of when the message was updated
 */
export interface UpdatedEmailMessageSuccess {
  id: string
  createdAt: Date
  updatedAt: Date
}