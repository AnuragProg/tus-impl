// @ts-check

const { assert } = require('console');
const fs = require('fs');
const {head, post, patch, delete_} = require('./client');

const readline = require('readline/promises');
const { promises } = require('dns');

const filename = process.argv[2];
const partSize = +process.argv[3];

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
      const input = await rl.question("command(post, patch, head, delete, quit): ");
      
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
            if(Number.isNaN(offset)) continue;
            const buffer = Buffer.alloc(partSize);
            const fd = await new Promise((res, rej)=>{
               fs.open(filename, 'r', (err, fd) => {
                  if(err) rej(err);
                  else res(fd);
               });
            });
            await new Promise((res, rej)=>{
               fs.read(fd, buffer, 0, buffer.length, (offset==0)?0:offset+1, (err, bytesRead, buffer)=>{
                  if(err) rej(err);
                  else res({bytesRead, buffer});
               });
            });
            fs.close(fd);

            response = await patch(id, (offset==0)?0:offset+1, buffer);
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
         case 'quit':
            return;
         default:
            console.log('invalid command');
            continue;
      }
   }
}

main();
