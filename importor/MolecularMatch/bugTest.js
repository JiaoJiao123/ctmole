/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var request = require('request');
var mongoose = require('mongoose');
var _ = require('underscore');
var fs = require('fs');
var Mapping = require('../../app/models/mapping.server.model.js');
var MMTrial = require('../../app/models/mmtrial.server.model.js');

function main() {
    mongoose.connect('mongodb://localhost/firstDB');
    mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
    mongoose.connection.once('open', function () {
        console.log('Done connecting and begin to fetch trials info...');
        var tumorTypes = [], index = 0, finalString = "";
//        MMTrial.find({}, {id: 1, tags: 1}).stream()
//                .on('data', function (mmtrial) {
//                    _.each(mmtrial.tags, function (item) {
//                        if (item.facet === "CONDITION") {
//                            tumorTypes.push(item.term);
//                        }
//                    });
//                    if (index++ % 500 === 0)
//                        console.log('working......');
//                })
//                .on('error', function (error) {
//
//                })
//                .on('end', function () {
//                    tumorTypes = _.uniq(tumorTypes);
//                    finalString = tumorTypes.join("\n");
//                    fs.writeFile("./MMTumorTypes.txt", finalString, function (err) {
//                        if (err) {
//                            console.log(err);
//                        } else {
//                            console.log("The file was saved!");
//                             
//                        }
//                    });
//                     
//                });

        Mapping.find({}).stream()
                .on('data', function(mapping){
                    _.each(mapping.alterations, function(item){
                        if(item.gene === ""){
                            console.log('empty gene ', item.alteration, mapping.nctId);
                        }
                    });
                })
                .on('error', function(error){
                    
                })
                .on('end', function(){
                    console.log('this is the end ');
                })
    });
}

main();