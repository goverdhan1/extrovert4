'use strict';

angular.module('reviewerConsole').factory('GetEmpToReviewService', function ($resource, UserDetails) {

    var url = "https://ushdbhwd.deloitte.com/deloitte/hr/app-talent-analytics/app-talent-hcm/Services/Employee_HCM_Emp_Form_Details_Get_Service.xsodata/HCM_EMP_FORM_DETAILS_GET_SERVICEParameters(IP_EMPLOYEE_EMAIL='" + UserDetails.userId + "')/Results?$format=json";
    

    return $resource(url, {
    }, {
        'getEmpToReview': {
            method: 'GET',
            withCredentials: true
        }
    });
});