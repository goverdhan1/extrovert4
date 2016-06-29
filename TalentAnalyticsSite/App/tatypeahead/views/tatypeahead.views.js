angular.module("template/tatypeahead/tatypeahead-match.html", []).run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/tatypeahead/tatypeahead-match.html",
      "<a tabindex=\"-1\" bind-html-unsafe=\"match.label | tatypeaheadHighlight:query\"></a>");
}]);

angular.module("template/tatypeahead/tatypeahead-popup.html", []).run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/tatypeahead/tatypeahead-popup.html",
      "<div class=\"tatypeahead dropdown-menu \" ng-show=\"$parent.showdropdownedisplay\"   >\n" +
      " <div>\n" +


      "<span  ng-show=\"$parent.noresult\" class=\"mystylechage\" >No Records Found </span>" +
      "    <button type=\"button\" class=\"btn btn-default btn-sm pull-right align-margin pagination-button\" ng-show=\"$parent.showNextPageButton\" ng-click=\"nextPage(); $event.stopPropagation()\"><icon class=\"glyphicon glyphicon-chevron-right\"></icon></button>\n" +
      "    <button type=\"button\" class=\"btn btn-default btn-sm pull-right pagination-button\" ng-show=\"$parent.currentPageNumber > 1\" ng-click=\"previousPage();  $event.stopPropagation()\"><icon class=\"glyphicon glyphicon-chevron-left\"></icon></button>\n" +
      " </div>\n" +
      " <ul style=\"list-style:none;padding:0px\">\n" +
      "    <li ng-repeat=\"match in matches|limitTo:$parent.resultsPerPage\" ng-class=\"{active: isActive($index) }\" ng-mouseenter=\"selectActive($index); typeheadmouseenter()\" ng-click=\"selectMatch($index)\">\n" +
      "        <tatypeahead-match index=\"$index\" match=\"match\" query=\"query\" template-url=\"templateUrl\"></tatypeahead-match>\n" +
      "    </li>\n" +
      " </ul>\n" +
      "</div>");
}]);

angular.module("template/tatypeahead/tatypeahead.html", []).run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/tatypeahead/tatypeahead.html",
      "<ul class=\"tatypeahead dropdown-menu\" ng-style=\"{display: isOpen()&&'block' || 'none', top: position.top+'px', left: position.left+'px'}\">\n" +
      "    <li ng-repeat=\"match in matches\" ng-class=\"{active: isActive($index) }\" ng-mouseenter=\"selectActive($index)\">\n" +
      "        <a tabindex=\"-1\" ng-click=\"selectMatch($index)\" ng-bind-html-unsafe=\"match.label | tatypeaheadHighlight:query\"></a>\n" +
      "    </li>\n" +
      "</ul>");
}]);



