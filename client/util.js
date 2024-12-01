// @ts-check
const fs = require('fs');

/**
   *
   * @typedef {import('./hash').ChecksumResult} ChecksumResult
   */

/**
   *
   * @typedef {Object} FileChecksum
   * @property {ChecksumResult} first
   * @property {ChecksumResult} middle
   * @property {ChecksumResult} last
   */

/**
   *
   * @typedef {Object} UploadStatus
   * @property {number} fileId File id on server
   * @property {string} filename Path to file that was being uploaded
   * @property {FileChecksum} fileChecksum
   */

const UploadStatusFilename = "./store/update-status.json";

/**
   *
   * @param {UploadStatus} uploadStatus 
   */
function setUploadStatus(uploadStatus){
   const uploadStatusJson = JSON.stringify(uploadStatus);
   fs.writeFileSync(UploadStatusFilename, uploadStatusJson);
}

/**
   *
   * @returns {UploadStatus}
   */
function getUploadStatus() {
   const data = fs.readFileSync(UploadStatusFilename).toString('utf8');
   return JSON.parse(data);
}


module.exports = {
   setUploadStatus,
   getUploadStatus
};
