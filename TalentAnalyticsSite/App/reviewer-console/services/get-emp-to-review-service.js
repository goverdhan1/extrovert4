'use strict';

angular.module('reviewerConsole').factory('GetEmpToReviewService', function ($resource, UserDetails) {

    var url = "https://ushdbhwd.deloitte.com/deloitte/hr/app-talent-analytics/app-talent-hcm/Services/Employee_HCM_Reviewer_Console_Details_Get_Service.xsodata/HCM_REVIEWER_CONSOLE_DETAILS_GET_SERVICE/?$format=json";
    

    return $resource(url, {
    }, {
        'getEmpToReview': {
            method: 'GET',
            withCredentials: true
        }
    });
});