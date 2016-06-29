'use strict';

angular.module('reviewerConsole').controller('reviewerConsoleCtrl', function ($rootScope, GetEmpToReviewService) {

    //Init function
    (function () {
        $rootScope.$broadcast('moduleName', 'reviewerConsole');

        GetEmpToReviewService.getEmpToReview().$promise
            .then(function (result) {

            },
            function (err) {
                console.log('Error while fetching Employees toReview details: '+ err)
            })

    })();


});