/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { SortOrder as SortOrderGraphQL } from '../../../../gen/graphqlTypes'
import { SortOrder } from '../../../../public/typings/sortOrder'

export class SortOrderTransformer {
  fromAPItoGraphQL(data: SortOrder): SortOrderGraphQL {
    switch (data) {
      case SortOrder.Asc:
        return SortOrderGraphQL.Asc
      case SortOrder.Desc:
        return SortOrderGraphQL.Desc
    }
  }

  fromGraphQLtoAPI(data: SortOrderGraphQL): SortOrder {
    switch (data) {
      case SortOrderGraphQL.Asc:
        return SortOrder.Asc
      case SortOrderGraphQL.Desc:
        return SortOrder.Desc
    }
  }
}
