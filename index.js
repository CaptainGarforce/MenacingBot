const Twit = require('twit');
const wordfilter = require('wordfilter');
const T = new Twit(require('./botfiles/config.js'));
const imgManip = require('./imageManips');
const fs = require('fs');
const async = require('async');
const https = require('https');
const Stream = require('stream').Transform;
const sharp = require('sharp');
const request = require('request');

//functions 
  function tweetOK(phrase) {
      if (!wordfilter.blacklisted(phrase) && phrase !== undefined && phrase !== "" && tweetLengthOK(phrase)){
        return true;
      } else {
        return false;
      }
  }

  function tweetLengthOK(phrase) {
      if (phrase.length <= 130){
        return true;
      } else {
        return false;
      }
  }
  function SendTweetWithImage(text, image){
    const uploadParams = {
      media_data: image.toString('base64')
    };
    //This silly nonsense only accepts a file path...
    //T.postMediaChunked(uploadParams, function(err, data, response){
    T.post('media/upload', uploadParams, function(err, data, response){
      if (err != null) {
        console.log('upload failed')
        console.log(err);
        return;
      }
      const tweet = {
        status: text,
        media_ids: [data.media_id_string]
      };
      T.post('statuses/update', tweet, function(err, data, response){
        if (err!=null){
          console.log('tweet failed');
          console.log(err);
        }
      });
    });
  }

const myUserId = 787264882110521344;

const userStream = T.stream('user');
userStream.on('error', function(err){
  console.log('stream error');
  console.log(err);
});
userStream.on('connected', function(err){
  console.log('stream started');
});
userStream.on('warning', function(err){
  console.log('warning ', err);
});
userStream.on('disconnect', function(err){
  console.log('disconnect ', err);
});
userStream.on('limit', function(err){
  console.log('limitation ', err);
});
userStream.on('tweet', tweetHandler);
function tweetHandler(eventMsg)
{
  console.log('tweet arrives');
  if(eventMsg.in_reply_to_user_id === myUserId)
  {
    const sender = eventMsg.user.screen_name;

    var imageURL = null;
    var imageWidth = null;
    var imageHeight = null;
    const images = eventMsg.entities.media.filter(m=>m.type==='photo');
    if(images != null && images.length != 0)
    {
      imageURL = images[0].media_url_https;
      imageWidth = images[0].sizes.large.w;
      imageHeight = images[0].sizes.large.h;
    }
    else
    {
      imageURL = eventMsg.user.profile_image_url_https;
    }
    async.waterfall([
      function(callback){
        async.parallel({
          image: function(parCallback){
            let bufferXform = sharp().toBuffer(function(err, buff, info){
              parCallback(err, buff); 
            });
            request(imageURL).pipe(bufferXform);
          },
          charPaths: function(parCallback){
            const menacingDir = './SourceImages/Menacing/';
            async.waterfall([
              function(wfCallback){
                fs.readdir(menacingDir, wfCallback);
              },
              function(charPaths, wfCallback){
                const fullPaths = charPaths.map((p) => menacingDir + p);
                wfCallback(null, fullPaths);
              }
            ], parCallback);
          }
        },callback);
      },
      function(parallelResults, callback){
        imgManip(parallelResults.image, imageWidth, imageHeight, './SourceImages/speedlines.png', parallelResults.charPaths, callback);
      }],
      function(err, results){
        if (err != null){
          console.log(`error: ${err}`);
          return;
        }
        SendTweetWithImage(`@${sender} Menacing!`, results);
      }
    );
  }
}
