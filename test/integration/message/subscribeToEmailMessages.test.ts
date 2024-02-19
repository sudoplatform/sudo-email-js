import {
  CachePolicy,
  DefaultLogger,
  ListOperationResultStatus,
} from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { v4 } from 'uuid'
import waitForExpect from 'wait-for-expect'
import {
  ConnectionState,
  EmailAddress,
  EmailMessage,
  EmailMessageSubscriber,
  SudoEmailClient,
} from '../../../src'
import { str2ab } from '../../util/buffer'
import { createEmailMessageRfc822String } from '../util/createEmailMessage'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { generateSafeLocalPart } from '../util/provisionEmailAddress'
import { anything, instance, mock, when } from 'ts-mockito'
import { ApiClient } from '../../../src/private/data/common/apiClient'
import { S3Client } from '../../../src/private/data/common/s3Client'
import {
  DeviceKeyWorker,
  UnsealInput,
} from '../../../src/private/data/common/deviceKeyWorker'
import { DefaultEmailMessageService } from '../../../src/private/data/message/defaultEmailMessageService'
import { Observable } from 'apollo-client/util/Observable'
import { EmailServiceConfig } from '../../../src/private/data/common/config'
import { provisionEmailAddress } from '../util/provisionEmailAddress'

describe('SudoEmailClient SubscribeToEmailMessages Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')
  const ootoSimulatorAddress = 'ooto@simulator.amazonses.com'

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient

  let emailAddress: EmailAddress | undefined
  let sudos: Sudo[] = []

  const createTestVariables = (): {
    connectionState: ConnectionState
    connectionStateChangeCalled: boolean
    emailMessageId: string | undefined
    createNotifiedEmailMessageId: string | undefined
    createSubscriptionCalled: boolean
    deleteNotifiedEmailMessageId: string | undefined
    deleteSubscriptionCalled: boolean
  } => ({
    connectionState: ConnectionState.Disconnected,
    connectionStateChangeCalled: false,
    emailMessageId: undefined,
    createNotifiedEmailMessageId: undefined,
    createSubscriptionCalled: false,
    deleteNotifiedEmailMessageId: undefined,
    deleteSubscriptionCalled: false,
  })

  /**
   * Send a generic/dummy email message.
   */
  const sendEmailMessage = async (
    senderEmailAddress?: EmailAddress,
    toAddress: string = ootoSimulatorAddress,
  ) => {
    if (!senderEmailAddress) {
      fail('Cannot send email message (no provisioned email address)')
    }

    const messageDetails = {
      from: [{ emailAddress: senderEmailAddress.emailAddress }],
      to: [{ emailAddress: toAddress }],
      cc: [],
      bcc: [],
      replyTo: [],
      subject: `Test ${v4()}`,
      body: '',
      attachments: [],
    }
    const messageString = createEmailMessageRfc822String(messageDetails)
    await instanceUnderTest.sendEmailMessage({
      rfc822Data: str2ab(messageString),
      senderEmailAddressId: senderEmailAddress.id,
    })
  }

  const listEmailMessages = async (
    emailAddress?: EmailAddress,
  ): Promise<EmailMessage[]> => {
    if (!emailAddress) {
      fail('Cannot list email messages (no provisioned email address)')
    }
    const messages = await instanceUnderTest.listEmailMessagesForEmailAddressId(
      {
        emailAddressId: emailAddress.id,
        cachePolicy: CachePolicy.RemoteOnly,
      },
    )
    if (messages.status !== ListOperationResultStatus.Success) {
      fail(`Failed to list email messages`)
    }

    return messages.items
  }

  describe('onEmailMessageChanged tests', () => {
    beforeEach(async () => {
      // Initialize email client and creds.
      const result = await setupEmailClient(log)
      instanceUnderTest = result.emailClient

      // Values not strictly required for testing but stored
      // so they can be appropriately torn down after tests.
      sudos.push(result.sudo)
      profilesClient = result.profilesClient
      userClient = result.userClient

      // Provision an email address for test use.
      emailAddress = await provisionEmailAddress(
        result.ownershipProofToken,
        instanceUnderTest,
      )
    })

    afterEach(async () => {
      await teardown(
        { emailAddresses: [emailAddress!], sudos },
        {
          emailClient: instanceUnderTest,
          profilesClient,
          userClient,
        },
      )

      emailAddress = undefined
      sudos = []
    })

    it('Successfully notifies of email message created event if subscribed', async () => {
      const subscriptionId = v4()
      let {
        connectionState,
        connectionStateChangeCalled,
        emailMessageId,
        createNotifiedEmailMessageId,
        createSubscriptionCalled,
      } = createTestVariables()

      await instanceUnderTest.subscribeToEmailMessages(subscriptionId, {
        emailMessageCreated(emailMessage: EmailMessage): void {
          createSubscriptionCalled = true
          createNotifiedEmailMessageId = emailMessage.id
        },
        connectionStatusChanged(state: ConnectionState): void {
          connectionStateChangeCalled = true
          connectionState = state
        },
        emailMessageDeleted(emailMessage: EmailMessage): void {},
      })

      expect(connectionStateChangeCalled).toBeTruthy()
      expect(connectionState).toBe(ConnectionState.Connected)

      await sendEmailMessage(emailAddress)

      await waitForExpect(async () => {
        const emailMessages = await listEmailMessages(emailAddress)
        expect(emailMessages.length).not.toEqual(0)
        emailMessageId = emailMessages[0].id
        expect(createSubscriptionCalled).toBeTruthy()
      })

      instanceUnderTest.unsubscribeFromEmailMessages(subscriptionId)
    })
    it('Successfully notifies of email message delete event if subscribed', async () => {
      const subscriptionId = v4()
      let {
        connectionState,
        connectionStateChangeCalled,
        emailMessageId,
        deleteNotifiedEmailMessageId,
        deleteSubscriptionCalled,
      } = createTestVariables()

      await instanceUnderTest.subscribeToEmailMessages(subscriptionId, {
        emailMessageDeleted(emailMessage: EmailMessage): void {
          deleteSubscriptionCalled = true
          deleteNotifiedEmailMessageId = emailMessage.id
        },
        connectionStatusChanged(state: ConnectionState): void {
          connectionStateChangeCalled = true
          connectionState = state
        },
        emailMessageCreated(emailMessage: EmailMessage): void {},
      })

      await sendEmailMessage(emailAddress)

      await waitForExpect(async () => {
        const emailMessages = await listEmailMessages(emailAddress)
        expect(emailMessages.length).not.toEqual(0)
        emailMessageId = emailMessages[0].id
      })

      expect(connectionStateChangeCalled).toBeTruthy()
      expect(connectionState).toBe(ConnectionState.Connected)

      const deletedEmailMessageId = await instanceUnderTest.deleteEmailMessage(
        emailMessageId!,
      )

      // Verify subscriber receives delete message event.
      await waitForExpect(() => {
        expect(deleteSubscriptionCalled).toBeTruthy()
        expect(deleteNotifiedEmailMessageId).toEqual(deletedEmailMessageId)
      })

      instanceUnderTest.unsubscribeFromEmailMessages(subscriptionId)
    })

    it('Successfully notifies both email message events if subscribed to both', async () => {
      const subscriptionId = v4()
      let {
        connectionState,
        connectionStateChangeCalled,
        emailMessageId,
        createNotifiedEmailMessageId,
        createSubscriptionCalled,
        deleteNotifiedEmailMessageId,
        deleteSubscriptionCalled,
      } = createTestVariables()

      await instanceUnderTest.subscribeToEmailMessages(subscriptionId, {
        emailMessageDeleted(emailMessage: EmailMessage): void {
          deleteSubscriptionCalled = true
          deleteNotifiedEmailMessageId = emailMessage.id
        },
        connectionStatusChanged(state: ConnectionState): void {
          connectionStateChangeCalled = true
          connectionState = state
        },
        emailMessageCreated(emailMessage: EmailMessage): void {
          createSubscriptionCalled = true
          createNotifiedEmailMessageId = emailMessage.id
        },
      })

      expect(connectionStateChangeCalled).toBeTruthy()
      expect(connectionState).toBe(ConnectionState.Connected)

      await sendEmailMessage(emailAddress)

      await waitForExpect(async () => {
        const emailMessages = await listEmailMessages(emailAddress)
        expect(emailMessages.length).not.toEqual(0)
        emailMessageId = emailMessages[0].id
        expect(createSubscriptionCalled).toBeTruthy()
        expect(createNotifiedEmailMessageId).toStrictEqual(
          createNotifiedEmailMessageId,
        )
        expect(deleteSubscriptionCalled).toBeFalsy()
      })

      const deletedEmailMessageId = await instanceUnderTest.deleteEmailMessage(
        emailMessageId!,
      )

      // Verify subscriber receives delete message event.
      await waitForExpect(() => {
        expect(deleteSubscriptionCalled).toBeTruthy()
        expect(deleteNotifiedEmailMessageId).toEqual(deletedEmailMessageId)
      })

      instanceUnderTest.unsubscribeFromEmailMessages(subscriptionId)
    })

    it('Does not notify of any email message change event if not subscribed', async () => {
      const subscriptionId = v4()
      let {
        connectionState,
        connectionStateChangeCalled,
        emailMessageId,
        createNotifiedEmailMessageId,
        createSubscriptionCalled,
        deleteNotifiedEmailMessageId,
        deleteSubscriptionCalled,
      } = createTestVariables()

      await instanceUnderTest.subscribeToEmailMessages(subscriptionId, {
        emailMessageDeleted(emailMessage: EmailMessage): void {
          deleteSubscriptionCalled = true
          deleteNotifiedEmailMessageId = emailMessage.id
        },
        connectionStatusChanged(state: ConnectionState): void {
          connectionStateChangeCalled = true
          connectionState = state
        },
        emailMessageCreated(emailMessage: EmailMessage): void {
          createSubscriptionCalled = true
          createNotifiedEmailMessageId = emailMessage.id
        },
      })

      expect(connectionStateChangeCalled).toBeTruthy()
      expect(connectionState).toBe(ConnectionState.Connected)

      instanceUnderTest.unsubscribeFromEmailMessages(subscriptionId)

      await sendEmailMessage(emailAddress)

      await waitForExpect(async () => {
        const emailMessages = await listEmailMessages(emailAddress)
        expect(emailMessages.length).not.toEqual(0)
        emailMessageId = emailMessages[0].id
      })

      await instanceUnderTest.deleteEmailMessage(emailMessageId!)

      await waitForExpect(() => {
        expect(createSubscriptionCalled).toBeFalsy()
        expect(deleteSubscriptionCalled).toBeFalsy()
        expect(createNotifiedEmailMessageId).toBeUndefined()
        expect(deleteNotifiedEmailMessageId).toBeUndefined()
      })
    })

    it('execution error invokes error handler and connection state change', async () => {
      const mockAppSync = mock<ApiClient>()
      const mockUserClient = mock<SudoUserClient>()
      const mockS3Client = mock<S3Client>()
      const mockDeviceKeyWorker = mock<DeviceKeyWorker>()
      const mockEmailServiceConfig: EmailServiceConfig = {
        region: 'region',
        apiUrl: 'apiUrl',
        transientBucket: 'transientBucket',
        bucket: 'bucket',
      }

      const emailMessageService = new DefaultEmailMessageService(
        instance(mockAppSync),
        instance(mockUserClient),
        instance(mockS3Client),
        instance(mockDeviceKeyWorker),
        mockEmailServiceConfig,
      )

      const networkError = {
        name: 'name',
        message: 'message',
        statusCode: 401,
      }
      when(mockAppSync.onEmailMessageDeleted(anything())).thenReturn(
        new Observable((observer) => {
          observer.error(networkError)
        }),
      )

      let latestConnectionStatus: ConnectionState = ConnectionState.Disconnected
      let connectionStatusChangedCalled = false

      emailMessageService.subscribeToEmailMessages({
        ownerId: 'owner-id',
        subscriptionId: 'subscribe-id',
        subscriber: {
          emailMessageDeleted(emailMessage: EmailMessage): void {},
          connectionStatusChanged(state: ConnectionState): void {
            connectionStatusChangedCalled = true
            latestConnectionStatus = state
          },
          emailMessageCreated(emailMessage: EmailMessage): void {},
        },
      })

      expect(connectionStatusChangedCalled).toBeTruthy()

      await waitForExpect(() =>
        expect(latestConnectionStatus).toBe(ConnectionState.Disconnected),
      )
    })
  })
})
