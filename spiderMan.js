/* eslint-disable fecs-indent */
/**
 * @file node-spider-man
 *
 * @author  Daniel Zhu <enterzhu@gmail.com>
 * @date    2016-06-04
 */
var request = require('request');
var cheerio = require('cheerio');
var Promise = require('promise');
var curlify = require('request-as-curl');

var spiderMan = function (opts) {

  /**
   * Name for spiderName
   * @type {Array}
   */
  this.spiderManName = opts.spiderManName || 'No_Name_Guy';

  // this.runningStatus = 'ready'; // ready, running, finish, waiting

  /**
   * Current spiderMan tasks list
   * @type {Array}
   */
  // this.taskQueue = [];

  /**
   * [fetchQueue description]
   *
   * @type {Array}
   */
  this.fetchQueue = [];

  /**
   * execMode
   *
   * sync: Execute each fetchTask after the previous one finished
   * async: Execute each fetchTask after the delayFetch time
   *
   * default to sync
   */
  this.execMode = opts.execMode || 'sync';

  /**
   * retryCount for one task
   *
   * @type {Integer}
   */
  this.retryCount = opts.retryCount || 0;

  /**
   * Waiting time before each fetch task starts
   *
   * default to 3000ms
   * @type {Number}
   */
  this.delayFetch = opts.delayFetch || 3000;

  /**
   * Detail with final data outsie the spiderMan each time the task complete
   */
  this.done = opts.done || function () {};

  /**
   * Detail with final data outsie the spiderMan after the queue is empty
   */
  this.queueDone = opts.queueDone || function () {};
};

/**
 * Add element into the queue
 *
 * @param {Object} [conf] task config
 */
spiderMan.prototype.appendQueue = function (conf) {
  // console.log('new end: ' + conf.key + ' ' + conf.url);
  var self = this;
  // this.taskQueue.push(conf);

  // To init the url of autoIncrease type conf at the very beginning
  if (conf.type === 'autoIncrease' && conf.url.trim().length === 0) {
    conf.url = conf.urlGen();
  }

  this.addFetchQueue(function () {
    return self.execSpiderFetch(conf);
  });
};

/**
 * Add element into the queue at the first index
 *
 * @param {Object} [conf] task config
 */
spiderMan.prototype.unshiftQueue = function (conf) {
  // console.log('new start: ' + conf.key + ' ' + conf.url);
  var self = this;
  // this.taskQueue.unshift(conf);

  // To init the url of autoIncrease type conf at the very beginning
  if (conf.type === 'autoIncrease' && conf.url.trim().length === 0) {
    conf.url = conf.urlGen();
  }

  this.unshiftFetchQueue(function () {
    return self.execSpiderFetch(conf);
  });
};

/**
 * Pop the first element of the queue
 *
 * @return {Object} element of queue
 */
spiderMan.prototype.popQueue = function () {
  // return this.taskQueue.length > 0 ? this.taskQueue.shift() : false;
};

/**
 * Check the queue is empty or not
 *
 * @return {boolean} Result
 */
spiderMan.prototype.checkFetchQueue = function () {
  return this.fetchQueue.length > 0;
};

/**
 * Add element into the queue
 *
 * @param {Object} [fetch] task config
 */
spiderMan.prototype.addFetchQueue = function (fetch) {
  this.fetchQueue.push(fetch);
  console.log('Tasks remain in queue for ' + this.spiderManName + ' : ' + this.getFetchQueueCount());
};

/**
 * Add element into the queue at the first index
 *
 * @param {Object} [fetch] task config
 */
spiderMan.prototype.unshiftFetchQueue = function (fetch) {
  this.fetchQueue.unshift(fetch);
  console.log('Tasks remain in queue for ' + this.spiderManName + ' : ' + this.getFetchQueueCount());
};

/**
 * Pop the first element of the fetchQueue
 *
 * @return {Object} element of fetchQueue
 */
spiderMan.prototype.popFetchQueue = function () {
  return this.fetchQueue.length > 0 ? this.fetchQueue.shift() : false;
};

