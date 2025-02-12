/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Base64,
  CachePolicy,
  DefaultLogger,
  SudoKeyManager,
} from '@sudoplatform/sudo-common'
import {
  EmailAddress,
  EmailAttachment,
  SendEmailMessageInput,
  SudoEmailClient,
} from '../../../src'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient, internal } from '@sudoplatform/sudo-user'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import waitForExpect from 'wait-for-expect'
import { EmailMessageWithBody } from '../../../src/public/typings/emailMessageWithBody'
import { S3Client } from '../../../src/private/data/common/s3Client'
import { ApiClient } from '../../../src/private/data/common/apiClient'
import { v4 } from 'uuid'
import {
  EmailMessageDirection,
  EmailMessageEncryptionStatus,
  EmailMessageState,
  SealedEmailMessage,
} from '../../../src/gen/graphqlTypes'
import { getEmailServiceConfig } from '../../../src/private/data/common/config'
import {
  CompleteMultipartUploadOutput,
  PutObjectCommandInput,
  S3,
} from '@aws-sdk/client-s3'
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers'
import { Upload } from '@aws-sdk/lib-storage'
import fs from 'node:fs/promises'

describe('getEmailMessageWithBody test suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let emailAddresses: EmailAddress[] = []

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let ownershipProofToken: string
  let apiClient: ApiClient
  let keyManager: SudoKeyManager
  let s3Client: S3Client
  let legacyMessageKey = ''
  let bucket = ''
  let region = ''
  let imageData: string = ''
  let pdfData: string = ''

  let emailAddress: EmailAddress

  beforeAll(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
    ownershipProofToken = result.ownershipProofToken
    apiClient = result.apiClient
    keyManager = result.keyManagers.email
    const emailServiceConfig = getEmailServiceConfig()
    bucket = emailServiceConfig.bucket
    region = emailServiceConfig.region

    s3Client = new S3Client(
      userClient,
      internal.getIdentityServiceConfig().identityService,
    )

    emailAddress = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
    )
    emailAddresses.push(emailAddress)
    imageData = await fs.readFile('test/util/files/dogimage.jpeg', {
      encoding: 'base64',
    })
    pdfData = await fs.readFile('test/util/files/lorem-ipsum.pdf', {
      encoding: 'base64',
    })
  })

  afterAll(async () => {
    await teardown(
      { emailAddresses, sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
    emailAddresses = []
    if (legacyMessageKey !== '') {
      await s3Client.delete({
        bucket: internal.getIdentityServiceConfig().identityService.bucket,
        region: internal.getIdentityServiceConfig().identityService.region,
        key: legacyMessageKey,
      })
    }
  })

  function generateSendInput(
    body: string,
    to = [{ emailAddress: 'success@simulator.amazonses.com' }],
    attachments: EmailAttachment[] = [],
  ): SendEmailMessageInput {
    return {
      senderEmailAddressId: emailAddress.id,
      emailMessageHeader: {
        from: { emailAddress: emailAddress.emailAddress },
        to,
        cc: [],
        bcc: [],
        replyTo: [],
        subject: 'Testing rfc822Data',
      },
      body,
      attachments,
      inlineAttachments: [],
    }
  }

  function waitForRfc822Data(emailMessageId: string): Promise<any> {
    return waitForExpect(
      () =>
        expect(
          instanceUnderTest.getEmailMessageRfc822Data({
            id: emailMessageId,
            emailAddressId: emailAddress.id,
          }),
        ).resolves.toBeDefined(),
      60000,
      10000,
    )
  }

  describe('unencrypted path', () => {
    it('gets message data successfully for multiple sent messages', async () => {
      const emailBodies = [
        'Hello, World',
        'I have come here to bury Caeser,\nNot to praise him.\nThe evil that men do lives after them.\nThe good is often interred with their bones.',
        'Life is not meant to be easy, my child; but take courage: it can be delightful.',
      ]
      const inputs = emailBodies.map((body) => generateSendInput(body))
      const results = await Promise.all(
        inputs.map(
          async (input) => await instanceUnderTest.sendEmailMessage(input),
        ),
      )
      const emailMessageIds = results.map((r) => r.id)
      expect(emailMessageIds.length).toEqual(emailBodies.length)

      for (let index = 0; index < emailMessageIds.length; ++index) {
        await waitForRfc822Data(emailMessageIds[index])
        const messageWithBody = await instanceUnderTest.getEmailMessageWithBody(
          {
            id: emailMessageIds[index],
            emailAddressId: emailAddress.id,
          },
        )

        expect(messageWithBody).toStrictEqual<EmailMessageWithBody>({
          id: emailMessageIds[index],
          body: emailBodies[index],
          attachments: [],
          inlineAttachments: [],
        })
      }
    })

    it('works for emails with attachments', async () => {
      const body = 'This message has an attachment'

      const imageAttachment: EmailAttachment = {
        data: imageData,
        filename: 'dogImage.jpg',
        inlineAttachment: false,
        mimeType: 'image/jpg',
        contentTransferEncoding: 'base64',
        contentId: undefined,
      }

      const input = generateSendInput(
        body,
        [{ emailAddress: 'success@simulator.amazonses.com' }],
        [imageAttachment],
      )

      const result = await instanceUnderTest.sendEmailMessage(input)
      expect(result.id).toBeDefined()

      await waitForRfc822Data(result.id)

      const messageWithBody = await instanceUnderTest.getEmailMessageWithBody({
        emailAddressId: emailAddress.id,
        id: result.id,
      })

      expect(messageWithBody).toStrictEqual<EmailMessageWithBody>({
        id: result.id,
        body: body,
        attachments: [imageAttachment],
        inlineAttachments: [],
      })
    })
  })

  describe('encrypted path', () => {
    it('gets message data successfully for multiple sent messages', async () => {
      const emailBodies = [
        'Hello, World',
        'I have come here to bury Caeser,\nNot to praise him.\nThe evil that men do lives after them.\nThe good is often interred with their bones.',
        'Life is not meant to be easy, my child; but take courage: it can be delightful.',
      ]
      const inputs = emailBodies.map((body) =>
        generateSendInput(body, [{ emailAddress: emailAddress.emailAddress }]),
      )
      const results = await Promise.all(
        inputs.map(
          async (input) => await instanceUnderTest.sendEmailMessage(input),
        ),
      )
      const emailMessageIds = results.map((r) => r.id)
      expect(emailMessageIds.length).toEqual(emailBodies.length)

      for (let index = 0; index < emailMessageIds.length; ++index) {
        await waitForRfc822Data(emailMessageIds[index])
        const messageWithBody = await instanceUnderTest.getEmailMessageWithBody(
          {
            id: emailMessageIds[index],
            emailAddressId: emailAddress.id,
          },
        )

        expect(messageWithBody).toStrictEqual<EmailMessageWithBody>({
          id: emailMessageIds[index],
          body: emailBodies[index],
          attachments: [],
          inlineAttachments: [],
        })
      }
    })

    it('works with attachments', async () => {
      const body = 'This has an attachment'

      const pdfData = await fs.readFile('test/util/files/lorem-ipsum.pdf', {
        encoding: 'base64',
      })
      const pdfAttachment: EmailAttachment = {
        data: pdfData,
        filename: 'lorem-ipsum.pdf',
        inlineAttachment: false,
        mimeType: 'application/pdf',
        contentTransferEncoding: 'base64',
        contentId: undefined,
      }

      const input = generateSendInput(
        body,
        [{ emailAddress: emailAddress.emailAddress }],
        [pdfAttachment],
      )

      const sendResult = await instanceUnderTest.sendEmailMessage(input)

      await waitForRfc822Data(sendResult.id)

      const messageWithBody = await instanceUnderTest.getEmailMessageWithBody({
        id: sendResult.id,
        emailAddressId: emailAddress.id,
      })

      expect(messageWithBody).toStrictEqual<EmailMessageWithBody>({
        id: sendResult.id,
        body,
        attachments: [pdfAttachment],
        inlineAttachments: [],
      })
    })
  })

  it('does not return deleted messages', async () => {
    const sendInput = generateSendInput('Test body', [
      { emailAddress: emailAddress.emailAddress },
    ])
    const sendResult = await instanceUnderTest.sendEmailMessage(sendInput)

    await waitForExpect(
      async () => {
        await expect(
          instanceUnderTest.getEmailMessage({
            id: sendResult.id,
            cachePolicy: CachePolicy.RemoteOnly,
          }),
        ).resolves.toBeDefined()
      },
      60000,
      10000,
    )

    await expect(
      instanceUnderTest.deleteEmailMessage(sendResult.id),
    ).resolves.toEqual({ id: sendResult.id })

    await expect(
      instanceUnderTest.getEmailMessageWithBody({
        emailAddressId: emailAddress.id,
        id: sendResult.id,
      }),
    ).resolves.toBeUndefined()
  })

  it('works with legacy email', async () => {
    // Initialize data
    const legacyEmailMessageKeyId = '38392063-2E6B-456D-A2D6-B8F92E908324'
    const legacyEmailMessagePrivateKeyRawString =
      'MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCxyo1o6slBCE6nBl5iXji5uknUWeMQcB8FvYw2+zvjiBg5SZXA3Z8qWWaYpVtT150VBD5QUC/7X6tvIx3GfzmzsA1xqaceyPAlhfEa6NTlNjcRNCaSDAyKevWNOYbINf2fMuEypeBcpDKSQ6cR5FlKvhAVJk6BuYkZZ2EKoVT+nmBjT2KYy7blWBzISFJmoSkIvCiDU4hrtqJiv/Nsqn+m5y+MZYWGIibJOblaE1Hl+TwJd+J/DOsGqi1ZxkdusGnJa9H1rXqBAlDeLvYi5X/MkNZv6CXTcLvcg+J4xTs3Q+3npR/db7nV7hTg135VtYMpXAUrAnPMJkTh2CL7G0SrAgMBAAECggEAIayovg+CUPP+2bnmFKGeAuea5kKkNE/YQGEXdq59OGpllCww1hfj9sR6Hz1qn+W91eY420Nk4yrKsMEo+ZjNWBBna3jjs3wBqEnHUf55nHR5V6PWDmGD2pLRgY88zR0UzZt4dfxfE4zyGyv/L+9dTj/Tkf3wbreylQI0qivGincqDZeioYmXokWikisWt0lqjiYbgUHJWdwYNE0uHhCuyCEgN4oT/+VY3wGjEuBqVsRnEVeiLuQ0SKbJyYeQ2Zra7QZZdlYlWBQ38XElgwRLTncZMqzq5mRm3SyINlqyb/bVQoqcuQaV9Eeg0iVQNcrbl4VRjidMw2tcfFnBsZogOQKBgQDeYULzCibpbIQROno9jT7Av7uACy23JTP9ZirCWfDvvlM3utYbps0561qEs2rh4BfbKoMzSBNCizn4IwvqyjwHsXEllYwFZkcV60xJ0rxS9RHyv6nwlOp4J93q8Mkm1OC5KeXtlIwzOck1ARDHmgX2pSkQR8LcNpv3xL1tZ9naHwKBgQDMq5Sbv/h9SlugpULQJPeKGJsn+icK19CJy/HNqaGkWa3tChVPo8jQUQCtD679zli1qNiFwCevrsoYybmsaSW8E5838QTmgjVsngSJtBX9FSbVdn6lCb4blLxLU7S0srXsI3xEgLXYWAMxtobAu78HfJyG5IJqAwx1VeWFL1vb9QKBgFLKZRF0sx3uL5D2c3Ic9sLt3tGB1+g6aoupkLvAnmmzMuopnfK3e+pXS+DhpyYmttr6jdP2vmzkxpUx/wrPdd/rWNOERJfyBv8LFeDaGxDLen4kixEtb8mCFiWUtV7GnE9zYM29oyCjH9yi4+tb1WKJBKux+8Leddydm2Ry6HFDAoGBAJmKeqDhQjxT5Ss970KRCPcbgIJcIp/6yWImko70G+RctqLl9pjZSRQmQHiUFHYpL9mQAmdMgTlFyi0QYG9cLkfK/J4N/NwkgImsfcEETZ6gGJL5IwcSqQCt8xgbgqwwiVPORzJo0IKtfC/2O18pOaUXMaHsmX2ILfd0agwhPCtlAoGBAKOD+ET+G+cslYbriaSh18AYavTz4YIhAFvAcSXmJ/QxAqvgh6n0MqaZQpgk/F+rEs6uyfksPzF2kK9UpNBzIEL0USNJ4yzSXmQYQzvMgu4xGhjOeZzqFW9Nch14b2z3wzSZM1l8wbWzMmlL8qP49U47dO7UTljLUMHpG4nKu1sE'
    const legacyEmailMessagePrivateKeyRawBytes = Uint8Array.from(
      atob(legacyEmailMessagePrivateKeyRawString),
      (c) => c.charCodeAt(0),
    )
    const legacyEmailMessageStr = Base64.decodeString(
      'UmVjZWl2ZWQ6IGZyb20gaXAtMTAtMTkyLTAtNi5hcC1zb3V0aGVhc3QtMi5jb21wdXRlLmludGVybmFsIChbMTAuMTkyLjAuNl0gaGVsbz1zeWRkMXJzMDIpDQoJYnkgbXgxLmRldi5hbm9ueW9tZS5jb20gd2l0aCBlc210cHMgIChUTFMxLjIpIHRscyBUTFNfRUNESEVfUlNBX1dJVEhfQUVTXzI1Nl9HQ01fU0hBMzg0DQoJKEV4aW0gNC45NSkNCgkoZW52ZWxvcGUtZnJvbSA8c21haWw4OTU2QHRlc3R5b21lLmNvbT4pDQoJaWQgMXJ1bm1tLTAwMHJrNC1UUQ0KCWZvciBjY3Rlc3Q4QHRlc3R5by5tZTsNCglUaHUsIDExIEFwciAyMDI0IDA2OjE5OjQ4ICswMDAwDQpEYXRlOiBUaHUsIDExIEFwciAyMDI0IDE2OjE5OjQ4ICsxMDAwDQpGcm9tOiBUZXN0IDxzbWFpbDg5NTZAdGVzdHlvbWUuY29tPg0KVG86ICI9P3V0Zi04P1E/Y2N0ZXN0OD00MHRlc3R5by5tZT89IiA8Y2N0ZXN0OEB0ZXN0eW8ubWU+DQpNZXNzYWdlLUlEOiA8MTUwNTA5MjM3NC4zODkuMTcxMjgxNjM4ODg5OC5zbWFpbDg5NTZAdGVzdHlvbWUuY29tPg0KU3ViamVjdDogSGkNClgtU3Vkb21haWwtRW5jcnlwdGlvbjogYW5vbnlvbWUNCk1JTUUtVmVyc2lvbjogMS4wDQpDb250ZW50LVR5cGU6IG11bHRpcGFydC9taXhlZDsgYm91bmRhcnk9IjY2MTc4MTA0XzMyN2IyM2M2XzQ4ZjIiDQoNCi0tNjYxNzgxMDRfMzI3YjIzYzZfNDhmMg0KQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi94LXN1ZG9tYWlsLWtleQ0KQ29udGVudC1UcmFuc2Zlci1FbmNvZGluZzogYmFzZTY0DQpDb250ZW50LUlEOiA8c2VjdXJla2V5ZXhoYW5nZWRhdGFAc3Vkb21haWwuY29tPg0KQ29udGVudC1EaXNwb3NpdGlvbjogYXR0YWNobWVudDsgZmlsZW5hbWU9IlNlY3VyZSBEYXRhIDIiDQoNCmV5SmxibU55ZVhCMFpXUkxaWGtpT2lKclRHTmFOVUpKVHpCdFEzaDRZM1ZpU1dRNFJGRkZWV3hTT0UweU5XVnJOR2RuUmpaQmJqSlYNCmNUTXpYQzlrY0hsSlRuSnhWWGRLVjJ0U1VtdGxhekZRWVV0NFJqQnNhR1JwWWtsMk1rWk5RMmRzTVRWMVVYRmhObVJVT1c5NE5qbEoNClNraHhORTQwYURaV1VUSkpNVWxTZVVVME5EZDZhSEl6V201Q2JHSnFNRzFGU1hkWGFFTm9NM1kwU0dWNFhDOXBVemxxVG1kRk5GQksNCk1UZDBPWFJUVjFsSlJuQkdlWFJKYTJsUVdYVkxiR1pSWXpNMU9FazFNMmR3Ym1JellrZHZPVkYxVW5Sdk9YTmtNekU1U1ZaVGNsSksNClFXdDZRMWMxZVhOd1dWZFJlazFtVFZKME9WUlpVM2R4VERScFMxd3ZTVWhMYlVWcWVHZHhlVVJ2VDNONVJFVklOa2xIZVRCc1RrTjENCmJHMUdabFpJYzJsTGNuaDZVek0wWlRnNU5rRTJkVlYzYW10aFIwOXlkbmhUYUd0S2NtYzVhbWRITkRCaFRHeHdkRmczUTJoNlVUaFcNCk9WRkVWbEZCUTJkVmNVZzBRM0ZsZGtGSVdGRTlQU0lzSW5CMVlteHBZMHRsZVVsa0lqb2lNemd6T1RJd05qTXRNa1UyUWkwME5UWkUNCkxVRXlSRFl0UWpoR09USkZPVEE0TXpJMElpd2lZV3huYjNKcGRHaHRJam9pVWxOQlhDOUZRMEpjTDA5QlJWQlhhWFJvVTBoQkxURkINCmJtUk5SMFl4VUdGa1pHbHVaeUo5DQoNCi0tNjYxNzgxMDRfMzI3YjIzYzZfNDhmMg0KQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi94LXN1ZG9tYWlsLWtleQ0KQ29udGVudC1UcmFuc2Zlci1FbmNvZGluZzogYmFzZTY0DQpDb250ZW50LUlEOiA8c2VjdXJla2V5ZXhoYW5nZWRhdGFAc3Vkb21haWwuY29tPg0KQ29udGVudC1EaXNwb3NpdGlvbjogYXR0YWNobWVudDsgZmlsZW5hbWU9IlNlY3VyZSBEYXRhIDEiDQoNCmV5SmxibU55ZVhCMFpXUkxaWGtpT2lKUk5YcHJhMlJKVlVVNWRGaHVTM2hzWW1OeFpIaHZhV3RNV2xocU56TjRjMDEzY213NWVVSnYNClYzWk1ORkkyWWl0QlIyMUdVRXcwZFdSNFFuWnZRalZuYWxSa1oxRmpNa1Z5U1dJNFNFRTJaR1ZMZVVGamMwSTRSbnBSZGxkV09HVm8NCmNVbHZRamxsVmt4WlIycFJWSHBRVFdveVNFOHdPWGx4WmpWRU0yMXFPSFJoWmpSSVJIRlZSbGRWZVd4U1IwWk1ha1ZEVlU1cGJESncNCk1ITjRRMHRrWmtSQk1GRkhNRXQwZEUxUlUyOUhiWGwyYmxGS0syRk9OWHBWY21keVdFdHNVVTV5Tld0dVdFbEJURlJ0V21Oc2RIZzUNClRGSTNWbVF3Wm1wNFJYaHpjSEV4Wm14QldVcFhXRzFzVEcxQlNsd3ZaazVHSzNSMVoxRXhZMWxJTjNkcVdGSklOVmhHVVdKM1pFdDMNCllVVkxOR05aYjJjeVZEQmxRemhRZVRSMGVIY3djMFZjTDBwUlVURkJNemhYWEM5S2EzY3JVRlVyWldwSWJHbGxOVXhtTkVSMGRWSnoNCldqTjJhVGhvUVhoTFNWTkxWbWRDVWt0SE4yYzlQU0lzSW5CMVlteHBZMHRsZVVsa0lqb2lNemd6T1RJd05qTXRNa1UyUWkwME5UWkUNCkxVRXlSRFl0UWpoR09USkZPVEE0TXpJMElpd2lZV3huYjNKcGRHaHRJam9pVWxOQlhDOUZRMEpjTDA5QlJWQlhhWFJvVTBoQkxURkINCmJtUk5SMFl4VUdGa1pHbHVaeUo5DQoNCi0tNjYxNzgxMDRfMzI3YjIzYzZfNDhmMg0KQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi94LXN1ZG9tYWlsLWJvZHkNCkNvbnRlbnQtVHJhbnNmZXItRW5jb2Rpbmc6IGJhc2U2NA0KQ29udGVudC1JRDogPHNlY3VyZWJvZHlAc3Vkb21haWwuY29tPg0KQ29udGVudC1EaXNwb3NpdGlvbjogYXR0YWNobWVudDsgZmlsZW5hbWU9IlNlY3VyZSBFbWFpbCAiDQoNCmV5SnBibWwwVm1WamRHOXlTMlY1U1VRaU9pSTFjRlZvY1RaaVNEWkJjVVphVGtsM1JtUmFaRXBuUFQwaUxDSmxibU55ZVhCMFpXUkUNCllYUmhJam9pY1c5WlltSmxiVFZDWVZGc1IxTndSRnBXTkVoSmFGcG5UVnd2YjNGRFFYcHlWWE53T0c1TldEZFZVMU4yWWtwSlVWcFENCk5ISklTa2RhWlZoV05tOVllRlptUVRsemNraFdRWFJ5WldVd2VWVmhhMEZUTW14VFhDODNNV2t3ZEVGUE1HWmxNMWRhVDFoUFF5dFENClZVeDRTRmN3YjFCU1QwcFBWVmwyY3padVZtWkdOa1ZqZHpCY0wwOWhORVF5U1ROMlpXdFNTRU5RZVhZM2RIUlRjMkZOUVZBMU9IbHkNCmVVaDFNa28yTkVoUmFHZG5Wek5wWm10YVRHYzJlR3hqVm5kclRGbHNSRWhsVERSNE1rc3dWVlZpWmxOSVNsWkdWMFpuU25BMFdubzMNClVrNUpNblJQTVRWalNESlZXVEZTVlVkMU1ITkNXVVo1VlRCeldYbDJhM1J1VERKQ1pHRnhlbE50TVdzME5tZGhTVGxVWlVFMll6Qm4NCmRWcEhUbTh3VVRCVFRURjVPVEZ3WkN0TVNESmNMMGMxV0hGUmFtcHhhMUp2WlZwS1VuVmpSMUJJWVU1bVkwdFVVekZZTlRKMVNsQkcNClJHUnhPVTFDYlRGclkzRTVSR1I0UzJwVlRGZGFXR3BPTVhKak1HMHlaRGRsT0VZclIxcFpOamxjTDNWRVprVnpVRzFKVTFCY0wwTkUNClVYUlViWEoyUnpCbVVUbHFaVzAxU2x3dk9HcFRVR00ySzBGUE9VbGtjRlJCYTBab1pGcE5NbkF3YUdaRk9UbFVNV1Z1UzBZMFFWb3INClVIQmpPRFZLTkdsdVpGSXhUVlJFTlhOblIwRTVhRlprTlVWMVpqTkNUbFZFZDFCUlNVbFJOMFpLYW5KVU1IWlRTa1JTYUVFMVdrbGENCk1uUnhhelpOZG5GU05HOW1TM3BHYkRBMVUxQklkRlZLYnpSTmIwUlNabU5xY1ZKUU1ETm9lVEZ1ZWtOcmQyNU9SRmhoTmpWR2QxRlQNCk1HUjNhRkpjTDJsSk1WWlFSVVozS3pJd1VubHFVbTUzY21aWFZ5dFJaMmhrZUhaNVRrVlhNbUlyUW1vM1lqaDFjVXRpTVZCSVVreFQNClRscDRVMDlVYUZWb05qUTJaa1JFY1hwaFNrdFBVVEJ2UzFwWVlWQjBlRkJ2VUZSRU9FcGhkMDVrY0ROQlJYUkRYQzlWV0hSVVZEY3kNCmNVUXdTV0pxZG10VmQzZDNNMUp4V2xFd1VFd3dUM2hLYVZsVE1IaHJNVnd2TTFjNWNGZzRNREIzV2paY0x6QTNlbEJZYWtOTFRUTnMNClJYbDJTVFF4Ym5Ob04zRkNVVFY2VDNOTGRWTXpiMDVZY0ZSbWVrUk5ZMWROZVhCMmNIWnVkRFExUmtOdU9EZHdZVEF4TjBGRWMwWk0NClR6aElVM1pWV2pjMFJ6bDViM2RJWkVsaE4weFhRazRyUlU1bFJqQm5hRk01Y1Vjd1NFZDZiMnRxYTFCaFNGQm5VRzk0VVU1d05WcHkNCk9XVk1kMkZSYkdOT2VWcGtTRlZMVVQwOUluMD0NCg0KLS02NjE3ODEwNF8zMjdiMjNjNl80OGYyLS0NCg==',
    )
    const legacyEmailMessageId = v4()
    const timestamp = new Date()
    const dummySealedEmailMessage: SealedEmailMessage = {
      __typename: 'SealedEmailMessage',
      id: legacyEmailMessageId,
      createdAtEpochMs: timestamp.getTime(),
      direction: EmailMessageDirection.Inbound,
      emailAddressId: emailAddress.id,
      encryptionStatus: EmailMessageEncryptionStatus.Encrypted,
      folderId: 'dummyFolderId',
      owner: emailAddress.id,
      owners: [{ id: emailAddress.id, issuer: '' }],
      rfc822Header: {
        keyId: legacyEmailMessageKeyId,
        algorithm: '',
        base64EncodedSealedData: '',
        plainTextType: '',
        __typename: 'SealedAttribute',
      },
      seen: false,
      repliedTo: false,
      forwarded: false,
      size: 1.0,
      sortDateEpochMs: timestamp.getTime(),
      state: EmailMessageState.Delivered,
      updatedAtEpochMs: timestamp.getTime(),
      version: 1,
    }

    /**
     * For this test, we will mock the appsync client so that we can trick
     * the service into thinking that the legacy email exists in the service,
     * then manually put the RFC822 data into s3 so that it can be downloaded
     */
    jest
      .spyOn(apiClient, 'getEmailMessage')
      .mockResolvedValueOnce(dummySealedEmailMessage)

    // Add private key into keystore
    await keyManager.addPrivateKey(
      legacyEmailMessagePrivateKeyRawBytes,
      legacyEmailMessageKeyId,
    )

    // Upload message data to appropriate s3 location
    const identityId = await userClient.getUserClaim('custom:identityId')
    const authToken = await userClient.getLatestAuthToken()
    const keyForAddress = `${identityId}/email/${emailAddress.id}`
    const keyForMessage = `${keyForAddress}/${legacyEmailMessageId}-${legacyEmailMessageKeyId}`
    const identityServiceConfig =
      internal.getIdentityServiceConfig().identityService
    const providerName = `cognito-idp.${region}.amazonaws.com/${identityServiceConfig.poolId}`
    const credentials = fromCognitoIdentityPool({
      identityPoolId: identityServiceConfig.identityPoolId,
      logins: {
        [providerName]: authToken,
      },
      clientConfig: { region },
    })
    const s3 = new S3({
      region,
      credentials,
    })

    const params: PutObjectCommandInput = {
      Bucket: bucket,
      Key: keyForMessage,
      Body: legacyEmailMessageStr,
      // Setting the contentEncoding here in order to make the service skip the unsealing
      ContentEncoding: 'sudoplatform-binary-data',
    }

    const managedUpload = new Upload({
      client: s3,
      params,
    })
    const output: CompleteMultipartUploadOutput = await managedUpload.done()

    expect(output.Key).toBeDefined()

    legacyMessageKey = output.Key!

    const result = await instanceUnderTest.getEmailMessageWithBody({
      id: legacyEmailMessageId,
      emailAddressId: emailAddress.id,
    })

    expect(result?.id).toEqual(legacyEmailMessageId)
    expect(result?.body).toContain('Hello')
  })
})
