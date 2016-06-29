'use strict';

angular.module('header').factory('LogoutService', ['$resource', 'CoreConstants',function ($resource, CoreConstants) {
    var url = '/Logout/Get';
          return $resource(url, {}, {
          'get': {
              method: 'GET',
              withCredentials: true
          }
      });
  }
]);

