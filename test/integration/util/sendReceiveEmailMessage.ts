/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { ListOperationResultStatus } from '@sudoplatform/sudo-common'
import { v4 } from 'uuid'
import { SudoEmailClient } from '../../../src/public/sudoEmailClient'
import { EmailAddress } from '../../../src/public/typings/emailAddress'
import { delay } from '../../util/delay'
import { EmailMessageDetails } from '../../../src/private/util/rfc822MessageDataProcessor'
import { SendEmailMessageResult } from '../../../types'
import { getFolderByName } from './folder'

export const sendReceiveEmailMessagePair = async (
  client: SudoEmailClient,
  emailAddress: EmailAddress,
  messageDetails: EmailMessageDetails,
  options: { retryAttempts: number } = { retryAttempts: 4 },
): Promise<SendEmailMessageResult | undefined> => {
  const folder = await getFolderByName({
    emailClient: client,
    emailAddressId: emailAddress.id,
    folderName: 'INBOX',
  })
  expect(folder).toBeDefined()
  if (!folder) {
    fail('Unable to get INBOX folder in setup')
  }

  for (
    let attemptsRemaining = options.retryAttempts;
    attemptsRemaining > 0;
    attemptsRemaining--
  ) {
    const subjectRandomizer = v4()
    const sentSubject =
      messageDetails.subject ?? 'Default test subject' + subjectRandomizer
    const emailMessageSendResult = await client.sendEmailMessage({
      senderEmailAddressId: emailAddress.id,
      emailMessageHeader: {
        from: messageDetails.from[0],
        to: messageDetails.to ?? [],
        cc: messageDetails.cc ?? [],
        bcc: messageDetails.bcc ?? [],
        replyTo: messageDetails.replyTo ?? [],
        subject: sentSubject,
      },
      body: messageDetails.body ?? 'Hello, World',
      attachments: messageDetails.attachments ?? [],
      inlineAttachments: messageDetails.inlineAttachments ?? [],
    })

    let readRetriesRemaining = 5
    while (readRetriesRemaining > 0) {
      const result = await client.listEmailMessagesForEmailFolderId({
        folderId: folder.id,
      })
      const responseItemFound =
        result.status == ListOperationResultStatus.Success &&
        result.items.find(
          (message) => message.subject === `Out of the Office: ${sentSubject}`,
        ) !== undefined
      if (!responseItemFound) {
        await delay(2500)
        --readRetriesRemaining
        continue
      }
      // If we get to here, we have successfully verified the existence of the request/response pair
      return emailMessageSendResult
    }
    // If we get to here, we did not get a timely response, so we'll need to resend. Delete the old one so it doesn't mess
    // up our statistics.
    await client.deleteEmailMessage(emailMessageSendResult.id)
    await delay(2000)
  }
}
