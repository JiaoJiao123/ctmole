'use strict';

// Trials controller
angular.module('trials').controller('TrialsController', 
	['$scope', 
	'$stateParams', 
	'$location', 
	'Authentication', 
	'Trials',
	function($scope, $stateParams, $location, Authentication, Trials) {
		$scope.authentication = Authentication;
		$scope.nctId = '';

		function syntaxHighlight(json) {
			json = JSON.stringify(json, undefined, 4);
		    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
		        var cls = 'number';
		        if (/^"/.test(match)) {
		            if (/:$/.test(match)) {
		                cls = 'key';
		            } else {
		                cls = 'string';
		            }
		        } else if (/true|false/.test(match)) {
		            cls = 'boolean';
		        } else if (/null/.test(match)) {
		            cls = 'null';
		        }
		        return '<span class="' + cls + '">' + match + '</span>';
		    });
		}

		$scope.beautify = syntaxHighlight;
		// Create new Trial
		$scope.create = function() {
			// Create new Trial object
			var trial = new Trials ({
				nctId: this.name
			});

			// Redirect after save
			trial.$save(function(response) {
				$location.path('trials/' + response._id);

				// Clear form fields
				$scope.name = '';
			}, function(errorResponse) {
				$scope.error = errorResponse.data.message;
			});
		};

		// Remove existing Trial
		$scope.remove = function( trial ) {
			if ( trial ) { trial.$remove();

				for (var i in $scope.trials ) {
					if ($scope.trials [i] === trial ) {
						$scope.trials.splice(i, 1);
					}
				}
			} else {
				$scope.trial.$remove(function() {
					$location.path('trials');
				});
			}
		};

		// Update existing Trial
		$scope.update = function() {
			var trial = $scope.trial ;

			trial.$update(function() {
				$location.path('trials/' + trial.nctId);
			}, function(errorResponse) {
				$scope.error = errorResponse.data.message;
			});
		};

		// Find a list of Trials
		$scope.find = function() {
			$scope.trials = Trials.nctId.query();
		};

		// Find existing Trial
		$scope.findOne = function() {
			$scope.trial = Trials.nctId.get({ 
				nctId: $stateParams.nctId
			});
		};

		$scope.searchByKeyword = function() {
			$scope.trials = Trials.keyword.query({
				keyword: $scope.keyword
			});
			console.log($scope.trials);
		};

		$scope.searchTrailBynctId = function() {
			$location.path('trials/' + $scope.nctId);
		};

		$scope.getDrugs = function(drugs) {
			return drugs.map(function(e){return e.drugName;}).join(', ');
		};
	}
]);