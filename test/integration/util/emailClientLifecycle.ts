/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultApiClientManager } from '@sudoplatform/sudo-api-client'
import {
  DefaultConfigurationManager,
  DefaultLogger,
  DefaultSudoKeyManager,
  SudoCryptoProvider,
  SudoKeyManager,
} from '@sudoplatform/sudo-common'
import {
  DefaultSudoEntitlementsClient,
  SudoEntitlementsClient,
} from '@sudoplatform/sudo-entitlements'
import { DefaultSudoEntitlementsAdminClient } from '@sudoplatform/sudo-entitlements-admin'
import {
  DefaultSudoProfilesClient,
  FetchOption,
  Sudo,
  SudoProfilesClient,
} from '@sudoplatform/sudo-profiles'
import {
  DefaultSudoUserClient,
  SudoUserClient,
  TESTAuthenticationProvider,
} from '@sudoplatform/sudo-user'
import { WebSudoCryptoProvider } from '@sudoplatform/sudo-web-crypto-provider'
import * as fs from 'fs'
import { v4 } from 'uuid'
import { ApiClient } from '../../../src/private/data/common/apiClient'
import { PrivateSudoEmailClientOptions } from '../../../src/private/data/common/privateSudoEmailClientOptions'
import { AddressNotFoundError } from '../../../src/public/errors'
import {
  DefaultSudoEmailClient,
  SudoEmailClient,
  SudoEmailClientConfig,
} from '../../../src/public/sudoEmailClient'
import { EmailAddress } from '../../../src/public/typings/emailAddress'
import { createSudo } from './createSudo'
import { EntitlementsBuilder } from './entitlements'

// [START] - Polyfills
global.fetch = require('node-fetch')
require('isomorphic-fetch')
// [END] - Polyfills

// eslint-disable-next-line @typescript-eslint/no-var-requires
global.crypto = require('crypto').webcrypto

export const sudoIssuer = 'sudoplatform.sudoservice'

const configFile = 'config/sudoplatformconfig.json'
const registerKeyFile = 'config/register_key.private'
const registerKeyIdFile = 'config/register_key.id'
const registerKey = fs.readFileSync(registerKeyFile).toString()
const registerKeyId = fs.readFileSync(registerKeyIdFile).toString().trim()

const adminApiKeyFile = 'config/admin_api_key.secret'
let adminApiKey: string | undefined
if (fs.existsSync(adminApiKeyFile)) {
  adminApiKey = fs.readFileSync(adminApiKeyFile).toString().trim()
} else {
  adminApiKey = process.env.ADMIN_API_KEY?.trim()
}

const testAuthenticationProvider = new TESTAuthenticationProvider(
  'email-js-test',
  registerKey,
  registerKeyId,
  { 'custom:entitlementsSet': 'email-integration-test' },
)

export interface SetupEmailClientOutput {
  sudo: Sudo
  ownershipProofToken: string
  emailClient: SudoEmailClient
  userClient: SudoUserClient
  entitlementsClient: SudoEntitlementsClient
  profilesClient: SudoProfilesClient
  keyManagers: {
    user: SudoKeyManager
    profiles: SudoKeyManager
    email: SudoKeyManager
  }
  cryptoProviders: {
    user: SudoCryptoProvider
    profiles: SudoCryptoProvider
    email: SudoCryptoProvider
  }
}

