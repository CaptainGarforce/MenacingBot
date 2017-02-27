const wordfilter = require('wordfilter');

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
  function SendTweetWithImage(twitClient, text, image, callback){
    const uploadParams = {
      media_data: image.toString('base64')
    };
    //This silly nonsense only accepts a file path...
    //twitClient.postMediaChunked(uploadParams, function(err, data, response){
    twitClient.post('media/upload', uploadParams, function(err, data, response){
      if (err != null) {
        console.log('upload failed')
        console.log(err);
        if(callback) callback(err);
        return;
      }
      const tweet = {
        status: text,
        media_ids: [data.media_id_string]
      };
      twitClient.post('statuses/update', tweet, function(err, data, response){
        if (err!=null){
          console.log('tweet failed');
          console.log(err);
          if(callback) callback(err);
        }
      });
    });
  }

module.exports = SendTweetWithImage;