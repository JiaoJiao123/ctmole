/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var request = require('request');
var mongoose = require('mongoose');
var _ = require('underscore');
var MMTrial = require('../../app/models/mmtrial.server.model.js');
var Mapping = require('../../app/models/mapping.server.model.js');
var Trial = require('../../app/models/trial.server.model.js');
var Gene = require('../../app/models/gene.server.model.js');
var Alteration = require('../../app/models/alteration.server.model.js');
var fs = require('fs');
var mappings = [], gene, alteration, uniqueNctIds = [], mappingIndex = 0, geneIndex = 0, alterationIndex = 0, firstSpace = -1, firstDash = -1, failedTrials = [], mmGenes = [], mmAlterations = [], fusionFlag = false, duplicateFlag = false, duplicateFlag1 = false, duplicateFlag2 = false;
var parseString = require('xml2js').parseString;
function main() {
    mongoose.connect('mongodb://localhost/firstDB');
    mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
    mongoose.connection.once('open', function () {
        console.log('Done connecting and begin to fetch trials info...');
        //get the gene list
        fs.readFile('./cbioGenes.txt', 'utf8', function (err, data) {
            if (err) {
                return console.log(err);
            } else {
                fetchMappingInfo(data);
            }

        });


    });
}
function fetchMappingInfo(cbioGeneString) {
    MMTrial.find({status: {$in: ["Active, not recruiting", "Approved", "Approved for marketing", "Recruiting", "Not yet recruiting", "Available", "Enrolling by invitation", "Open", "Enrolling"]}}, {id: 1, tags: 1}).exec(function (err, trials) {
        if (err) {
            console.log('error message ', err);
        } else {
            _.each(trials, function (item, index) {
                if (index % 1000 === 0)
                    console.log('parsing trial ', index + 1);
                _.each(item.tags, function (tag) {

                    if (tag.facet === "GENE" || tag.facet === "MUTATION") {

                        if (tag.facet === "GENE") {
                            gene = tag.term;
                            alteration = "";
                            mmGenes.push(tag.term);
                        } else if (tag.facet === "MUTATION") {
                            firstSpace = tag.term.indexOf(" ");
                            if (firstSpace === -1) {
                                firstDash = tag.term.indexOf("-");
                                if (firstDash === -1) {
                                    gene = '';
                                    alteration = tag.term;
                                } else {
                                    fusionFlag = true;
                                    gene = [tag.term.substring(0, firstDash), tag.term.substring(firstDash + 1)];
                                    alteration = tag.term;
                                }
                            } else {
                                if (cbioGeneString.indexOf(tag.term.substring(0, firstSpace) + " ") === -1) {
                                    gene = '';
                                    alteration = tag.term;
                                } else {
                                    gene = tag.term.substring(0, firstSpace);
                                    alteration = tag.term.substring(firstSpace + 1);
                                }
                            }

                            for (var i = 0; i < mmAlterations.length; i++) {
                                if (!fusionFlag) {
                                    if (mmAlterations[i].gene === gene && mmAlterations[i].alteration === alteration) {
                                        duplicateFlag = true;
                                        break;
                                    }
                                } else {
                                    if (mmAlterations[i].gene === gene[0] && mmAlterations[i].alteration === alteration) {
                                        duplicateFlag1 = true;
                                    }
                                    if (mmAlterations[i].gene === gene[1] && mmAlterations[i].alteration === alteration) {
                                        duplicateFlag2 = true;
                                    }
                                    if (duplicateFlag1 && duplicateFlag2)
                                        break;
                                }

                            }
                            if (gene !== "") {
                                if (fusionFlag) {
                                    mmGenes.push(gene[0]);
                                    mmGenes.push(gene[1]);
                                } else {
                                    mmGenes.push(gene);
                                }

                            }
                            if (fusionFlag) {
                                if (!duplicateFlag1)
                                    mmAlterations.push({gene: gene[0], alteration: alteration});
                                else
                                    duplicateFlag1 = false;

                                if (!duplicateFlag2)
                                    mmAlterations.push({gene: gene[1], alteration: alteration});
                                else
                                    duplicateFlag2 = false;
                            } else {
                                if (!duplicateFlag)
                                    mmAlterations.push({gene: gene, alteration: alteration});
                                else
                                    duplicateFlag = false;
                            }
                        }

                        if (uniqueNctIds.indexOf(item.id) === -1) {
                            uniqueNctIds.push(item.id);
                            if (fusionFlag) {
                                mappings.push({nctId: item.id, alterations: [{gene: gene[0], alteration: alteration, "curationMethod": "predicted", "type": "inclusion", "status": "unconfirmed"},
                                        {gene: gene[1], alteration: alteration, "curationMethod": "predicted", "type": "inclusion", "status": "unconfirmed"}]});
                                fusionFlag = false;
                            } else {
                                mappings.push({nctId: item.id, alterations: [{gene: gene, alteration: alteration, "curationMethod": "predicted", "type": "inclusion", "status": "unconfirmed"}]});
                            }

                        } else {
                            if (fusionFlag) {
                                mappings[uniqueNctIds.indexOf(item.id)].alterations.push({gene: gene[0], alteration: alteration, "curationMethod": "predicted", "type": "inclusion", "status": "unconfirmed"});
                                mappings[uniqueNctIds.indexOf(item.id)].alterations.push({gene: gene[1], alteration: alteration, "curationMethod": "predicted", "type": "inclusion", "status": "unconfirmed"});
                                fusionFlag = false;
                            } else {
                                mappings[uniqueNctIds.indexOf(item.id)].alterations.push({gene: gene, alteration: alteration, "curationMethod": "predicted", "type": "inclusion", "status": "unconfirmed"});
                            }

                        }

                    }

                });

            });
            console.log('Done getting mapping table, begin to save...');
            saveMappingToDB();
        }
    });
}

