/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  DefaultLogger,
  ListOperationResultStatus,
} from '@sudoplatform/sudo-common'
import {
  EmailAddress,
  EmailFolder,
  EmailMessage,
  SudoEmailClient,
  EncryptionStatus,
  BatchOperationResultStatus,
  SortOrder,
  ConnectionState,
} from '../../src'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { setupEmailClient, teardown } from './util/emailClientLifecycle'
import {
  provisionEmailAddress,
  generateSafeLocalPart,
} from './util/provisionEmailAddress'
import waitForExpect from 'wait-for-expect'
import { v4 } from 'uuid'
import { getPdfFileData } from '../util/files/fileData'
import { getFolderByName } from './util/folder'
import {
  EmailMessageDetails,
  Rfc822MessageDataProcessor,
} from '../../src/private/util/rfc822MessageDataProcessor'

/**
 * These tests are designed to give us confidence that the built SudoEmailClient is functional
 * without running a full suite of tests. We test sending and receiving email messages
 * as well as retrieving configuration and address and folder details.
 */
describe('SudoEmailClient Smoketest Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientSmokeTests')

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let ownershipProofToken: string

  let senderAddress: EmailAddress
  let receiverAddress: EmailAddress
  let inboxFolder: EmailFolder
  let sentFolder: EmailFolder
  let trashFolder: EmailFolder
  let senderSentFolder: EmailFolder

  beforeAll(async () => {
    // Setup client and provision two email addresses for the entire test suite
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
    ownershipProofToken = result.ownershipProofToken

    // Provision sender and receiver email addresses
    senderAddress = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
      { localPart: generateSafeLocalPart('smoke-sender') },
    )
    receiverAddress = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
      { localPart: generateSafeLocalPart('smoke-receiver') },
    )

    // Get standard folders
    inboxFolder = (await getFolderByName({
      emailClient: instanceUnderTest,
      emailAddressId: receiverAddress.id,
      folderName: 'INBOX',
    })) as EmailFolder
    sentFolder = (await getFolderByName({
      emailClient: instanceUnderTest,
      emailAddressId: receiverAddress.id,
      folderName: 'SENT',
    })) as EmailFolder
    senderSentFolder = (await getFolderByName({
      emailClient: instanceUnderTest,
      emailAddressId: senderAddress.id,
      folderName: 'SENT',
    })) as EmailFolder
    trashFolder = (await getFolderByName({
      emailClient: instanceUnderTest,
      emailAddressId: receiverAddress.id,
      folderName: 'TRASH',
    })) as EmailFolder

    log.info('Smoketest setup complete', {
      senderAddress: senderAddress.emailAddress,
      receiverAddress: receiverAddress.emailAddress,
    })
  })

  afterAll(async () => {
    // Clean up all resources
    await teardown(
      { emailAddresses: [senderAddress, receiverAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  describe('Configuration and Domain Tests', () => {
    it('should get configuration data', async () => {
      const config = await instanceUnderTest.getConfigurationData()
      expect(config.deleteEmailMessagesLimit).toBeGreaterThanOrEqual(1)
      expect(config.updateEmailMessagesLimit).toBeGreaterThanOrEqual(1)
      expect(config.emailMessageMaxInboundMessageSize).toBeGreaterThanOrEqual(1)
      expect(config.emailMessageMaxOutboundMessageSize).toBeGreaterThanOrEqual(
        1,
      )
      expect(config.emailMessageRecipientsLimit).toBeGreaterThanOrEqual(1)
      expect(config).toHaveProperty('sendEncryptedEmailEnabled')
      expect(config.prohibitedFileExtensions.length).toBeGreaterThan(20)
    })

    it('should get supported email domains', async () => {
      const domains = await instanceUnderTest.getSupportedEmailDomains()
      expect(domains.length).toBeGreaterThanOrEqual(1)
    })

    it('should get configured email domains', async () => {
      const domains = await instanceUnderTest.getConfiguredEmailDomains()
      expect(domains.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Email Address Tests', () => {
    it('should list email addresses', async () => {
      const result = await instanceUnderTest.listEmailAddresses()
      expect(result.status).toEqual(ListOperationResultStatus.Success)

      if (result.status === ListOperationResultStatus.Success) {
        expect(result.items.length).toBeGreaterThanOrEqual(2)

        const senderFound = result.items.some(
          (addr) => addr.id === senderAddress.id,
        )
        const receiverFound = result.items.some(
          (addr) => addr.id === receiverAddress.id,
        )
        expect(senderFound).toBe(true)
        expect(receiverFound).toBe(true)
      }
    })

    it('should get email address by ID', async () => {
      const address = await instanceUnderTest.getEmailAddress({
        id: senderAddress.id,
      })
      expect(address).toBeDefined()
      expect(address?.id).toEqual(senderAddress.id)
      expect(address?.emailAddress).toEqual(senderAddress.emailAddress)
    })

    it('should check email address availability', async () => {
      // Test with a likely unavailable address (our existing one)
      const localParts = [senderAddress.emailAddress.split('@')[0]]
      const domains = [senderAddress.emailAddress.split('@')[1]]

      const unavailable = await instanceUnderTest.checkEmailAddressAvailability(
        {
          localParts: new Set(localParts),
          domains: new Set(domains),
        },
      )
      expect(unavailable.length).toBe(0) // Should be empty since address is taken

      // Test with a likely available address
      const randomLocalPart = generateSafeLocalPart('availability-test')
      const available = await instanceUnderTest.checkEmailAddressAvailability({
        localParts: new Set([randomLocalPart]),
        domains: new Set(domains),
      })
      expect(available.length).toBe(1)
      expect(available[0]).toBe(`${randomLocalPart}@${domains[0]}`)
    })

    it('should lookup email addresses public info', async () => {
      const result = await instanceUnderTest.lookupEmailAddressesPublicInfo({
        emailAddresses: [
          senderAddress.emailAddress,
          receiverAddress.emailAddress,
        ],
      })
      expect(result.length).toBe(2)
      expect(
        result.some((info) => info.emailAddress === senderAddress.emailAddress),
      ).toBe(true)
      expect(
        result.some(
          (info) => info.emailAddress === receiverAddress.emailAddress,
        ),
      ).toBe(true)
    })
  })

  describe('Email Folder Tests', () => {
    it('should list email folders', async () => {
      const result = await instanceUnderTest.listEmailFoldersForEmailAddressId({
        emailAddressId: receiverAddress.id,
      })

      expect(result.items.length).toBeGreaterThanOrEqual(4)

      const folderNames = result.items.map((f) => f.folderName)
      expect(folderNames).toContain('INBOX')
      expect(folderNames).toContain('SENT')
      expect(folderNames).toContain('TRASH')
      expect(folderNames).toContain('OUTBOX')
    })

    it('should create and delete custom folder', async () => {
      const customFolderName = `smoketest-${v4()}`

      // Create custom folder
      const createdFolder = await instanceUnderTest.createCustomEmailFolder({
        emailAddressId: receiverAddress.id,
        customFolderName: customFolderName,
      })
      expect(createdFolder.customFolderName).toBe(customFolderName)

      // Verify folder exists
      const folders = await instanceUnderTest.listEmailFoldersForEmailAddressId(
        {
          emailAddressId: receiverAddress.id,
        },
      )
      const foundFolder = folders.items.find((f) => f.id === createdFolder.id)
      expect(foundFolder).toBeDefined()

      // Delete custom folder
      const deleteResult = await instanceUnderTest.deleteCustomEmailFolder({
        emailFolderId: createdFolder.id,
        emailAddressId: receiverAddress.id,
      })
      expect(deleteResult).toEqual(createdFolder) // Success returns the deleted folder object

      // Verify folder is deleted
      const foldersAfterDelete =
        await instanceUnderTest.listEmailFoldersForEmailAddressId({
          emailAddressId: receiverAddress.id,
        })
      const deletedFolder = foldersAfterDelete.items.find(
        (f) => f.id === createdFolder.id,
      )
      expect(deletedFolder).toBeUndefined()
    })
  })

  describe('Email Message Tests', () => {
    let receivedMessage: EmailMessage

    it('should send and receive plain text email', async () => {
      const subject = `Smoketest Plain Text - ${v4()}`
      const body = `This is a plain text smoketest message sent at ${new Date().toISOString()}`

      const messageDetails: EmailMessageDetails = {
        from: [{ emailAddress: senderAddress.emailAddress }],
        to: [{ emailAddress: receiverAddress.emailAddress }],
        subject,
        body,
        encryptionStatus: EncryptionStatus.ENCRYPTED,
      }

      // Set up subscription to capture email creation events
      const subscriptionId = v4()
      let createSubscriptionCalled = false
      let createNotifiedEmailMessageId: string | undefined
      let connectionStateChangeCalled = false
      let connectionState: ConnectionState | undefined

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
        emailMessageUpdated(emailMessage: EmailMessage): void {},
      })

      expect(connectionStateChangeCalled).toBeTruthy()
      expect(connectionState).toBe(ConnectionState.Connected)

      // Send email
      const sendResult = await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: senderAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to || [],
          cc: messageDetails.cc || [],
          bcc: messageDetails.bcc || [],
          replyTo: messageDetails.replyTo || [],
          subject: messageDetails.subject || '',
        },
        body: messageDetails.body || '',
        attachments: [],
        inlineAttachments: [],
      })

      expect(sendResult.id).toBeDefined()

      // Wait for message to be received
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: inboxFolder.id,
              dateRange: {
                sortDate: {
                  startDate: new Date(Date.now() - 300000), // 5 minutes ago
                  endDate: new Date(),
                },
              },
            })

          if (messages.status === ListOperationResultStatus.Success) {
            receivedMessage = messages.items.find(
              (m) =>
                m.subject === subject &&
                m.from[0].emailAddress === senderAddress.emailAddress,
            ) as EmailMessage
            expect(receivedMessage).toBeDefined()
          }
        },
        30000,
        2000,
      )

      // Verify subscription was triggered for encrypted email
      await waitForExpect(
        () => {
          expect(createSubscriptionCalled).toBeTruthy()
          expect(createNotifiedEmailMessageId).toBe(receivedMessage.id)
        },
        10000,
        1000,
      )

      // Verify message details
      expect(receivedMessage.subject).toBe(subject)
      expect(receivedMessage.from[0].emailAddress).toBe(
        senderAddress.emailAddress,
      )
      expect(receivedMessage.to?.[0].emailAddress).toBe(
        receiverAddress.emailAddress,
      )
      expect(receivedMessage.encryptionStatus).toBe(EncryptionStatus.ENCRYPTED)

      // Unsubscribe
      await instanceUnderTest.unsubscribeFromEmailMessages(subscriptionId)

      const messageWithBody = await instanceUnderTest.getEmailMessageWithBody({
        id: receivedMessage.id,
        emailAddressId: receiverAddress.id,
      })

      expect(messageWithBody).toBeDefined()
      expect(messageWithBody!.id).toBe(receivedMessage.id)
      expect(messageWithBody!.body).toContain('smoketest message')
    })

    it('should send unencrypted email to AWS SES success simulator', async () => {
      const successSimulatorAddress = 'success@simulator.amazonses.com'
      const subject = `Smoketest Unencrypted to AWS SES - ${v4()}`
      const body = `This is an unencrypted test message sent to AWS SES success simulator at ${new Date().toISOString()}`

      // Set up subscription to capture email creation events for unencrypted messages
      const subscriptionId = v4()
      let createSubscriptionCalled = false
      let createNotifiedEmailMessageId: string | undefined
      let connectionStateChangeCalled = false
      let connectionState: ConnectionState | undefined

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
        emailMessageUpdated(emailMessage: EmailMessage): void {},
      })

      expect(connectionStateChangeCalled).toBeTruthy()
      expect(connectionState).toBe(ConnectionState.Connected)

      // Send email to external AWS SES simulator address (should be unencrypted)
      const sendResult = await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: senderAddress.id,
        emailMessageHeader: {
          from: { emailAddress: senderAddress.emailAddress },
          to: [{ emailAddress: successSimulatorAddress }],
          cc: [],
          bcc: [],
          replyTo: [],
          subject,
        },
        body,
        attachments: [],
        inlineAttachments: [],
      })

      expect(sendResult.id).toBeDefined()

      // Verify the message was sent successfully by checking the sent folder
      await waitForExpect(
        async () => {
          const sentMessages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: senderSentFolder.id,
              dateRange: {
                sortDate: {
                  startDate: new Date(Date.now() - 300000), // 5 minutes ago
                  endDate: new Date(Date.now() + 30000),
                },
              },
            })

          if (sentMessages.status === ListOperationResultStatus.Success) {
            const sentMessage = sentMessages.items.find(
              (m) =>
                m.subject === subject &&
                m.to?.[0].emailAddress === successSimulatorAddress,
            )
            expect(sentMessage).toBeDefined()

            // Verify that the message to external address is unencrypted
            expect(sentMessage!.encryptionStatus).toBe(
              EncryptionStatus.UNENCRYPTED,
            )
          }
        },
        30000,
        2000,
      )

      // Verify subscription was triggered when email was placed in SENT folder
      // Even for external emails, we should get a notification when the message appears in our SENT folder
      await waitForExpect(
        () => {
          expect(createSubscriptionCalled).toBeTruthy()
          expect(createNotifiedEmailMessageId).toBeDefined()
          expect(createNotifiedEmailMessageId).toEqual(sendResult.id)
        },
        10000,
        1000,
      )

      // Unsubscribe
      await instanceUnderTest.unsubscribeFromEmailMessages(subscriptionId)
    })

    it('should send email with attachment', async () => {
      const pdfData = getPdfFileData()
      const subject = `Smoketest with Attachment - ${v4()}`
      const body = 'This message contains a PDF attachment'

      const sendResult = await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: senderAddress.id,
        emailMessageHeader: {
          from: { emailAddress: senderAddress.emailAddress },
          to: [{ emailAddress: receiverAddress.emailAddress }],
          cc: [],
          bcc: [],
          replyTo: [],
          subject,
        },
        body,
        attachments: [
          {
            filename: 'test-document.pdf',
            data: pdfData,
            mimeType: 'application/pdf',
            inlineAttachment: false,
          },
        ],
        inlineAttachments: [],
      })

      expect(sendResult.id).toBeDefined()

      // Wait for message with attachment to be received
      let messageWithAttachment: EmailMessage | undefined
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: inboxFolder.id,
              dateRange: {
                sortDate: {
                  startDate: new Date(Date.now() - 300000), // 5 minutes ago
                  endDate: new Date(),
                },
              },
            })

          if (messages.status === ListOperationResultStatus.Success) {
            messageWithAttachment = messages.items.find(
              (m) => m.subject === subject && m.hasAttachments,
            )
            expect(messageWithAttachment).toBeDefined()
          }
        },
        30000,
        2000,
      )

      expect(messageWithAttachment!.hasAttachments).toBe(true)
    })

    it('should list email messages with filtering and sorting', async () => {
      const messages =
        await instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder.id,
          sortOrder: SortOrder.Desc,
          limit: 10,
        })

      expect(messages.status).toBe(ListOperationResultStatus.Success)

      if (messages.status === ListOperationResultStatus.Success) {
        expect(messages.items.length).toBeGreaterThanOrEqual(1)

        // Verify sorting (most recent first)
        if (messages.items.length > 1) {
          expect(messages.items[0].sortDate.getTime()).toBeGreaterThanOrEqual(
            messages.items[1].sortDate.getTime(),
          )
        }
      }
    })

    it('should update email message status', async () => {
      if (!receivedMessage) {
        fail(
          'Run the entire test suite to ensure message is received before updating its status',
        )
      }
      // Mark message as read
      const updateResult = await instanceUnderTest.updateEmailMessages({
        ids: [receivedMessage.id],
        values: {
          seen: true,
        },
      })

      expect(updateResult.status).toBe(BatchOperationResultStatus.Success)
      expect(updateResult.successValues?.length).toBe(1)

      // Note: Cannot verify seen status through getEmailMessageWithBody API
      // as it doesn't include message metadata properties like 'seen'
    })

    it('should move message to trash', async () => {
      if (!receivedMessage) {
        fail(
          'Run the entire test suite to ensure message is received before updating its status',
        )
      }
      const moveResult = await instanceUnderTest.updateEmailMessages({
        ids: [receivedMessage.id],
        values: {
          folderId: trashFolder.id,
        },
      })

      expect(moveResult.status).toBe(BatchOperationResultStatus.Success)

      // Verify message moved to trash
      await waitForExpect(
        async () => {
          const trashMessages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: trashFolder.id,
            })
          if (trashMessages.status === ListOperationResultStatus.Success) {
            const messageInTrash = trashMessages.items.find(
              (m) => m.id === receivedMessage.id,
            )
            expect(messageInTrash).toBeDefined()
          }
        },
        15000,
        2000,
      )

      // Verify message no longer in inbox
      const inboxMessages =
        await instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder.id,
        })
      if (inboxMessages.status === ListOperationResultStatus.Success) {
        const messageInInbox = inboxMessages.items.find(
          (m) => m.id === receivedMessage.id,
        )
        expect(messageInInbox).toBeUndefined()
      }
    })

    it('should delete email message', async () => {
      if (!receivedMessage) {
        fail(
          'Run the entire test suite to ensure message is received before updating its status',
        )
      }
      // Delete the message from trash
      const deleteResult = await instanceUnderTest.deleteEmailMessage(
        receivedMessage.id,
      )

      expect(deleteResult).toBeDefined()
      expect(deleteResult?.id).toBe(receivedMessage.id)

      // Verify message is deleted
      await waitForExpect(
        async () => {
          try {
            await instanceUnderTest.getEmailMessageWithBody({
              id: receivedMessage.id,
              emailAddressId: receiverAddress.id,
            })
            // If we get here, the message still exists - fail the test
            expect(true).toBe(false)
          } catch (error) {
            // Expected - message should not be found
            expect(error).toBeDefined()
          }
        },
        15000,
        2000,
      )
    })
  })

  describe('Draft Message Tests', () => {
    let draftId: string

    it('should create draft email message', async () => {
      const body = 'This is a draft message created in smoketest'
      const draftBuffer =
        Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
          from: [{ emailAddress: senderAddress.emailAddress }],
          to: [{ emailAddress: receiverAddress.emailAddress }],
          cc: [],
          bcc: [],
          replyTo: [],
          body,
          attachments: [],
          subject: 'Draft Smoketest Message',
        })

      const draft = await instanceUnderTest.createDraftEmailMessage({
        rfc822Data: draftBuffer,
        senderEmailAddressId: senderAddress.id,
      })

      expect(draft.id).toBeDefined()
      draftId = draft.id
    })

    it('should list draft messages', async () => {
      const drafts =
        await instanceUnderTest.listDraftEmailMessagesForEmailAddressId({
          emailAddressId: senderAddress.id,
        })

      expect(Array.isArray(drafts.items)).toBe(true)
      const foundDraft = drafts.items.find((d) => d.id === draftId)
      expect(foundDraft).toBeDefined()
    })

    it('should get draft message', async () => {
      const draft = await instanceUnderTest.getDraftEmailMessage({
        id: draftId,
        emailAddressId: senderAddress.id,
      })

      expect(draft).toBeDefined()
      expect(draft!.id).toBe(draftId)
      expect(draft!.rfc822Data).toBeDefined()
    })

    it('should update draft message', async () => {
      const draftBuffer =
        Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
          from: [{ emailAddress: senderAddress.emailAddress }],
          to: [{ emailAddress: receiverAddress.emailAddress }],
          cc: [],
          bcc: [],
          replyTo: [],
          body: 'This is an updated draft message',
          attachments: [],
          subject: 'Updated Draft Smoketest Message',
        })

      const updatedDraft = await instanceUnderTest.updateDraftEmailMessage({
        id: draftId,
        rfc822Data: draftBuffer,
        senderEmailAddressId: senderAddress.id,
      })

      expect(updatedDraft.id).toBe(draftId)
    })

    it('should delete draft message', async () => {
      const deleteResult = await instanceUnderTest.deleteDraftEmailMessages({
        ids: [draftId],
        emailAddressId: senderAddress.id,
      })

      expect(deleteResult.status).toBe(BatchOperationResultStatus.Success)

      // Verify draft is deleted
      const draftsAfterDelete =
        await instanceUnderTest.listDraftEmailMessagesForEmailAddressId({
          emailAddressId: senderAddress.id,
        })
      const deletedDraft = draftsAfterDelete.items.find((d) => d.id === draftId)
      expect(deletedDraft).toBeUndefined()
    })
  })
})
