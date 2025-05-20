/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { ListOperationResult } from '@sudoplatform/sudo-common'
import { EmailAddress, SealedEmailAddressProps } from './emailAddress'
import { EmailMessage, SealedEmailMessageProps } from './emailMessage'

/**
 * The result object for list email addresses APIs.
 *
 * - On success, contains the list of requested email addresses.
 * - On partial success, contains the list of email addresses that
 *   were fetched and unsealed successfully as well as the list of
 *   email addresses that could not be unsealed successfully and
 *   the error indicating why unsealing failed. An email address
 *   may fail to unseal if the client version is not up to date
 *   or the required cryptographic key is missing from the client
 *   device.
 * - On failure, contains an error object indicating why the list
 *   operation failed.
 */
export type ListEmailAddressesResult = ListOperationResult<
  EmailAddress,
  SealedEmailAddressProps
>

/**
 * The result object for list email messages APIs.
 *
 * - On success, contains the list of requested email messages.
 * - On partial success, contains the list of email messages that
 *   were fetched and unsealed successfully as well as the list of
 *   email messages that could not be unsealed successfully and
 *   the error indicating why unsealing failed. An email message
 *   may fail to unseal if the client version is not up to date
 *   or the required cryptographic key is missing from the client
 *   device.
 * - On failure, contains an error object indicating why the list
 *   operation failed.
 */
export type ListEmailMessagesResult = ListOperationResult<
  EmailMessage,
  SealedEmailMessageProps
>