function saveMappingToDB() {
    //need to remove some items, for instance ,if braf v600e exist, there is no need to save braf 
    var genesWithAlterations = [], genesWithoutAlterations = [], finalAlterations = mappings[mappingIndex].alterations, genesToRemove = [];
    _.each(mappings[mappingIndex].alterations, function (item) {
        if (item.alteration !== '')
            genesWithAlterations.push(item.gene);
        else
            genesWithoutAlterations.push(item.gene);
    });
    genesToRemove = _.intersection(genesWithAlterations, genesWithoutAlterations);
    if (genesToRemove.length > 0) {
        finalAlterations = [];
        _.each(mappings[mappingIndex].alterations, function (item) {
            if (genesToRemove.indexOf(item.gene) === -1 || item.alteration !== '')
                finalAlterations.push(item);
        });
    }

    var mapping = new Mapping({"nctId": mappings[mappingIndex].nctId, "alterations": finalAlterations, completeStatus: "1", log: [], comments: [], oncoTreeTumors: []});

    mapping.save(function (err) {
        if (err) {
            console.log('error occured ', err);
        }
        if (mappingIndex % 1000 === 0)
            console.log('saving mapping, index ', mappingIndex);

        if (mappingIndex < mappings.length - 1) {
            mappingIndex++;
            saveMappingToDB();
        } else {
            console.log('Done saving mapping table. Begin to save gene...');
            mmGenes = _.uniq(mmGenes);
            console.log('Total genes length are ', mmGenes.length);
            saveGeneToDB();
//            console.log('Done saving mappings.');
        }

    });

}
function saveGeneToDB() {
    var gene = new Gene({"hugo_symbol": mmGenes[geneIndex]});
    gene.save(function (err) {
        if (err) {
            console.log('error occured ', err);
        }
        if (geneIndex % 1000 === 0)
            console.log('saving gene, index ', geneIndex);

        if (geneIndex < mmGenes.length - 1) {
            geneIndex++;
            saveGeneToDB();
        } else {
            console.log('Done saving gene table. Begin to save alteration...');
            console.log('Total alterations length is ', mmAlterations.length);
            saveAlterationToDB();
        }

    });

}
function saveAlterationToDB() {
    if (mmAlterations[alterationIndex].alteration !== "") {
        var alteration = new Alteration({gene: mmAlterations[alterationIndex].gene, alteration: mmAlterations[alterationIndex].alteration});
        alteration.save(function (err) {
            if (err) {
                console.log('error occured ', err);
            }
            if (alterationIndex % 1000 === 0)
                console.log('saving alteration, index ', alterationIndex);

            if (alterationIndex < mmAlterations.length - 1) {
                alterationIndex++;
                saveAlterationToDB();
            } else {
                console.log('Done saving to alteration table, need to check if exist in trials table');
                findUniqueNctIdsInMapping();
            }

        });
    } else {
        if (alterationIndex < mmAlterations.length - 1) {
            alterationIndex++;
            saveAlterationToDB();
        } else {
            console.log('Done saving to alteration table, need to check if exist in trials table');
            findUniqueNctIdsInMapping();
        }
    }


}

