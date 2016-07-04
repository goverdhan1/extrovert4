'use strict';

// Setting up route
angular.module('header').config(['$stateProvider', '$urlRouterProvider',
  function ($stateProvider, $urlRouterProvider) {

      // Redirect to 404 when route not found
      /*$urlRouterProvider.otherwise(function ($injector, $location) {
          $injector.get('$state').transitionTo('not-found', null, {
              location: false
          });
      });*/

      //Set a redirect for root path
     // $urlRouterProvider.when('', '/');

      $urlRouterProvider
        .otherwise('/reviwerconsole');

      //core level routings
      $stateProvider

      //Parent routing that resolves the connection with the HANA database before the application is loaded
      //Redirects user to HANA if he needs to authenticate with the HANA system
      //Set the parent for all routes as this one, to make sure HANA access is enabled and the header loads up on top
      .state('parent', {

          templateUrl: 'app/header/views/header.view.html',
          resolve: {

              //a property resolution that takes care of HANA authentication 
              hanaConnectionResolvedStatus: ['LoggedInUserDetailsService', '$rootScope', '$q', 'CoreConstants', 'UserDetails', 'toaster',
                  function (LoggedInUserDetailsService, $rootScope, $q, CoreConstants, UserDetails, toaster) {
                      var $d = $q.defer();

                      function redirectUserToHana() {

                          var localUrl = location.href;

                          var timeParam;
                          if (localUrl.indexOf('?') >= 0) {
                              timeParam = '&time=';
                          } else {
                              timeParam = '?time=';
                          }
                          var encodedUrl = encodeURIComponent(localUrl +timeParam +new Date().getTime());

                          var url = CoreConstants.baseHANAUrl + 'XSJS/RedirectPOC.xsjs?url=' + encodedUrl;

                          var getQueryString = function (field, url) {
                              var href = url ? url : window.location.href;
                              var reg = new RegExp('[?&]' + field + '=([^&#]*)', 'i');
                              var string = reg.exec(href);
                              return string ? string[1] : null;
                          };

                          var getTimeParam = getQueryString('time');

                          if (getTimeParam == null) {
                              console.log('Redirecting user to: ' +url);
                              location.href = url;
                          } else {
                              var currentDateTime = new Date();
                              var timeStamp = parseInt(getTimeParam / 1000);
                              var timeStampDateTime = new Date(timeStamp * 1000);
                              if (currentDateTime > timeStampDateTime) {
                                  alert("User does not have access");
                              }
                          }
                      }

                      LoggedInUserDetailsService.get().$promise.then(function (data) {

                          if (data && data.d && data.d.results) {

                            if (data.d.results.length <= 0) {
                                alert("Unable to grant access to the application.\n\n We are missing some critical information about you in our database.\n\n Please contact the support team to get this resolved. ");
                                return false;
                          }

                            var userData = data.d.results[0];
                            UserDetails.windowsUserId = userData.WINDOWS_ID || userData.USRID;
                            UserDetails.userId = userData.USRID;
                            if (UserDetails.userId && UserDetails.analyticsDataToSend && UserDetails.analyticsDataToSend.pageName && UserDetails.analyticsDataToSend.title) {
                                console.log("Sending analytics data for page %s and title %s for user %s at the url %s", UserDetails.analyticsDataToSend.pageName, UserDetails.analyticsDataToSend.title, UserDetails.userId, window.location.href);
                                analyticsPageTrack(UserDetails.analyticsDataToSend.pageName, UserDetails.analyticsDataToSend.title, UserDetails.userId);
                                UserDetails.analyticsDataToSend = null;
                            }

                            UserDetails.userFirstName = userData.PFIRSTNAM;
                            UserDetails.userLastName = userData.PLASTNAME;
                            UserDetails.userDesignation = userData.HRPOSITION_TXT;

                              //Resolve the promise. Now the rest of the application can load
                            $d.resolve({ resolved: true });
                          } else {
                            var errorMessage = 'User information could not be retrieved';
                            console.log('Redirecting user to HANA for Authentication');
                            redirectUserToHana();
                      }
                      }, function (error) {
                          // Tracking errors
                          var errMessage = "Error occured during a test call to HANA Database";
                          console.error(errMessage, error);
                          toaster.pop('error', errMessage);
                          console.log('Redirecting user to HANA for Authentication');
                          redirectUserToHana();
                          //leave the promise unresolved to prevent the rest of the application from loading
                      });

                          //Return the deferred promise. Application has to wait before this promise is resolved
                      return $d.promise;
                  }]
          }
      })

        .state("employeeform", {
            url: "/employeeform",
            parent: 'parent',
            templateUrl: 'App/employee-form/views/employeeForm.html'
        })
          .state("reviwerconsole", {
              url: "/reviwerconsole",
              parent: 'parent',
              templateUrl: 'App/reviewer-console/views/reviewerConsole.html'
          })
        .state("reviewerform", {
            url: "/reviewerform",
            parent: 'parent',
            templateUrl: 'App/reviwer-form/views/reviewerForm.html'
        })

      //Route for the site home
     /* .state('home', {
          url: '/?tabIndex',
          parent: 'parent',
          templateUrl: 'app/dashboard/views/dashboard.html',
          resolve: {
              
              analyticsDataSent: function (RouteLoadUpdatesService) {
                  RouteLoadUpdatesService.updatesBeforeRouteLoad('HM Summary');
              }
          },
      })

      //Navigation Routes to the Error Pages
      .state('not-found', {
          url: '/not-found',
          templateUrl: 'app/core/views/404.html',
          data: {
              ignoreState: true
          }
      })
      .state('bad-request', {
          url: '/bad-request',
          templateUrl: 'app/core/views/400.html',
          data: {
              ignoreState: true
          }
      })
      .state('forbidden', {
          url: '/forbidden',
          templateUrl: 'app/core/views/403.html',
          data: {
              ignoreState: true
          }
      })
      .state('header', {
          url: '/header',
          templateUrl: 'app/header/views/header.html',
          data: {
              ignoreState: true
          }
      });*/
  }
])