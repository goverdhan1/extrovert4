'use strict';

angular.module('header').factory('KeepAliveService', ['$resource', 'CoreConstants',function ($resource, CoreConstants) {
    var url = CoreConstants.baseHANAUrl + 'XSJS/KeepAlive.xsjs?$format=json';
          return $resource(url, {}, {
          'get': {
              method: 'GET',
              withCredentials: true
          }
      });
  }
]);

