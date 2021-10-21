import { IdentityServiceConfig } from '@sudoplatform/sudo-user/lib/core/sdk-config'
import { SudoEmailClientOptions } from '../../../public/sudoEmailClient'
import { ApiClient } from './apiClient'
import { EmailServiceConfig } from './config'

/**
 * Private DefaultSudoEmailClient for describing private options
 * for supporting unit testing.
 */
export type PrivateSudoEmailClientOptions = {
  apiClient?: ApiClient
  identityServiceConfig?: IdentityServiceConfig
  emailServiceConfig?: EmailServiceConfig
} & SudoEmailClientOptions
