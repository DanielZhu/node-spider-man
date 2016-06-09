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
   * Current spiderMan tasks list
   * @type {Array}
   */
  this.taskQueue = [];

  /**
   * [fetchQueue description]
   *
   * @type {Array}
   */
  this.fetchQueue = [];

  /**
   * Waiting time before each fetch task starts
   *
   * default to 2000ms
   * @type {Number}
   */
  this.delayFetch = opts.delayFetch || 2000;

  /**
   * Detail with final data outsie the spiderMan
   */
  this.done = opts.done || function () {};
};

/**
 * Add element into the queue
 *
 * @param {Object} [conf] task config
 */
spiderMan.prototype.appendQueue = function (conf) {
  this.taskQueue.push(conf);
};

/**
 * Add element into the queue at the first index
 *
 * @param {Object} [conf] task config
 */
spiderMan.prototype.unshiftQueue = function (conf) {
  this.taskQueue.unshift(conf);
};

/**
 * Pop the first element of the queue
 *
 * @return {Object} element of queue
 */
spiderMan.prototype.popQueue = function () {
  return this.taskQueue.length > 0 ? this.taskQueue.shift() : false;
};

/**
 * Check the queue is empty or not
 *
 * @return {boolean} Result
 */
spiderMan.prototype.checkQueue = function () {
  return this.taskQueue.length > 0;
};

/**
 * Add element into the queue
 *
 * @param {Object} [fetch] task config
 */
spiderMan.prototype.addFetchQueue = function (fetch) {
  this.fetchQueue.push(fetch);
};

/**
 * Pop the first element of the queue
 *
 * @return {Object} element of queue
 */
spiderMan.prototype.popFetchQueue = function () {
  return this.fetchQueue.length > 0 ? this.fetchQueue.shift() : false;
};

/**
 * Start the SpiderMan
 *
 * @param  {Function} cb Callback function executed after spiderMan finished
 */
spiderMan.prototype.start = function () {
  var self = this;

  while (this.checkQueue()) {
    (function () {
      var task = self.popQueue();
      if (task) {
        if (task.type === 'autoIncrease') {
          task.url = task.urlGen();
        }

        self.addFetchQueue(function () {
          return self.execSpider(task);
        });
      }
    })();
  }

  this.spiderNow();
};

spiderMan.prototype.spiderNow = function () {
  var self = this;
  var runCount = 0;
  setTimeout(function () {
    if (self.fetchQueue.length > 0) {
      self.popFetchQueue()().then(
        function (response) {
          self.done && self.done(response.data);
          if (response.task.type === 'autoIncrease') {
            var conf = Object.assign({}, response.task);
            conf.url = response.task.urlGen(response.data);
            if (conf.url) {
              self.addFetchQueue(function () {
                return self.execSpider(conf);
              });
            }
          }
        },
        function (error) {
          console.log(JSON.stringify(error));
        }
      ).finally(function () {
        runCount++;
        console.log('runCount: ' + runCount + '  ' + new Date().getTime());
        self.fetchQueue.length > 0 && self.spiderNow();
      });
    }
  }, this.delayFetch);
};

/**
 * Grab content and analyze acorrding to the pattern
 *
 * @param  {Object} task The configuration in the queue
 */
spiderMan.prototype.execSpider = function (task) {
  if (!task) {
    task = this.popQueue();
  }

  var options = {
    url: task.url,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36'
    }
  };

  if (task) {
    return new Promise(function (fulfill, reject) {
      var out = request(options, function (error, response, body) {
        // console.log(options.url);
        if (!error && response.statusCode === 200) {
          var $ = cheerio.load(body);
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
            this.execSpider(task);
          }
          else {
            reject('err');
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
