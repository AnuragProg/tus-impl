// @ts-check
const fs = require('fs/promises');

const baseUrl = "http://localhost:3000";

/**
   *
   * @param {string} filename 
   * @param {Map<string, string>} metadata filename is inclusively included in the metadata, so need to add to metadata
   * @returns {Promise<Response>}
   */
async function post(filename, metadata) {
   const fileStat = await fs.stat(filename);
   const filesize = fileStat.size;

   /**
   * @type {Array<String>}
   */
   const uploadMetadata = [];
   uploadMetadata.push(
      `filename ${Buffer.from(filename).toString('base64')}`,
   );

   for (const [key, value] of metadata){
      if(key.trim() == "filename"){
         continue;
      }
      const base64Value = Buffer.from(value).toString('base64');
      uploadMetadata.push(`${key} ${base64Value}`);
   }

   return await fetch(baseUrl, {
      method: 'POST',
      headers: {
         'Upload-Length': filesize.toString(),
         'Upload-Metadata': uploadMetadata.map(item=>item.trim()).join(','),
      },
   })
}

/**
   *
   * @param {number} id
   * @param {number} offset 
   * @param {Buffer} buffer 
   * @returns {Promise<Response>}
   */
function patch(id, offset, buffer){
   return fetch(`${baseUrl}/${id}`, {
      method: 'PATCH',
      headers: {
         'Upload-Offset': offset.toString(),
         'Content-Length': buffer.length.toString(),
      },
      body: buffer,
   });
}

/**
   *
   * @param {number} id
   * @returns {Promise<Response>}
   */
function head(id){
   return fetch(`${baseUrl}/${id}`,{
      method: 'HEAD',
   });
}

/**
   *
   * @param {number} id
   * @returns {Promise<Response>}
   */
function delete_(id){
   return fetch(`${baseUrl}/${id}`,{
      method: 'DELETE',
   });
}

module.exports = {
   post,
   patch,
   head,
   delete_
}
