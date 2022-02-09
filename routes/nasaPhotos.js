const express = require('express');
const router = express.Router();
const fs = require('fs'); 
const path = require("path");
const axios = require('axios');

let filePath = path.resolve(__dirname, '../public/images/'); 


router.param('date', function(req, res, next){
  //TODO - handle other formats

  req.date = req.params.date; 
  const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/; //YYYY-MM-DD	
  const dateIsValid = dateRegex.test(req.date); 

  if (dateIsValid) next();
  else {
    const err = new Error('Incorrect date format');
    err.status = 400; 
    next(err);
  }
});

/* GET photos from given date */
router.get('/:date', async function(req, res, next) { 
  let results = await getNASAphotos(req.params.date);
  res.send(results);
});

async function getNASAphotos(date) {
  let responseObject = {
    'success' : 'false', 
    'photosDownloaded' : 0
  };

  let listOfPhotos = await callAPI(date).catch((error) => {
    console.log(error);
    return responseObject;
  });

  let photosDownloadedCount = downloadPhotos(date, listOfPhotos);
  responseObject.success = 'true'; 
  responseObject.photosDownloaded = photosDownloadedCount; 

  return responseObject; 
}

function callAPI(date) {
  return new Promise((resolve, reject) => {
    const nasaHost = 'https://api.nasa.gov'; 
    const nasaBasePath = '/mars-photos/api/v1/rovers/curiosity/photos?'; 
    const apiKey = '&api_key=' + '7T4DUPK0yLrXftWOxfR8AHraS14ugNXTQwSgWB1U'; //TODO - store as server variable
    const nasaPath = nasaBasePath + 'earth_date=' + date + apiKey; 

    const endpoint = nasaHost + nasaPath; 
    axios.get(endpoint).then((response) => {
      resolve(response.data.photos); 
    });
  }); 
}

function downloadPhotos(date, listOfPhotos) {
  let newDir = filePath + '/' + date; 
  if (!fs.existsSync(newDir)) fs.mkdirSync(newDir);

  let count = 0;
  for(let photo of listOfPhotos) {
    let src = photo.img_src; 
    let filename = newDir + '/' + photo.id + '.jpg'; //TODO - handle different file types?
    let fileDoesntExistYet = !fs.existsSync(filename); 

    if(fileDoesntExistYet) downloadSingleImage(src, filename).catch((err) => console.log(err)); //TODO - logging
    count++; 
  }

  /*
    QUESTION - Should it actually wait for every photo to be downloaded? 
    this is currently returning total number of photos for that day regardless of whether they are actually downloaded
    This is much quicker than waiting
  */
  
  return count;
}

function downloadSingleImage(photoSrc, filename) {
  return new Promise((resolve, reject) => {
    axios.get(photoSrc, {responseType: 'stream'}).then((response) => {
        response.data.pipe(fs.createWriteStream(filename))
          .on('finish', () => resolve())
          .on('error', e => reject(e));
    })
  }); 
}

module.exports = router;
