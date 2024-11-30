const { HashAlgorithm, getPartialChecksum } = require('./hash');


const filename = process.argv[2];
const partSize = +process.argv[3];


getPartialChecksum(
   HashAlgorithm.MD5,
   filename,
   partSize
)
   .then((result)=>{
      console.log(result);
   })
   .catch(err=>{
      console.error(err);
   });


