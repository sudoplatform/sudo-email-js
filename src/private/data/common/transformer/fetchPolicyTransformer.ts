import { CachePolicy } from '@sudoplatform/sudo-common'
import { FetchPolicy } from 'apollo-client/core/watchQueryOptions'

export class FetchPolicyTransformer {
  transformCachePolicy(cachePolicy: CachePolicy): FetchPolicy {
    switch (cachePolicy) {
      case CachePolicy.CacheOnly:
        return 'cache-only'
      case CachePolicy.RemoteOnly:
        return 'network-only'
    }
  }
}
