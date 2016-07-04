'use strict';

angular.module('reviewerConsole').controller('reviewerConsoleCtrl', function ($scope, $rootScope, GetEmpToReviewService) {

    //Init function
    (function () {
        $rootScope.$broadcast('moduleName', 'reviewerConsole');

        $scope.empToReview = [];

        GetEmpToReviewService.getEmpToReview().$promise
            .then(function (result) {
                $scope.empToReview = result;
            },
            function (err) {
                console.log('Error while fetching Employees toReview details: '+ err)
            })

    })();


});