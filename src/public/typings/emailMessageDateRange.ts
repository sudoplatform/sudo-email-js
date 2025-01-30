/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DateRange } from './dateRange'

/**
 * The Sudo Platform SDK representation of an email message date range.
 * 
 * Note that both timestamps cannot be specified otherwise an {@link InvalidArgumentError} will occur.
 *
 * @type EmailMessageDateRange
 * @property {DateRange} sortDate The specification of the sortDate 
 *  timestamp to perform the date range query on.
 * @property {DateRange} updatedAt The specification of the updatedAt 
 *  timestamp to perform the date range query on.
 */
export type EmailMessageDateRange = { sortDate: DateRange } | { updatedAt: DateRange }