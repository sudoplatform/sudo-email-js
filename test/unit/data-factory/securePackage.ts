/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailAttachment } from '../../../src/public/'
import { SecureEmailAttachmentType } from '../../../src/private/domain/entities/secure/secureEmailAttachmentType'
import { SecurePackage } from '../../../src/private/domain/entities/secure/securePackage'

export class SecurePackageDataFactory {
  static securePackage(
    keyAttachments?: Set<EmailAttachment>,
    bodyAttachment?: EmailAttachment,
  ): SecurePackage {
    return new SecurePackage(
      keyAttachments ??
        new Set([
          {
            data: 'mockKeyData1',
            filename: SecureEmailAttachmentType.KEY_EXCHANGE.fileName,
            mimeType: SecureEmailAttachmentType.KEY_EXCHANGE.mimeType,
            contentId: SecureEmailAttachmentType.KEY_EXCHANGE.contentId,
            inlineAttachment: false,
            contentTransferEncoding: undefined,
          },
          {
            data: 'mockKeyData2',
            filename: SecureEmailAttachmentType.KEY_EXCHANGE.fileName,
            mimeType: SecureEmailAttachmentType.KEY_EXCHANGE.mimeType,
            contentId: SecureEmailAttachmentType.KEY_EXCHANGE.contentId,
            inlineAttachment: false,
            contentTransferEncoding: undefined,
          },
        ]),
      bodyAttachment ?? {
        data: 'mockBodyData',
        filename: SecureEmailAttachmentType.BODY.fileName,
        mimeType: SecureEmailAttachmentType.BODY.mimeType,
        contentId: SecureEmailAttachmentType.BODY.contentId,
        inlineAttachment: false,
        contentTransferEncoding: undefined,
      },
    )
  }
}
