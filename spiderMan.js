/* eslint-disable fecs-indent */
/**
 * node-spider-man
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
  this.queue = [];

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
 */
spiderMan.prototype.addQueue = function (conf) {
  this.queue.push(conf);
};

/**
 * Pop the first element of the queue
 *
 * @return {Object} element of queue
 */
spiderMan.prototype.popQueue = function () {
  return this.queue.length > 0 ? this.queue.shift() : false;
};

/**
 * Check the queue is empty or not
 *
 * @return {Boolean} Result
 */
spiderMan.prototype.checkQueue = function () {
  return this.queue.length > 0;
};

/**
 * Start the SpiderMan
 *
 * @param  {Function} cb Callback function executed after spiderMan finished
 */
spiderMan.prototype.start = function () {
  var self = this;
  var runCount = 0;
  var timeWaiting = 0;
  while (this.checkQueue()) {
    (function (waiting) {
      var task = self.popQueue();
      if (task) {
        setTimeout(function () {
          self.execSpider(task).then(
            function (response) {
              self.done && self.done(JSON.parse(response));
            },
            function (error) {
              console.log(JSON.stringify(error));
            }
          ).finally(function () {
            runCount++;
            console.log(new Date().getTime());
          });

          console.log('runCount: ' + runCount + ' waiting: ' + waiting);
        }, waiting);
      }
    })(timeWaiting);

    timeWaiting += self.delayFetch;
  }
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
        console.log(options.url);
        console.log(response.statusCode);
        if (!error && response.statusCode === 200) {
          var $ = cheerio.load(body);
          var result = [];
          $(task.selector).each(function (index, item) {
            var itemRes = {};
            for (var i = 0; i < task.config.length; i++) {
              var subConf = task.config[i];
              var itemEl = $(item).find(subConf.selector);

              if (subConf.hasOwnProperty('fn')
                && typeof subConf.fn === 'function') {
                itemRes[subConf.key] = subConf.fn($, itemEl);
              }
              else {
                itemRes[subConf.key] = $(itemEl).text();
              }
            }
            result.push(itemRes);
          });

          fulfill(JSON.stringify(result));
        }
        else {
          if (task.retryCount > 0) {
            task.retryCount--;
            this.execSpider(task);
          }
          else {
            reject();
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
