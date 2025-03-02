/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy } from '@sudoplatform/sudo-common'
import { FetchPolicy } from 'apollo-client/core/watchQueryOptions'

export class FetchPolicyTransformer {
  static transformCachePolicy(cachePolicy: CachePolicy): FetchPolicy {
    switch (cachePolicy) {
      case CachePolicy.CacheOnly:
        return 'cache-only'
      case CachePolicy.RemoteOnly:
        return 'network-only'
    }
  }
}
