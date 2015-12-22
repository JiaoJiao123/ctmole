/*
 * Copyright (c) 2015 Memorial Sloan-Kettering Cancer Center.
 *
 * This library is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY, WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR FITNESS
 * FOR A PARTICULAR PURPOSE. The software and documentation provided hereunder
 * is on an "as is" basis, and Memorial Sloan-Kettering Cancer Center has no
 * obligations to provide maintenance, support, updates, enhancements or
 * modifications. In no event shall Memorial Sloan-Kettering Cancer Center be
 * liable to any party for direct, indirect, special, incidental or
 * consequential damages, including lost profits, arising out of the use of this
 * software and its documentation, even if Memorial Sloan-Kettering Cancer
 * Center has been advised of the possibility of such damage.
 */

/*
 * This file is part of CT-MOLE.
 *
 * CT-MOLE is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';
angular.module('core').controller('HomeController', ['$scope', '$location', '$rootScope', 'Authentication', 'Trials', 'Mappings', 'Alterations', 'Cancertypes',
    function ($scope, $location, $rootScope, Authentication, Trials, Mappings, Alterations, Cancertypes) {

        // This provides Authentication context.
        $scope.authentication = Authentication;
        $scope.loading = false;
        $scope.showResult = false;
        $scope.showRefine = false;
        $scope.allCountries = true;
        $scope.firstSearch = true;
        $scope.refineFlag = false;
        $scope.dashBoard = true;
        $scope.loadingTumorData = true;
        $scope.loadingGeneData = true;
        $scope.loadingStatusData = true;
        $scope.loadingCurationStatusData = true;

        $scope.mutations = [];
        $scope.countryCriteria = ['United States'];
        $scope.criteria = [{type: 'country', value: ['United States']}];
        $scope.types = ['country'];
        $scope.geneCriteria = [];
        $scope.mutationCriteria = [];
        $scope.trialsNctIds = [];
        $scope.comTrialIds = [];
        $scope.inComTrialIds = [];
        $scope.status = 4;
        $scope.recruit = '';
        $scope.recruitingStatus = ['Not yet recruiting', 'Recruiting', 'Enrolling by invitation', 'Active, not recruiting', 'Completed', 'Others'];
        var allGenes = [];
        var continueFlag = true;

        function endSearch() {
            $scope.loading = false;
            $scope.showResult = true;
            $scope.showRefine = true;

        }

        function compare(a, b) {
            if (a.gene < b.gene)
                return -1;
            if (a.gene > b.gene)
                return 1;
            return 0;
        }

        //search in the mapping table
        function searchMappingByStatus() {

            Mappings.searchByStatus.query({
                    status: '3'
                },
                function (data) {
                    if (data.length > 0) {
                        var tempcomTrialIds = [];
                        for (var i = 0; i < data.length; i++) {
                            tempcomTrialIds.push(data[i].nctId);
                        }
                        $scope.comTrialIds = tempcomTrialIds;
                    }
                    else {
                        console.log('No hits in the mapping table');
                    }
                }
            );


            Mappings.searchByStatus.query({
                    status: '2'
                },
                function (data) {
                    if (data.length > 0) {
                        var tempcomTrialIds = [];
                        for (var i = 0; i < data.length; i++) {
                            tempcomTrialIds.push(data[i].nctId);
                        }
                        $scope.inComTrialIds = tempcomTrialIds;
                    }
                },
                function (error) {
                    console.log('No hits in the mapping table');
                }
            );
        }

        function fetchAltInfo(trials, index){

            var alteration_id = [];
            var trialAlterations = [];

            Mappings.mappingSearch.get({
                    Idvalue: trials[index].nctId,
                },
                function (a) {
                    continueFlag = true;

                    if(a.nctId !== undefined)
                    {
                        if (a.alteration.length > 0) {


                            for (var i = 0; i < a.alteration.length; i++) {
                                alteration_id.push(a.alteration[i].alteration_Id);
                            }
                            Alterations.alterationByIds.query({Ids: alteration_id},
                                function(res){
                                    _.each(res, function(item){
                                        var index = _.map(a.alteration, function(e){return e.alteration_Id;}).indexOf(item._id);
                                        trialAlterations.push({alteration_Id: a.alteration[index].alteration_Id, gene: item.gene, alteration: item.alteration, status: a.alteration[index].status, confirmStatus: a.alteration[index].confirmStatus});
                                    });

                                }
                            );
                        }


                        if (a.predictedGenes.length > 0) {

                            _.each(a.predictedGenes, function(item){
                                if(item.confirmStatus !== 'confirmed')
                                {
                                    trialAlterations.push({gene: item.gene, alteration: 'unspecified', status: 'predicted', confirmStatus: item.confirmStatus});
                                }
                            });
                        }

                        if(trialAlterations.length === 0) {
                            console.log('no alteration information for this trial ID');
                        }

                    }
                    else
                    {
                        trialAlterations = [];
                        console.log('There is no mapping record existed for this trial.');
                    }
                    trials[index].fetchedAlterations =  trialAlterations;
                    if(index < trials.length-1)
                    {
                        index++;
                        fetchAltInfo(trials, index);
                    }


                },
                function (b) {
                    trialAlterations = [];
                    console.log('no alteration information for this trial ID');

                    trials[index].fetchedAlterations =  trialAlterations;
                    if(index < trials.length-1)
                    {
                        index++;
                        fetchAltInfo(trials, index);
                    }
                });


        }

        $scope.search = function (searchStr) {
            var searchKeyword = $scope.searchKeyword;
            if (searchKeyword === undefined) {
                bootbox.alert('please input keyword to start search!');
                return false;
            }

            $scope.loading = true;
            $scope.showResult = false;
            $scope.showRefine = false;


            $scope.countries = [];
            $scope.genes = [];
            $scope.mutations = [];
            $scope.mutationIDs = [];
            $scope.tumorTypes = [];
            $scope.country = ['United States'];



            //search in the trial table
            Trials.searchEngine.query({searchEngineKeyword: searchKeyword}, function (data) {
                    var trials = data.slice(0, data.length - 1);

                    if (trials.length === 0) {
                        bootbox.alert('Sorry no result found! Please change your input to restart search');
                        $scope.searchKeyword = '';
                        $scope.loading = false;
                        return false;
                    }
                    else {
                        var tempIndex = 0;

                        for (var i = 0; i < trials.length; i++) {
                            $scope.countries = $scope.countries.concat(trials[i].countries);
                            $scope.trialsNctIds.push(trials[i].nctId);
                            $scope.tumorTypes = $scope.tumorTypes.concat(trials[i].tumorTypes);

                        }
                        fetchAltInfo(trials, 0);


                        var alterationsFetched = data[data.length - 1];
                        var j = 0;
                        while(alterationsFetched[j] !== undefined) {
                            if (alterationsFetched[j].alterationsFetched.length > 0) {
                                _.each(alterationsFetched[j].alterationsFetched, function (value) {
                                    if ($scope.mutationIDs.indexOf(value._id) === -1) {
                                        $scope.mutationIDs.push(value._id);
                                        $scope.mutations.push({
                                            mutationID: value._id,
                                            gene: value.gene,
                                            alteration: value.alteration,
                                            nctIds: [alterationsFetched[j].nctId]
                                        });
                                    }
                                    else {
                                        _.each($scope.mutations, function (mutation) {
                                            if (mutation.gene === value.gene && mutation.alteration === value.alteration) {
                                                mutation.nctIds.push(alterationsFetched[j].nctId);
                                            }
                                        });
                                    }

                                    tempIndex = allGenes.map(function (e) {
                                        return e.gene;
                                    }).indexOf(value.gene);

                                    if (tempIndex === -1) {
                                        allGenes.push({gene: value.gene, nctIds: [alterationsFetched[j].nctId]});
                                    }
                                    else {
                                        _.each(allGenes, function (item) {
                                            if (item.gene === value.gene) {
                                                item.nctIds.push(alterationsFetched[j].nctId);
                                            }
                                        });
                                    }

                                });

                            }
                            j++;
                        }
                        $scope.genes = allGenes.map(function(e){return e.gene;});
                        $scope.genes.sort();


                        $scope.tumorTypes = _.uniq($scope.tumorTypes);
                        $scope.tumorTypes.sort();

                        $scope.countries = _.uniq($scope.countries);
                        $scope.countries.sort();

                        $scope.mutations.sort(compare);
                        searchMappingByStatus();
                        $scope.trials = trials;

                        endSearch();

                        $scope.previousSearch = $scope.searchKeyword;
                        $location.search('query', $scope.searchKeyword);
                        if ($scope.refineFlag) {
                            refine();
                        }
                        else {
                            $location.search('status', '4');
                            $location.search('country', 'United States');

                        }

                    }


                },
                function (error) {
                    bootbox.alert('Oops Error occurred to search engine, please try again!');
                    console.log('search trial error happened');
                    endSearch();
                }
            );


        };

        function refine() {
            var location = $location.search();
            var tempCriteria = [];
            var tempTypes = [];


            $scope.chosenGenes = [];
            $scope.chosenMutations = [];
            $scope.chosenRecruits = [];
            $scope.tumor = [];
            $scope.status = 4;
            for (var property in location) {
                if (property !== 'query') {
                    if (property === 'status') {
                        $scope.status = location[property];
                    }


                    if (Array.isArray(location[property])) {
                        if (property === 'mutation') {
                            var temAlteration = [];
                            _.each($scope.mutations, function (alterationItem) {
                                if (location[property].indexOf(alterationItem.mutationID) !== -1) {
                                    temAlteration.push(alterationItem);
                                }
                            });
                            tempCriteria.push({type: property, value: temAlteration});
                        }
                        else {
                            tempCriteria.push({type: property, value: location[property]});
                        }

                        if (property === 'tumor') {
                            $scope.tumor = location[property];
                        }
                        else if (property === 'gene') {
                            $scope.chosenGenes = location[property];
                        }
                        else if (property === 'mutation') {
                            $scope.chosenMutations = location[property];
                        }
                        else if (property === 'country') {
                            $scope.country = location[property];
                        }
                        else if (property === 'recruit') {
                            $scope.chosenRecruits = location[property];
                        }

                    }
                    else {
                        if (property === 'mutation') {
                            var temAlteration = [];
                            _.each($scope.mutations, function (alterationItem) {
                                if (location[property] === alterationItem.mutationID) {
                                    temAlteration.push(alterationItem);
                                }
                            });
                            tempCriteria.push({type: property, value: temAlteration});
                        }
                        else {
                            tempCriteria.push({type: property, value: [location[property]]});
                        }

                        if (property === 'tumor') {
                            $scope.tumor = [location[property]];
                        }
                        else if (property === 'gene') {
                            $scope.chosenGenes = [location[property]];
                        }
                        else if (property === 'mutation') {
                            $scope.chosenMutations = [location[property]];
                        }
                        else if (property === 'country') {
                            $scope.country = [location[property]];
                        }
                        else if (property === 'recruit') {
                            $scope.chosenRecruits = [location[property]];
                        }

                    }

                    tempTypes.push(property);


                }
            }
            $scope.criteria = tempCriteria;
            $scope.types = tempTypes;
        }

        $scope.find = function () {
            $scope.refineFlag = false;
            $scope.criteria = [{type: 'country', value: ['United States']}];
            $scope.types = ['country'];

            var location = $location.search();
            if (location.query !== undefined) {
                console.log('here go to search');
                $scope.searchKeyword = location.query;
                $scope.refineFlag = true;
                $scope.search();

            }

        };

        $rootScope.$on('$locationChangeSuccess', function (event) {
            var location = $location.search();
            if (location.query !== undefined) {
                if ($scope.previousSearch !== location.query) {
                    $scope.searchKeyword = location.query;
                    $scope.search();
                }
                refine();
            }
            else {
                $scope.showResult = false;
                $scope.showRefine = false;
                $scope.searchKeyword = '';
            }

        });

        $scope.searchCriteria = function () {

            return function (trial) {
                //console.log('here is the criteria2 ', $scope.criteria);

                var tempStr = JSON.stringify(trial);
                var finalFlag = true;
                var flags = [];

                var types = $scope.types;
                for (var i = 0; i < types.length; i++) {
                    flags.push({type: types[i], value: false});
                }
                _.each($scope.criteria, function (criterion) {
                    var index = $scope.criteria.map(function (e) {
                        return e.type;
                    }).indexOf(criterion.type);

                    if (criterion.type === 'status') {
                        var tempVal = criterion.value[0];
                        if (tempVal === '1') {
                            if ($scope.comTrialIds.indexOf(trial.nctId) === -1 && $scope.inComTrialIds.indexOf(trial.nctId) === -1) {
                                flags[index].value = true;
                            }
                            else {
                                flags[index].value = false;
                            }
                        }
                        else if (tempVal === '2') {
                            if ($scope.inComTrialIds.indexOf(trial.nctId) !== -1) {
                                flags[index].value = true;
                            }
                            else {
                                flags[index].value = false;
                            }
                        }
                        else if (tempVal === '3') {
                            if ($scope.comTrialIds.indexOf(trial.nctId) !== -1) {
                                flags[index].value = true;
                            }
                            else {
                                flags[index].value = false;
                            }
                        }
                        else if (tempVal === '4') {
                            flags[index].value = true;
                        }
                    }
                    else if (criterion.type === 'mutation') {

                        var mutationNctIds = [];
                        _.each(criterion.value, function (item) {
                            mutationNctIds = mutationNctIds.concat(item.nctIds);
                        });
                        if (mutationNctIds.indexOf(trial.nctId) !== -1) {
                            flags[index].value = true;
                        }
                        else {
                            flags[index].value = false;
                        }
                    }
                    else if (criterion.type === 'gene') {

                        var mutationNctIds = [];
                        _.each(criterion.value, function (item) {
                            _.each(allGenes, function(item1){
                                if(item1.gene === item)
                                {
                                    mutationNctIds = mutationNctIds.concat(item1.nctIds);
                                }
                            });
                        });
                        if (mutationNctIds.indexOf(trial.nctId) !== -1) {
                            flags[index].value = true;
                        }
                        else {
                            flags[index].value = false;
                        }
                    }
                    else {

                        var searchStr = '';
                        for (var i = 0; i < criterion.value.length - 1; i++) {
                            searchStr += criterion.value[i] + '|';
                        }
                        searchStr += criterion.value[criterion.value.length - 1];
                        var patt = new RegExp(searchStr);
                        if (tempStr.match(patt)) {
                            flags[index].value = true;
                        }
                    }

                });

                for (var i = 0; i < flags.length; i++) {
                    finalFlag = finalFlag && flags[i].value;
                }
                return finalFlag;
            };
        };


        $scope.getCriteria = function (checked, value, type) {


            var index = $scope.criteria.map(function (e) {
                return e.type;
            }).indexOf(type);

            if (type === 'status' || type === 'tumor' || type === 'country') {


                if (value.length === 0) {
                    $scope.types = _.without($scope.types, type);
                    $scope.criteria.splice(index, 1);
                }
                else {
                    if ($scope.types.indexOf(type) !== -1) {
                        _.each($scope.criteria, function (criterion) {
                            if (criterion.type === type) {
                                criterion.value = value;
                            }
                        });
                    }
                    else {
                        $scope.criteria.push({type: type, value: value});
                        $scope.types.push(type);
                    }
                }

            }
            else {
                if (checked) {
                    if ($scope.types.indexOf(type) === -1) {
                        if (type === 'recruit' && value === 'Others')
                        {
                            $scope.criteria.push({type: type, value: ['Suspended', 'Terminated', 'Withdrawn']});
                            $scope.types.push(type);
                        }
                        else
                        {
                            $scope.criteria.push({type: type, value: [value]});
                            $scope.types.push(type);
                        }

                    }
                    else {
                        if (type === 'recruit' && value === 'Others')
                        {
                            $scope.criteria[index].value.push('Suspended');
                            $scope.criteria[index].value.push('Terminated');
                            $scope.criteria[index].value.push('Withdrawn');
                        }
                        else
                        {
                            $scope.criteria[index].value.push(value);
                        }


                    }


                }
                else {
                    if ($scope.criteria[index].value.length > 1) {
                        if (type === 'recruit' && value === 'Others')
                        {
                            $scope.criteria[index].value = _.without($scope.criteria[index].value, 'Suspended');
                            $scope.criteria[index].value = _.without($scope.criteria[index].value, 'Terminated');
                            $scope.criteria[index].value = _.without($scope.criteria[index].value, 'Withdrawn');

                        }
                        else
                        {
                            $scope.criteria[index].value = _.without($scope.criteria[index].value, value);
                        }
                    }
                    else {
                        $scope.criteria.splice(index, 1);
                        $scope.types = _.without($scope.types, type);
                    }

                }
            }
            var currParams = $location.search();

            for (var paramName in currParams) {
                if (paramName !== 'query') {
                    $location.search(paramName, null);
                }

            }
            _.each($scope.criteria, function (criterion) {
                if (criterion.type === 'mutation') {
                    var tempArr = criterion.value.map(function (e) {
                        //return e.gene + '+' + e.alteration;
                        return e.mutationID;
                    });
                    $location.search(criterion.type, tempArr);

                }
                else {
                    $location.search(criterion.type, criterion.value);
                }


            });
            //criteria array is fine till here
            console.log('here is the criteria1 ', $scope.criteria);
        };

        function plottyChart(){
            //get the gene and trials infor

            Mappings.geneTrialCounts.get({},function(result){
            $scope.loadingGeneData = false;
            var geneTrace1 = {
                x: _.map(result, function(item){return item.gene;}), //['BRAF', 'KIT', 'KRAS', 'ALK', 'MET', 'EGFR', 'PTEN'],
                y: _.map(result, function(item){return item.predicted;}),//[20, 14, 23, 34, 12, 23, 98],
                name: 'Predicted',
                type: 'bar'
            };

            var geneTrace2 = {
                x: _.map(result, function(item){return item.gene;}),//['BRAF', 'KIT', 'KRAS', 'ALK', 'MET', 'EGFR', 'PTEN'],
                y: _.map(result, function(item){return item.curated;}),//[12, 18, 29, 2, 4, 10, 9],
                name: 'Curated',
                type: 'bar'
            };
            var geneLayout = {barmode: 'stack',
            width:2000,
            height: 400};
            var geneData = [geneTrace1, geneTrace2];

                Plotly.newPlot('geneTrails', geneData, geneLayout);


            });


            Cancertypes.tumorTypes.get({},function(result){
                console.log('here is the result ', result.length);
                $scope.loadingTumorData = false;
                var tumorType = {
                    x: _.map(result, function(item){return item.cancer;}),
                    y: _.map(result, function(item){return item.counts;}),
                    type: 'bar'
                };

                var tumorLayout = {barmode: 'stack',
                    width:2000,
                    height: 400};


                var tumorTypeData = [tumorType];
                Plotly.newPlot('tumorTypeTrials', tumorTypeData, tumorLayout);
            });

            Trials.recruitingStatusCount.get({},function(result){
                $scope.loadingStatusData = false;
                var layout = {barmode: 'stack'};

                var stateData = {
                    labels: ['Not yet recruiting', 'Recruiting', 'Enrolling by invitation', 'Active, not recruiting', 'Completed', 'Others' ],
                    values: [result.Not_yet_recruiting, result.Recruiting, result.Enrolling_by_invitation, result.Active_not_recruiting, result.Completed, result.Others],
                    type: 'pie'
                };

                var stateTumorData = [stateData];

                Plotly.newPlot('USTrials', stateTumorData, layout);
            });

            Mappings.curationStatusCounts.get({},function(result){

                $scope.loadingCurationStatusData = false;
                var layout = {barmode: 'stack'};

                var curationStatusData = {
                    labels: ['Not Curated', 'In Progress', 'Completed'],
                    values: result,
                    type: 'pie'
                };

                var curationData = [curationStatusData];

                Plotly.newPlot('curationStatus', curationData, layout);
            });


        };
        plottyChart();

    }
]);
