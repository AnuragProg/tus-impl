

const _ = require('lodash');
const { assert } = require('console');
const { getPartialChecksum } = require('./hash');
const { getUploadStatus, setUploadStatus } = require('./util');


/**
   * @type {import('./util').UploadStatus}
   */
const uploadStatus = {
   fileId: 10,
   filename: "something.pdf",
   fileChecksum: {
      first: {
         checksum: 'checksum1',
         timeTaken: 0.3,
      },
      middle: {
         checksum: 'checksum2',
         timeTaken: 0.3,
      },
      last: {
         checksum: 'checksum3',
         timeTaken: 0.3,
      }
   },
};

setUploadStatus(uploadStatus);
const receviedUploadStatus = getUploadStatus();
assert(_.isEqual(uploadStatus, receviedUploadStatus));
