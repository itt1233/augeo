
  /***************************************************************************/
  /* Augeo.io is a web application that uses Natural Language Processing to  */
  /* classify a user's internet activity into different 'skills'.            */
  /* Copyright (C) 2016 Brian Redd                                           */
  /*                                                                         */
  /* This program is free software: you can redistribute it and/or modify    */
  /* it under the terms of the GNU General Public License as published by    */
  /* the Free Software Foundation, either version 3 of the License, or       */
  /* (at your option) any later version.                                     */
  /*                                                                         */
  /* This program is distributed in the hope that it will be useful,         */
  /* but WITHOUT ANY WARRANTY; without even the implied warranty of          */
  /* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the           */
  /* GNU General Public License for more details.                            */
  /*                                                                         */
  /* You should have received a copy of the GNU General Public License       */
  /* along with this program.  If not, see <http://www.gnu.org/licenses/>.   */
  /***************************************************************************/

  /***************************************************************************/
  /* Description: Logic for TWEET database collection                        */
  /***************************************************************************/

  // Required libraries
  var Mongoose = require('mongoose');
  var Schema = Mongoose.Schema;

  // Required local modules
  var AugeoDB = require('../database');
  var Logger = require('../../module/logger');

  // Constants
  var COLLECTION = 'tweet-collection';

  // Global variables
  var log = new Logger();

  // Schema declaration
  var TWEET = Mongoose.Schema({
    twitterId: String,
    tweetId: String,
    name: String,
    screenName: String,
    avatarImageSrc: String,
    text: String,
    classification: String,
    classificationGlyphicon: String,
    media: [{
      url: String,
      width: Number,
      height: Number
    }],
    date: String,
    experience: Number,
    retweetCount: Number,
    favoriteCount: Number,
    mentions: [{
      screen_name: String,
      name: String,
      id: Number,
      id_str: String,
      indices:[Number]
    }],
    hashtags: [{
      text: String,
      indices: [Number]
    }],
    links: [{
      url: String,
      expanded_url: String,
      display_url: String,
      indices: [Number]
    }]
  });

  /***************************************************************************/
  /* Static Methods: Accessible at Model level                               */
  /***************************************************************************/

  TWEET.statics.addTweet = function(tweet, logData, callback) {

    // Add tweet if it doesn't exist and update when it does exist
    upsertTweet(this, tweet, logData, callback);
  };

  TWEET.statics.addTweets = function(tweets, logData, callback) {

    // Add tweets if they don't exist and update when they do exist
    upsertTweets(this, tweets, logData, callback);
  };

  TWEET.statics.findTweet = function(tweetId, logData, callback) {
    this.find({tweetId:tweetId},{},{}, function(error, tweet) {
      if(error) {
        log.functionError(COLLECTION, 'findTweet', logData.parentProcess, logData.username, 'Failed to find tweet with tweetID: ' + tweetId);
      } else {
        log.functionCall(COLLECTION, 'findTweet', logData.parentProcess, logData.username, {'tweetId':tweetId});
        callback(tweet);
      }
    });
  };

  TWEET.statics.getLatestTweetId = function(screenName, logData, callback) {
    this.find({screenName:screenName},{},{sort:{'tweetId':-1},limit:1}).lean().exec(function(error, data) {

      if(error) {
        log.functionError(COLLECTION, 'getLatestTweetId', logData.parentProcess, logData.username, 'Failed to find tweet with max tweetId for user:' + screenName + '. Error: ' + error);
      } else {
        log.functionCall(COLLECTION, 'getLatestTweetId', logData.parentProcess, logData.username, {'screenName':screenName});

        var latestTweetId;
        if(data[0]) {
          log.functionCall(COLLECTION, 'getLatestTweetId', logData.parentProcess, logData.username, {'screenName':screenName},
            'Latest TweetId: ' + data[0].tweetId);
          latestTweetId = data[0].tweetId;
        }
        callback(latestTweetId);
      }
    });
  };

  TWEET.statics.getSkillActivity = function(screenName, tweetIds, skill, limit, maxTweetId, logData, callback) {

    if(!maxTweetId) {
      maxTweetId = '9999999999999999999999999999999';
    }

    var query = {};
    if(tweetIds != null) {
      query = {
        $or : [
          {
            $and :[
              {screenName: screenName},
              {tweetId : {$lt: maxTweetId}}
            ]
          },
          {
            $and :[
              {tweetId: {$in: tweetIds}},
              {tweetId: {$lt: maxTweetId}}
            ]
          }
        ]
      };

    } else {
      query = {
        $and :[
          {screenName: screenName},
          {tweetId : {$lt: maxTweetId}},
        ]
      };
    }

    if(skill && skill != 'Augeo') {
      query.classification = skill;
    }

    var options = {
      sort: {'tweetId': -1}
    }

    if(limit) {
      options.limit = limit
    }

    this.find(query,{}, options, function(error, tweets) {
       if(error) {
         log.functionError(COLLECTION, 'getSkillActivity', logData.parentProcess, logData.username,
           'Failed to retrieve ' + screenName + ' tweets for skill:' + skill + '. Error: ' + error);
       } else {
         log.functionCall(COLLECTION, 'getSkillActivity', logData.parentProcess, logData.username, {'screenName':screenName,
           'tweetIds':(tweetIds)?'defined':'invalid','skill':skill,'maxTweetId':maxTweetId});
         callback(tweets);
       }
     });
  };

  TWEET.statics.getTweetCount = function(logData, callback) {
    this.count({}, function(error, count) {
        if(error) {
          log.functionError(COLLECTION, 'getTweetCount', logData.parentProcess, logData.username, 'Failed to retrieve tweet count. Error: ' + error);
        } else {
          log.functionCall(COLLECTION, 'getTweetCount', logData.parentProcess, logData.username);
          callback(count)
        }
    });
  };

  TWEET.statics.incrementRetweetCount = function(tweetId, logData, callback) {
    this.findOneAndUpdate({tweetId:tweetId}, {$inc: {retweetCount:1}}, function(error) {
      if(error) {
        log.functionError(COLLECTION, 'incrementRetweetCount', logData.parentProcess, logData.username, 'Failed to increment retweet count for tweet with ID: ' + tweetId);
      } else {
        log.functionCall(COLLECTION, 'incrementRetweetCount', logData.parentProcess, logData.username, {'tweetId':tweetId});
        callback();
      }
    });
  };

  TWEET.statics.removeTweet = function(tweetId, logData, callback) {
    this.remove({tweetId:tweetId}, function(error) {
      if(error) {
        log.functionError(COLLECTION, 'removeTweet', logData.parentProcess, logData.username, 'Failed to remove tweet with id: ' + tweetId + '. Error:' + error);
      } else {
        log.functionCall(COLLECTION, 'removeTweet', logData.parentProcess, logData.username, {'tweetId':tweetId});
        callback();
      }
    });
  };

  TWEET.statics.removeTweets = function(screenName, logData, callback) {
    this.remove({screenName:screenName}, function(error) {
      if(error) {
        log.functionError(COLLECTION, 'removeTweets', logData.parentProcess, logData.username,
          'Failed to remove tweets for screenName: ' + screenName + '. Error: ' + error);
      } else {
        log.functionCall(COLLECTION, 'removeTweets', logData.parentProcess, logData.username, {'screenName':screenName});
      }
      callback();
    });
  };

  TWEET.statics.removeTweetsWithMentionee = function(mentioneeScreenName, logData, callback) {
    this.remove({mentions: {$elemMatch: {screen_name:mentioneeScreenName}}}, function(error) {
      if(error) {
        log.functionError(COLLECTION, 'removeTweetsWithMentionee', logData.parentProcess, logData.username,
          'Failed to remove tweets for screenName: ' + screenName + '. Error: ' + error);
      } else {
        log.functionCall(COLLECTION, 'removeTweetsWithMentionee', logData.parentProcess, logData.username, {'mentioneeScreenName':mentioneeScreenName});
      }
      callback();
    });
  };

  TWEET.statics.updateExperience = function(tweetId, experience, logData, callback) {
    this.findOneAndUpdate({tweetId:tweetId}, {$inc: {experience: experience.mainSkillExperience}}, function(error) {
      if(error) {
        log.functionError(COLLECTION, 'updateExperience', logData.parentProcess, logData.username,
          'Failed to update experience for tweet with ID ' + tweetId + '. Error: ' + error);
      } else {
        log.functionCall(COLLECTION, 'updateExperience', logData.parentProcess, logData.username, {'tweetId':tweetId,
          'experience':experience});
        callback();
      }
    });
  };

  /***************************************************************************/
  /* Private Methods                                                         */
  /***************************************************************************/

  var upsertTweet = function(tweetDocument, tweet,logData, callback) {
    tweetDocument.update({tweetId:tweet.tweetId}, tweet, {upsert:true}, function(error, numAffected) {
      if (error) {
        log.functionError(COLLECTION, 'upsertTweet (private)', logData.parentProcess, logData.username,
          'Failed to upsert tweet with ID: ' + (tweet)?tweet.tweetId:'invalid' + '. Error: ' + error);
      } else {
        log.functionCall(COLLECTION, 'upsertTweet (private)', logData.parentProcess, logData.username, {'tweetDocument':(tweetDocument)?'defined':'invalid',
          'tweet':(tweet)?tweet.tweetId:'invalid'});
        callback();
      }
    });

  };

  var upsertTweets = function(tweetDocument, tweets, logData, callback) {
    var inserted = 0;
    var upsertCallback = function(){};
    for(var i = 0; i < tweets.length; i++) {

      if (++inserted == tweets.length) {
        upsertCallback = callback;
      }

      upsertTweet(tweetDocument, tweets[i], logData, upsertCallback);
    }

  };

  // Declare Model
  var Tweet = module.exports = AugeoDB.model('Tweet', TWEET);
