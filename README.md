# node-spider-man
[![NPM version][npm-version-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![License][license-image]][npm-url] 

## Features

- Transform the page into JSON format response according to the rules
- Use fetchQueue to manage the fetchRequests in the order
- Support sync and async mode.  
  - sync: Execute each fetchTask after the previous one finished
  - async: Execute each fetchTask after the delayFetch time
- Support queue finished callback

## How to use

`npm install node-spider-man --save` 

`var spiderMan = require('node-spider-man');`

## Demo

[The demo](https://github.com/DanielZhu/node-spider-man-demo) shows the experiement that we can grab what we want from the internet using node-spider-man

Lisence @Apache-2.0 

Copyright to @2012-2016 [Staydan.com](http://staydan.com)

[license-image]: https://img.shields.io/npm/l/node-spider-man.svg?maxAge=2592000&style=flat-square
[downloads-image]: https://img.shields.io/npm/dm/node-spider-man.svg?maxAge=2592000&style=flat-square
[npm-version-image]: http://img.shields.io/npm/v/node-spider-man.svg?maxAge=2592000&style=flat-square
[npm-url]: https://www.npmjs.com/package/node-spider-man
