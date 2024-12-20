// @ts-check

const fs = require('fs');
const {head, post, patch, delete_} = require('./client');
const {setUploadStatus, getUploadStatus} = require('./util');


const readline = require('readline/promises');
const { getPartialChecksum, HashAlgorithm } = require('./hash');

const filename = process.argv[2];
const partSize = +process.argv[3];

console.log(`Filename: ${filename}`);
console.log(`PartSize: ${partSize}`);

async function main(){
   const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
   });

   /** @type {number} */
   let id = NaN;
   let offset = NaN;

   /** @type {Response|null} */
   let response = null;
   /** @type {any} */
   let body = null;

   while(true){
      const input = await rl.question("command(post, patch, head, delete, quit, save, refresh): ");
      
      switch(input){
         case 'post':
            response = await post(filename, new Map());
            body = await response.json();
            if(response.status > 299){
               console.error(`StatusCode: ${response.status}; body: ${JSON.stringify(body)}`);
               continue;
            }
            id = +body.file_id;
            console.log(`StatusCode: ${response.status}; file_id: ${id}`);
            continue;
         case 'patch':
            if(Number.isNaN(offset)) {
               console.log(`Offset is nan: ${offset}`);
               continue;
            }
            const fd = await new Promise((res, rej)=>{
               fs.open(filename, 'r', (err, fd) => {
                  if(err) rej(err);
                  else res(fd);
               });
            });
            console.log(`FileDescriptor: ${fd}`);
            const buffer = Buffer.alloc(partSize);
            const {bytesRead} = await new Promise((res, rej)=>{
               console.log(`buffer length = ${buffer.length}`);
               console.log(`offset = ${(offset==0)?0:offset+1}`);
               fs.read(fd, buffer, 0, buffer.length, (offset==0)?0:offset+1, (err, bytesRead)=>{
                  if(err) rej(err);
                  else res({bytesRead});
                  fs.close(fd);
               });
            });
            if (bytesRead === 0){ 
               console.log('0 Bytes remaining in file');
               console.log('Nothing to patch...');
               continue;
            }

            response = await patch(id, offset, buffer.slice(0, bytesRead));
            if(response.status > 299){
               body = await response.json();
               console.error(`StatusCode: ${response.status}; body: ${JSON.stringify(body)}`);
               continue;
            }
            offset = +response.headers.get('Upload-Offset');
            console.log(`StatusCode: ${response.status}; Offset: ${offset}`);
            continue;
         case 'head':
            if(Number.isNaN(id) || id < 0){
               console.error(`id not parsed yet: ${id}`);
               continue;
            }
            response = await head(id);
            if(response.status > 299){
               console.error(`StatusCode: ${response.status};`);
               continue;
            }
            offset = +response.headers.get('Upload-Offset');
            console.log(`StatusCode: ${response.status}; Offset: ${offset}`);
            continue;
         case 'delete':
            if(Number.isNaN(id) || id < 0){
               console.error('id not parsed yet');
               continue;
            }
            response = await delete_(id);
            if(response.status > 299){
               body = await response.json();
               console.error(`StatusCode: ${response.status}; body: ${JSON.stringify(body)}`);
               continue;
            }
            console.log(`StatusCode: ${response.status}`);
            continue;
         case 'save':
            if (!id) { console.log('file id not set yet'); }
            const fileChecksum = await getPartialChecksum(HashAlgorithm.MD5, filename, 100);
            setUploadStatus({
               fileId: id,
               filename: filename,
               fileChecksum: fileChecksum,
            });
            continue;
         case 'refresh':
            const uploadStatus = getUploadStatus();
            const currentFileChecksum = await getPartialChecksum(HashAlgorithm.MD5, filename, 100);
            const expectedFileChecksum = uploadStatus.fileChecksum;

            if (
               currentFileChecksum.first.checksum != expectedFileChecksum.first.checksum ||
               currentFileChecksum.middle.checksum != expectedFileChecksum.middle.checksum ||
               currentFileChecksum.last.checksum != expectedFileChecksum.last.checksum
            ){
               console.error('file has changed since previous upload, hence need to start a new upload');
            }else {
               console.log('successfully set the file id to match server');
               id = uploadStatus.fileId;
            }
            continue;
         default:
            console.log('invalid command');
            continue;
      }
   }
}

main();
