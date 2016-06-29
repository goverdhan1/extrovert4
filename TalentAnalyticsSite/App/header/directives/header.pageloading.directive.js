'use strict';

angular.module('header')
  .directive('pageLoading', function () {
      return {
          restrict: 'E',
          templateUrl: '../../App/header/views/header.pageloading.view.html',
          link: function (scope, element, attr) {
              $(element).show();
              scope.$watch('loaded', function (val) {
                  if (val)
                      $(element).hide();
                  else
                      $(element).show();
              });
          }
      }
  })