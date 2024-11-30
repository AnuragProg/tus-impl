// @ts-check

const fs = require('fs');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

/**
   *
   * @enum {string}
   */
const HashAlgorithm = {
   MD5: "md5",
   SHA256: "sha256",
};

/**
   * @typedef {Object} ChecksumResult
   * @property {string} checksum
   * @property {number} timeTaken
   */

/**
   *
   * @param {HashAlgorithm} algorithm 
   * @param {number} fd 
   * @param {number} start 
   * @param {number} length 
   *
   * @returns {Promise<ChecksumResult>} Checksum along with time taken to calculate the checksum
   */
function computeChecksum(algorithm, fd, start, length) {
   const hash = crypto.createHash(algorithm);
   const startTime = performance.now(); // Start timer

   return new Promise((resolve, reject) => {
      const buffer = Buffer.alloc(length);

      fs.read(fd, buffer, 0, length, start, (err, bytesRead, buffer) => {
         if (err) {
            reject(`Error reading file at offset ${start}: ${err.message}`);
         } else {
            hash.update(buffer.slice(0, bytesRead));
            const hashValue = hash.digest('hex');
            const endTime = performance.now();
            const timeTaken = endTime - startTime;
            resolve({ checksum: hashValue, timeTaken });
         }
      });
   });
}

/**
   *
   * @param {HashAlgorithm} algorithm 
   * @param {string} filename 
   * @param {number} partSize 
   * @returns {Promise<{first: ChecksumResult, middle: ChecksumResult, last:ChecksumResult}>}
   */
function getPartialChecksum(algorithm, filename, partSize) {
   const stats = fs.statSync(filename);
   const fileSize = stats.size;

   console.log(`Processing file: ${filename}`);

   return new Promise((resolve, reject)=>{
      // Open the file
      fs.open(filename, 'r', async (err, fd) => {
         if (err) {
            reject(err);
            console.error(`Error opening file: ${err.message}`);
            return;
         }

         const firstStart = 0;
         const middleStart = Math.floor((fileSize - partSize) / 2);
         const lastStart = fileSize - partSize

         const [firstPart, middlePart, lastPart] = await Promise.all([
            computeChecksum(algorithm, fd, firstStart, partSize),
            computeChecksum(algorithm, fd, middleStart, partSize),
            computeChecksum(algorithm, fd, lastStart, partSize)
         ]);

         resolve({
            first: firstPart,
            middle: middlePart,
            last: lastPart
         });

         // Close the file descriptor
         fs.close(fd, (err) => {
            if (err) {
               reject(err);
               console.error(`Error closing file: ${err.message}`);
            }
         });
      });
   });
}

module.exports = {
   HashAlgorithm,
   getPartialChecksum,
};