/**
 * Get the total count of the fetchQueue
 *
 * @return {Object} element of fetchQueue
 */
spiderMan.prototype.getFetchQueueCount = function () {
  return this.fetchQueue.length || 0;
};

/**
 * Start the SpiderMan
 *
 * @param  {Function} cb Callback function executed after spiderMan finished
 */
spiderMan.prototype.start = function () {
  var self = this;
  var runCount = 0;
  setTimeout(function () {
    if (self.checkFetchQueue()) {
      self.popFetchQueue()().then(
        function (response) {
          self.done && self.done(response.data);
          if (response.task.type === 'autoIncrease') {
            var conf = Object.assign({}, response.task);
            conf.url = response.task.urlGen(response.data);
            if (conf.url) {
              self.appendQueue(conf);
            }
          }

          if (self.execMode === 'sync') {
            console.log('Tasks remain in queue for ' + self.spiderManName + ' : ' + self.getFetchQueueCount());
            if (!self.checkFetchQueue()) {
              self.queueDone && self.queueDone();
            }
            self.startAgain.call(self);
          }
        },
        function (error) {
          console.log(JSON.stringify(error));
          if (self.execMode === 'sync') {
            console.log('Tasks remain in queue for ' + self.spiderManName + ' : ' + self.getFetchQueueCount());
            if (!self.checkFetchQueue()) {
              self.queueDone && self.queueDone();
            }
            self.startAgain.call(self);
          }
        }
      ).finally(function () {
        runCount++;
      });
    }

    // For async mode
    if (self.execMode === 'async') {
      if (!self.checkFetchQueue()) {
        console.log('Tasks remain in queue for ' + self.spiderManName + ' : ' + self.getFetchQueueCount());
        self.queueDone && self.queueDone();
      }
      self.startAgain.call(self);
    }
  }, this.delayFetch);
};

spiderMan.prototype.startAgain = function () {
  this.start();
};

/**
 * Grab content and analyze acorrding to the pattern
 *
 * @param  {Object} task The configuration in the queue
 */
spiderMan.prototype.execSpiderFetch = function (task) {
  // if (!task) {
  //   task = this.popQueue();
  // }

  var options = {
    url: task.url,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36'
    }
  };

  if (task && task.hasOwnProperty('url') && task.url.trim().length > 0) {
    return new Promise(function (fulfill, reject) {
      console.log('### request: ' + new Date().getSeconds() + ' / ' + task.url);
      var out = request(options, function (error, response, body) {
        if (!error && response.statusCode === 200) {
          var $ = cheerio.load(body, {
            decodeEntities: false
          });
          var taskResult = {};
          task.patterns.forEach(function (pattern) {
            if (pattern.hasOwnProperty('config')) {
              var patternArrayTypeResult = [];
              $(pattern.selector).each(function (index, item) {
                var itemRes = {};
                for (var i = 0; i < pattern.config.length; i++) {
                  var subPattern = pattern.config[i];
                  var itemEl = $(item).find(subPattern.selector);

                  if (subPattern.hasOwnProperty('fn')
                    && typeof subPattern.fn === 'function') {
                    itemRes[subPattern.key] = subPattern.fn($, itemEl);
                  }
                  else {
                    itemRes[subPattern.key] = $(itemEl).text();
                  }
                }
                patternArrayTypeResult.push(itemRes);
              });
              taskResult[pattern.key] = patternArrayTypeResult;
            }
            else {
              if (pattern.hasOwnProperty('fn')
                && typeof pattern.fn === 'function') {
                taskResult[pattern.key] = pattern.fn($, $(pattern.selector));
              }
              else {
                taskResult[pattern.key] = $(pattern.selector).text();
              }
            }
          });

          fulfill({data: taskResult, task: task});
        }
        else {
          if (task.retryCount > 0) {
            task.retryCount--;
            this.execSpiderFetch(task);
          }
          else {
            reject(error);
          }
        }
      });
      // console.log(curlify(out.request, {}));
    });
  }
  else {
    return new Promise.reject('failure');
  }
};

module.exports = spiderMan;