export const setupEmailClient = async (
  log: DefaultLogger,
  clientConfig: SudoEmailClientConfig = {},
): Promise<SetupEmailClientOutput> => {
  try {
    if (!adminApiKey) {
      throw new Error('ADMIN_API_KEY must be set')
    }

    const userCryptoProvider = new WebSudoCryptoProvider(
      'SudoUserClient',
      'com.sudoplatform.appservicename',
    )
    const userKeyManager = new DefaultSudoKeyManager(userCryptoProvider)

    const profilesCryptoProvider = new WebSudoCryptoProvider(
      'SudoProfileClient',
      'com.sudoplatform.appservicename',
    )
    const profilesKeyManager = new DefaultSudoKeyManager(profilesCryptoProvider)

    const emailCryptoProvider = new WebSudoCryptoProvider(
      'SudoEmailClient',
      'com.sudoplatform.appservicename',
    )
    const emailKeyManager = new DefaultSudoKeyManager(emailCryptoProvider)

    DefaultConfigurationManager.getInstance().setConfig(
      fs.readFileSync(configFile).toString(),
    )
    const userClient = new DefaultSudoUserClient({
      logger: log,
      sudoKeyManager: userKeyManager,
    })

    const username = await userClient
      .registerWithAuthenticationProvider(
        testAuthenticationProvider,
        `email-JS-SDK-${v4()}`,
      )
      .catch((err) => {
        console.log('Error regisering user', { err })
        throw err
      })
    log.debug('username', { username })
    await userClient.signInWithKey().catch((err) => {
      console.log('Error signing in', { err })
      throw err
    })

    const apiClientManager =
      DefaultApiClientManager.getInstance().setAuthClient(userClient)
    const entitlementsClient = new DefaultSudoEntitlementsClient(userClient)
    const entitlementsAdminClient = new DefaultSudoEntitlementsAdminClient(
      adminApiKey,
    )
    await new EntitlementsBuilder()
      .setEntitlementsClient(entitlementsClient)
      .setEntitlementsAdminClient(entitlementsAdminClient)
      .setLogger(log)
      .apply()
      .catch((err) => {
        console.log('Error applying entitlements', { err })
        throw err
      })
    const profilesClient = new DefaultSudoProfilesClient({
      sudoUserClient: userClient,
      keyManager: profilesKeyManager,
    })
    await profilesClient
      .pushSymmetricKey('emailIntegrationTest', '01234567890123456789')
      .catch((err) => {
        console.log('Error pushing Sudo symmetric key', { err })
        throw err
      })

    const { sudo, ownershipProofToken } = await createSudo(
      'emailIntegrationTest',
      profilesClient,
    ).catch((err) => {
      console.log('Error creating Sudo', { err })
      throw err
    })

    const apiClient = new ApiClient(apiClientManager)
    const options: PrivateSudoEmailClientOptions = {
      sudoUserClient: userClient,
      sudoCryptoProvider: emailCryptoProvider,
      apiClient,
      sudoKeyManager: emailKeyManager,
      sudoEmailClientConfig: {
        ...clientConfig,
      },
    }
    const emailClient = new DefaultSudoEmailClient(options)
    await emailClient.reset().catch((err) => {
      console.log('Error resetting email client', { err })
      throw err
    })

    return {
      ownershipProofToken,
      emailClient,
      userClient,
      entitlementsClient,
      profilesClient,
      sudo,
      keyManagers: {
        user: userKeyManager,
        profiles: profilesKeyManager,
        email: emailKeyManager,
      },
      cryptoProviders: {
        user: userCryptoProvider,
        profiles: profilesCryptoProvider,
        email: emailCryptoProvider,
      },
    }
  } catch (err) {
    log.error(`${setupEmailClient.name} FAILED`)
    console.log(`${setupEmailClient.name} FAILED`)
    throw err
  }
}

export const teardown = async (
  props: { emailAddresses: EmailAddress[]; sudos: Sudo[] },
  clients: {
    emailClient: SudoEmailClient
    profilesClient: SudoProfilesClient
    userClient: SudoUserClient
  },
): Promise<void> => {
  const subject = await clients.userClient?.getSubject()
  await Promise.all(
    props.emailAddresses
      .filter((a) => !!a)
      .map(
        async (a) =>
          await clients.emailClient
            .deprovisionEmailAddress(a.id)
            .catch((err) => {
              if (err instanceof AddressNotFoundError) {
                return
              }
              console.log(
                `Error deleting ${subject} Email Address ${a.id}: ${err.message}`,
              )
            }),
      ),
  )
  // This needs to be done due to a bug in profiles client to hydrate cache.
  await clients.profilesClient?.listSudos(FetchOption.RemoteOnly)
  await Promise.all(
    props.sudos
      .filter((s) => !!s)
      .map((s) =>
        clients.profilesClient?.deleteSudo(s)?.catch((err) => {
          console.log(`Error deleting ${subject} Sudo ${s.id}: ${err.message}`)
        }),
      ),
  )
}
