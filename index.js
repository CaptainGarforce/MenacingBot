const Twit = require('twit');
const twitClient = new Twit(require('./botfiles/config.js'));
const imgManip = require('./imageManips');
const fs = require('fs');
const async = require('async');
const sharp = require('sharp');
const request = require('request');
const SendTweetWithImage = require('./sendTweetWithImage')

const menacingDir = './SourceImages/Menacing/';
const speedlinePath = './SourceImages/speedlines.png';

const myUserId = 787264882110521344;

const userStream = twitClient.stream('user');
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
            fs.readdir(menacingDir, parCallback);
          }
        },
        callback);
      },
      function(parallelResults, callback){
        const fullPaths = parallelResults.charPaths.map((p) => menacingDir + p);
        imgManip(parallelResults.image, imageWidth, imageHeight, speedlinePath, fullPaths, callback);
      }],
      function(err, results){
        if (err != null){
          console.log(`error: ${err}`);
          return;
        }
        SendTweetWithImage(twitClient, `@${sender} Menacing!`, results);
      }
    );
  }
}