function findUniqueNctIdsInMapping() {
    var uniqueMappingNctIds = [];
    Mapping.find({}).exec(function (error, data) {
        uniqueMappingNctIds = _.map(data, function (item) {
            return item.nctId;
        });
        var difference = [], tempArr = [];
        Trial.find({nctId: {$in: uniqueMappingNctIds}}).exec(function (error, trials) {
            tempArr = _.map(trials, function (item) {
                return item.nctId;
            });
            difference = _.difference(uniqueMappingNctIds, tempArr);
            console.log('There are ', difference.length, ' new trials need to be saved');
            if (difference.length > 0)
                saveTrials(difference, 0);
        });

    });
}

function saveTrials(nctIds, index) {
    var url = 'http://clinicaltrials.gov/ct2/show/' + nctIds[index] + '?displayxml=true';
    request(url, function (error, response, body) {
        parseString(body, {trim: true, attrkey: '__attrkey', charkey: '__charkey'}, function (err, metadata) {
            if (metadata !== undefined && metadata.hasOwnProperty('clinical_study')) {
                metadata = metadata.clinical_study;
                var drugsNeeded = [];
                if (metadata.intervention !== undefined)
                {
                    _.each(metadata.intervention, function (item) {
                        drugsNeeded.push(item.intervention_name);
                    });
                }


                var trialRecord = new Trial({nctId: nctIds[index],
                    title: (metadata.brief_title !== undefined) ? metadata.brief_title[0] : "",
                    purpose: (metadata.brief_summary !== undefined) ? metadata.brief_summary[0].textblock[0] : "",
                    recruitingStatus: (metadata.overall_status !== undefined) ? metadata.overall_status[0] : "",
                    eligibilityCriteria: (metadata.eligibility !== undefined && metadata.eligibility[0].criteria !== undefined) ? metadata.eligibility[0].criteria[0].textblock[0] : "",
                    phase: (metadata.phase !== undefined) ? metadata.phase[0] : "",
                    diseaseCondition: (metadata.condition_browse !== undefined) ? metadata.condition_browse[0].mesh_term : "",
                    lastChangedDate: (metadata.lastchanged_date !== undefined) ? metadata.lastchanged_date[0] : "",
                    countries: (metadata.location_countries !== undefined) ? metadata.location_countries[0].country : "",
                    drugs: drugsNeeded,
                    arm_group: (metadata.arm_group !== undefined) ? metadata.arm_group : ""});


                trialRecord.save(function (err) {
                    if (err)
                        console.log('Error happened when saving to db', err);
                    else {
                        console.log('Insert', nctIds[index], ' into trial collection successfully');

                        if (index < nctIds.length - 1) {
                            index++;
                            setTimeout(function () {
                                saveTrials(nctIds, index);
                            }, 500);
                        } else {
                            console.log('Done saving new trials');
                        }

                    }
                });

            } else {
                failedTrials.push(nctIds[index]);
                console.log(nctIds[index], 'does not have clinical study attribute.');
                if (index < nctIds.length - 1) {
                    index++;
                    setTimeout(function () {
                        saveTrials(nctIds, index);
                    }, 1000);
                } else {
                    console.log('Done saving new trials');
                    console.log('failed trials ', failedTrials);
                }
            }


        });
    });
}

main();