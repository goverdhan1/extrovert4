'use strict';

//Service used for communicating with the a test OData endpoints
angular.module('header').factory('LoggedInUserDetailsService', ['$resource', 'CoreConstants',function ($resource, CoreConstants) {
    var url = CoreConstants.baseHANAUrl + 'Services/Talent_Analytics_User_Info.xsodata/USER_INFO?$format=json';
          return $resource(url, {employeeId: '@employeeId'}, {
          'get': {
              method: 'GET',
              withCredentials: true
          }
      });
  }
]);

