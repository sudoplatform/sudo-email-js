/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The Sudo Platform SDK representation of a date range object.
 *
 * @interface DateRange
 * @property {Date} startDate The starting date of the range to query.
 * @property {Date} endDate The ending date of the range to query.
 */
export interface DateRange {
  startDate: Date
  endDate: Date
}
