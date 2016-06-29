angular.module('tatypeahead')

/**
 * A helper service that can parse tatypeahead's syntax (string provided by users)
 * Extracted to a separate service for ease of unit testing
 */
  .factory('tatypeaheadParser', ['$parse', function ($parse) {

      //                      00000111000000000000022200000000000000003333333333333330000000000044000
      var TYPEAHEAD_REGEXP = /^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?\s+for\s+(?:([\$\w][\$\w\d]*))\s+in\s+([\s\S]+?)\s+paginationFunction\s+([\s\S]+?)$/;

      return {
          parse: function (input) {
              var match = input.match(TYPEAHEAD_REGEXP);
              if (!match) {
                  throw new Error(
                    'Expected tatypeahead specification in form of "_modelValue_ (as _label_)? for _item_ in _collection paginationFunction _paginationFunction_"' +
                      ' but got "' + input + '".');
              }

              return {
                  itemName: match[3],
                  source: $parse(match[4]),
                  viewMapper: $parse(match[2] || match[1]),
                  modelMapper: $parse(match[1]),
                  paginationFunction: match.length > 5 ? $parse(match[5]) : null,
                  resultsPerPage: match.length > 6 ? match[6] : null,

              };
          }
      };
  }])

  .directive('tatypeahead', ['$compile', '$parse', '$q', '$timeout', '$document', '$window', '$rootScope', '$position', 'tatypeaheadParser',
    function ($compile, $parse, $q, $timeout, $document, $window, $rootScope, $position, tatypeaheadParser) {
        var HOT_KEYS = [9, 13, 27, 38, 40];
        var eventDebounceTime = 200;

        return {
            require: ['ngModel', '^?ngModelOptions'],
            link: function (originalScope, element, attrs, ctrls) {
                var modelCtrl = ctrls[0];
                var ngModelOptions = ctrls[1];
                //SUPPORTED ATTRIBUTES (OPTIONS)

                //minimal no of characters that needs to be entered before tatypeahead kicks-in
                var minLength = originalScope.$eval(attrs.tatypeaheadMinLength);
                if (!minLength && minLength !== 0) {
                    minLength = 1;
                }

                //minimal wait time after last character typed before tatypeahead kicks-in
                var waitTime = originalScope.$eval(attrs.tatypeaheadWaitMs) || 0;

                //should it restrict model values to the ones selected from the popup only?
                var isEditable = originalScope.$eval(attrs.tatypeaheadEditable) !== false;

                //binding to a variable that indicates if matches are being retrieved asynchronously
                var isLoadingSetter = $parse(attrs.tatypeaheadLoading).assign || angular.noop;

                //a callback executed when a match is selected
                var onSelectCallback = $parse(attrs.tatypeaheadOnSelect);

                //should it select highlighted popup value when losing focus?
                var isSelectOnBlur = angular.isDefined(attrs.tatypeaheadSelectOnBlur) ? originalScope.$eval(attrs.tatypeaheadSelectOnBlur) : false;

                //binding to a variable that indicates if there were no results after the query is completed
                var isNoResultsSetter = $parse(attrs.tatypeaheadNoResults).assign || angular.noop;

                var inputFormatter = attrs.tatypeaheadInputFormatter ? $parse(attrs.tatypeaheadInputFormatter) : undefined;

                var appendToBody = attrs.tatypeaheadAppendToBody ? originalScope.$eval(attrs.tatypeaheadAppendToBody) : false;

                var focusFirst = originalScope.$eval(attrs.tatypeaheadFocusFirst) !== false;

                //If input matches an item of the list exactly, select it automatically
                var selectOnExact = attrs.tatypeaheadSelectOnExact ? originalScope.$eval(attrs.tatypeaheadSelectOnExact) : false;

                //INTERNAL VARIABLES

                //model setter executed upon match selection
                var parsedModel = $parse(attrs.ngModel);
                var invokeModelSetter = $parse(attrs.ngModel + '($$$p)');
                var $setModelValue = function (scope, newValue) {
                    if (angular.isFunction(parsedModel(originalScope)) &&
                      ngModelOptions && ngModelOptions.$options && ngModelOptions.$options.getterSetter) {
                        return invokeModelSetter(scope, { $$$p: newValue });
                    } else {
                        return parsedModel.assign(scope, newValue);
                    }
                };

                //expressions used by tatypeahead
                var parserResult = tatypeaheadParser.parse(attrs.tatypeahead);

                var hasFocus;

                //Used to avoid bug in iOS webview where iOS keyboard does not fire
                //mousedown & mouseup events
                //Issue #3699
                var selected;

                //create a child scope for the tatypeahead directive so we are not polluting original scope
                //with tatypeahead-specific data (matches, query etc.)
                var scope = originalScope.$new();
                var offDestroy = originalScope.$on('$destroy', function () {
                    scope.$destroy();
                });
                scope.$on('$destroy', offDestroy);

                // WAI-ARIA
                var popupId = 'tatypeahead-' + scope.$id + '-' + Math.floor(Math.random() * 10000);
                element.attr({
                    'aria-autocomplete': 'list',
                    'aria-expanded': false,
                    'aria-owns': popupId
                });

                //pop-up element used to display matches
                var popUpEl = angular.element('<div tatypeahead-popup></div>');
                popUpEl.attr({
                    id: popupId,
                    matches: 'matches',
                    active: 'activeIdx',
                    select: 'select(activeIdx)',
                    'move-in-progress': 'moveInProgress',
                    query: 'query',
                    position: 'position'
                });
                //custom item template
                if (angular.isDefined(attrs.tatypeaheadTemplateUrl)) {
                    popUpEl.attr('template-url', attrs.tatypeaheadTemplateUrl);
                }

                if (angular.isDefined(attrs.tatypeaheadPopupTemplateUrl)) {
                    popUpEl.attr('popup-template-url', attrs.tatypeaheadPopupTemplateUrl);
                }

                var resetMatches = function () {
                    scope.matches = [];
                    scope.activeIdx = -1;
                    scope.currentPageNumber = 1;
                    element.attr('aria-expanded', false);
                    scope.showdropdownedisplay = false;
                
                   
                };

                var getMatchId = function (index) {
                    return popupId + '-option-' + index;
                };

                // Indicate that the specified match is the active (pre-selected) item in the list owned by this tatypeahead.
                // This attribute is added or removed automatically when the `activeIdx` changes.
                scope.$watch('activeIdx', function (index) {
                    if (index < 0) {
                        element.removeAttr('aria-activedescendant');
                    } else {
                        element.attr('aria-activedescendant', getMatchId(index));
                    }
                });

                var inputIsExactMatch = function (inputValue, index) {
                    if (scope.matches.length > index && inputValue) {
                        return inputValue.toUpperCase() === scope.matches[index].label.toUpperCase();
                    }

                    return false;
                };

                var getMatchesAsync = function (inputValue, paginationFunction) {

                    var pageNumber;
                    if (!paginationFunction) {
                        scope.currentPageNumber = 1;
                    } else {

                        switch (paginationFunction) {
                            case 'previousPage':
                                if (scope.currentPageNumber && scope.currentPageNumber > 1) {
                                    pageNumber = scope.currentPageNumber - 1;
                                } else {
                                    console.error('Cannot set page index to previous page');
                                    return;
                                }
                                break;
                            case 'nextPage':
                                if (scope.currentPageNumber) {
                                    pageNumber = scope.currentPageNumber + 1;
                                } else {
                                    console.error('Cannot set page index to next page');
                                    return;
                                }
                                break;
                            default:
                                console.error('Invalid pagination function');
                        }
                   }
                        
                    var locals = { $viewValue: inputValue, $pageNumber: pageNumber };
                    isLoadingSetter(originalScope, true);
                    isNoResultsSetter(originalScope, false);
                    var functionToCall = parserResult["source"];
                    if (paginationFunction) {
                        functionToCall = parserResult["paginationFunction"];
                    }
                    $q.when(functionToCall(originalScope, locals, scope.currentPageNumber)).then(function (matches) {
                        //it might happen that several async queries were in progress if a user were typing fast
                        //but we are interested only in responses that correspond to the current view value
                        var onCurrentRequest = (inputValue === modelCtrl.$viewValue);
                        if (onCurrentRequest && (hasFocus || paginationFunction)) {
                            if (matches && matches.length > 0) {
                                if (originalScope.resultsPerPage) {
                                    scope.showdropdownedisplay = true;
                                    scope.showNextPageButton = matches.length > originalScope.resultsPerPage;
                                    scope.noresult = false;
                                     $(".tatypeahead.dropdown-menu.ng-isolate-scope").css("display", "block");
                                }
                                if (paginationFunction) {
                                    scope.currentPageNumber = pageNumber;
                                }
                                scope.activeIdx = focusFirst ? 0 : -1;
                                isNoResultsSetter(originalScope, false);
                                scope.matches.length = 0;

                                //transform labels
                                for (var i = 0; i < matches.length; i++) {
                                    locals[parserResult.itemName] = matches[i];
                                    scope.matches.push({
                                        id: getMatchId(i),
                                        label: parserResult.viewMapper(scope, locals),
                                        model: matches[i]
                                    });
                                }

                                scope.query = inputValue;
                                //position pop-up with matches - we need to re-calculate its position each time we are opening a window
                                //with matches as a pop-up might be absolute-positioned and position of an input might have changed on a page
                                //due to other elements being rendered
                                recalculatePosition();

                                element.attr('aria-expanded', true);

                                //Select the single remaining option if user input matches
                                if (selectOnExact && scope.matches.length === 1 && inputIsExactMatch(inputValue, 0)) {
                                    scope.select(0);
                                }
                         
                            }

                            else {
                                scope.matches = [];
                                scope.showdropdownedisplay = true;
                                scope.showNextPageButton = false;
                                scope.noresult = true;
                                $(".tatypeahead.dropdown-menu.ng-isolate-scope").css("display", "block");
                                //resetMatches();
                                isNoResultsSetter(originalScope, true);
                            }
                        }
                        if (onCurrentRequest) {
                            isLoadingSetter(originalScope, false);
                        }
                    }, function () {
                      resetMatches();
                        isLoadingSetter(originalScope, false);
                        isNoResultsSetter(originalScope, true);
                    });
                };

                scope.getMatchesAsync = getMatchesAsync;

                // bind events only if appendToBody params exist - performance feature
                if (appendToBody) {
                    angular.element($window).bind('resize', fireRecalculating);
                    $document.find('body').bind('scroll', fireRecalculating);
                }

                // Declare the timeout promise var outside the function scope so that stacked calls can be cancelled later
                var timeoutEventPromise;

                // Default progress type
                scope.moveInProgress = false;

                function fireRecalculating() {
                    if (!scope.moveInProgress) {
                        scope.moveInProgress = true;
                        scope.$digest();
                    }

                    // Cancel previous timeout
                    if (timeoutEventPromise) {
                        $timeout.cancel(timeoutEventPromise);
                    }

                    // Debounced executing recalculate after events fired
                    timeoutEventPromise = $timeout(function () {
                        // if popup is visible
                        if (scope.matches.length) {
                            recalculatePosition();
                        }

                        scope.moveInProgress = false;
                        scope.$digest();
                    }, eventDebounceTime);
                }

                // recalculate actual position and set new values to scope
                // after digest loop is popup in right position
                function recalculatePosition() {
                    scope.position = appendToBody ? $position.offset(element) : $position.position(element);
                    scope.position.top += element.prop('offsetHeight');
                }

                resetMatches();

                //we need to propagate user's query so we can higlight matches
                scope.query = undefined;

                //Declare the timeout promise var outside the function scope so that stacked calls can be cancelled later
                var timeoutPromise;

                var scheduleSearchWithTimeout = function (inputValue) {
                    timeoutPromise = $timeout(function () {
                        getMatchesAsync(inputValue);
                    }, waitTime);
                };

                var cancelPreviousTimeout = function () {
                    if (timeoutPromise) {
                        $timeout.cancel(timeoutPromise);
                    }
                };

                //plug into $parsers pipeline to open a tatypeahead on view changes initiated from DOM
                //$parsers kick-in on all the changes coming from the view as well as manually triggered by $setViewValue
                modelCtrl.$parsers.unshift(function (inputValue) {
                    hasFocus = true;

                    if (minLength === 0 || inputValue && inputValue.length >= minLength) {
                        if (waitTime > 0) {
                            cancelPreviousTimeout();
                            scheduleSearchWithTimeout(inputValue);
                        } else {
                            getMatchesAsync(inputValue);
                        }
                    } else {
                        isLoadingSetter(originalScope, false);
                        cancelPreviousTimeout();
                        resetMatches();
                    }

                    if (isEditable) {
                        return inputValue;
                    } else {
                        if (!inputValue) {
                            // Reset in case user had typed something previously.
                            modelCtrl.$setValidity('editable', true);
                            return null;
                        } else {
                            modelCtrl.$setValidity('editable', false);
                            return undefined;
                        }
                    }
                });

                modelCtrl.$formatters.push(function (modelValue) {
                    var candidateViewValue, emptyViewValue;
                    var locals = {};

                    // The validity may be set to false via $parsers (see above) if
                    // the model is restricted to selected values. If the model
                    // is set manually it is considered to be valid.
                    if (!isEditable) {
                        modelCtrl.$setValidity('editable', true);
                    }

                    if (inputFormatter) {
                        locals.$model = modelValue;
                        return inputFormatter(originalScope, locals);
                    } else {
                        //it might happen that we don't have enough info to properly render input value
                        //we need to check for this situation and simply return model value if we can't apply custom formatting
                        locals[parserResult.itemName] = modelValue;
                        candidateViewValue = parserResult.viewMapper(originalScope, locals);
                        locals[parserResult.itemName] = undefined;
                        emptyViewValue = parserResult.viewMapper(originalScope, locals);

                        return candidateViewValue !== emptyViewValue ? candidateViewValue : modelValue;
                    }
                });

                scope.select = function (activeIdx) {

                    
                    //called from within the $digest() cycle
                    var locals = {};
                    var model, item;

                    selected = true;
                    locals[parserResult.itemName] = item = scope.matches[activeIdx].model;
                    model = parserResult.modelMapper(originalScope, locals);
                    $setModelValue(originalScope, model);
                    modelCtrl.$setValidity('editable', true);
                    modelCtrl.$setValidity('parse', true);

                    onSelectCallback(originalScope, {
                        $item: item,
                        $model: model,
                        $label: parserResult.viewMapper(originalScope, locals)
                    });

                    resetMatches();

                    //return focus to the input element if a match was selected via a mouse click event
                    // use timeout to avoid $rootScope:inprog error
                    if (scope.$eval(attrs.tatypeaheadFocusOnSelect) !== false) {
                        $timeout(function () { element[0].focus(); }, 0, false);
                    }


                };

                //bind keyboard events: arrows up(38) / down(40), enter(13) and tab(9), esc(27)
                element.bind('keydown', function (evt) {

                    if (evt.which === 13) {
                        var urlempty = $('li.ng-scope.active #searchkeydown').attr('href');
                        if (urlempty) {
                            window.location.href = $('li.ng-scope.active #searchkeydown').attr('href');
                        }

                        }

                        if (evt.which === 40) {
                            $('div.tatypeahead.dropdown-menu.ng-isolate-scope ul li.ng-scope.active').removeClass('active').next('li.ng-scope').addClass('active');
                                 if ($('div.tatypeahead.dropdown-menu.ng-isolate-scope ul li.ng-scope.active').length == "0") {
                                $('div.tatypeahead.dropdown-menu.ng-isolate-scope ul li.ng-scope:first').addClass('active')
                                 }
                                                      
                        }

                        if (evt.which === 38) {
                            $('div.tatypeahead.dropdown-menu.ng-isolate-scope ul li.ng-scope.active').removeClass('active').prev('li.ng-scope').addClass('active');
                                if ($('div.tatypeahead.dropdown-menu.ng-isolate-scope ul li.ng-scope.active').length == "0") {
                                $('div.tatypeahead.dropdown-menu.ng-isolate-scope ul li.ng-scope:last').addClass('active')
                                }
                        }
                  
                });
  

                element.bind('blur', function () {
                    if (isSelectOnBlur && scope.matches.length && scope.activeIdx !== -1 && !selected) {
                        selected = true;
                        scope.$apply(function () {
                            scope.select(scope.activeIdx);
                        });
                    }
                    hasFocus = false;
                    selected = false;
                });

                // Keep reference to click handler to unbind it.
                var dismissClickHandler = function (evt) {
                    // Issue #3973
                    // Firefox treats right click as a click on document
                    if (element[0] !== evt.target && evt.which !== 3 && scope.matches.length !== 0) {
                        resetMatches();
                        if (!$rootScope.$$phase) {
                            scope.$digest();
                        }
                    }
                };

//                $document.bind('click', dismissClickHandler);

                originalScope.$on('$destroy', function () {
                    $document.unbind('click', dismissClickHandler);
                    if (appendToBody) {
                        $popup.remove();
                    }
                    // Prevent jQuery cache memory leak
                    popUpEl.remove();
                });

           
                var $popup = $compile(popUpEl)(scope);

                if (appendToBody) {
                    $document.find('body').append($popup);
                } else {
                    element.after($popup);
                }
            }
        };

    }])

  .directive('tatypeaheadPopup', function () {
      return {
          restrict: 'EA',
          scope: {
              matches: '=',
              query: '=',
              active: '=',
              position: '&',
              moveInProgress: '=',
              select: '&'
          },
          replace: true,
          templateUrl: function (element, attrs) {
              return attrs.popupTemplateUrl || 'template/tatypeahead/tatypeahead-popup.html';
          },
          link: function (scope, element, attrs) {
              scope.templateUrl = attrs.templateUrl;
              scope.isOpen = function () {
                  return scope.matches.length > 0;
              };

              scope.isActive = function (matchIdx) {
                  return scope.active == matchIdx;
              };

              scope.selectActive = function (matchIdx) {
                  scope.active = matchIdx;
              }
              scope.typeheadmouseenter = function () {
                  $('div.tatypeahead.dropdown-menu.ng-isolate-scope ul li.ng-scope.active').toggleClass('active');
              };

              scope.selectMatch = function (activeIdx) {
                  scope.select({ activeIdx: activeIdx });
              };

              scope.previousPage = function () {
                  scope.$parent.getMatchesAsync(scope.query, 'previousPage');
              };

              scope.nextPage = function () {
                  scope.$parent.getMatchesAsync(scope.query, 'nextPage');
              };
          }
      };
  })

  .directive('tatypeaheadMatch', ['$templateRequest', '$compile', '$parse', function ($templateRequest, $compile, $parse) {
      return {
          restrict: 'EA',
          scope: {
              index: '=',
              match: '=',
              query: '='
          },
          link: function (scope, element, attrs) {
              var tplUrl = $parse(attrs.templateUrl)(scope.$parent) || 'template/tatypeahead/tatypeahead-match.html';
              $templateRequest(tplUrl).then(function (tplContent) {
                  $compile(tplContent.trim())(scope, function (clonedElement) {
                      element.replaceWith(clonedElement);
                  });
              });
          }
      };
  }])

  .filter('tatypeaheadHighlight', ['$sce', '$injector', '$log', function ($sce, $injector, $log) {
      var isSanitizePresent;
      isSanitizePresent = $injector.has('$sanitize');

      function escapeRegexp(queryToEscape) {
          // Regex: capture the whole query string and replace it with the string that will be used to match
          // the results, for example if the capture is "a" the result will be \a
          return queryToEscape.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
      }

      function containsHtml(matchItem) {
          return /<.*>/g.test(matchItem);
      }

      return function (matchItem, query) {
          if (!isSanitizePresent && containsHtml(matchItem)) {
              $log.warn('Unsafe use of tatypeahead please use ngSanitize'); // Warn the user about the danger
          }
          matchItem = query ? ('' + matchItem).replace(new RegExp(escapeRegexp(query), 'gi'), '<strong>$&</strong>') : matchItem; // Replaces the capture string with a the same string inside of a "strong" tag
          if (!isSanitizePresent) {
              matchItem = $sce.trustAsHtml(matchItem); // If $sanitize is not present we pack the string in a $sce object for the ng-bind-html directive
          }
          return matchItem;
      };
  }]);