import { internal as SudoUserInternal } from '@sudoplatform/sudo-user'
import { SudoEmailClientOptions } from '../../../public/sudoEmailClient'
import { ApiClient } from './apiClient'
import { EmailServiceConfig } from './config'

/**
 * Private DefaultSudoEmailClient for describing private options
 * for supporting unit testing.
 */
export type PrivateSudoEmailClientOptions = {
  apiClient?: ApiClient
  identityServiceConfig?: SudoUserInternal.IdentityServiceConfig
  emailServiceConfig?: EmailServiceConfig
} & SudoEmailClientOptions
