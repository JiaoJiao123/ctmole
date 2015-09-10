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

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	errorHandler = require('./errors'),
	Cancertype = mongoose.model('Cancertype'),
	_ = require('lodash');

/**
 * Create a Cancertype
 */
exports.create = function(req, res) {
	var cancertype = new Cancertype(req.body);
	cancertype.user = req.user;

	cancertype.save(function(err) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			res.jsonp(cancertype);
		}
	});
};

/**
 * Show the current Cancertype
 */
exports.read = function(req, res) {
	res.jsonp(req.cancertype);
};
exports.readCancertypes = function(req, res) {
	res.jsonp(req.cancertypes);
};

/**
 * Update a Cancertype
 */
exports.update = function(req, res) {
	var cancertype = req.cancertype ;

	cancertype = _.extend(cancertype , req.body);

	cancertype.save(function(err) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			res.jsonp(cancertype);
		}
	});
};

/**
 * Delete an Cancertype
 */
exports.delete = function(req, res) {
	var cancertype = req.cancertype ;

	cancertype.remove(function(err) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			res.jsonp(cancertype);
		}
	});
};

/**
 * List of Cancertypes
 */
exports.list = function(req, res) { Cancertype.find().sort('-created').populate('user', 'displayName').exec(function(err, cancertypes) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			res.jsonp(cancertypes);
		}
	});
};

/**
 * Cancertype middleware
 */
exports.cancertypeByID = function(req, res, next, cancertypeSymbol) { Cancertype.findOne({'symbol': cancertypeSymbol}).populate('user', 'displayName').exec(function(err, cancertype) {
		if (err) return next(err);
		if (! cancertype) return next(new Error('Failed to load Cancertype ' + id));
		req.cancertype = cancertype ;
		next();
	});
};

exports.cancertypeByNctIds = function(req, res, next, ids) {

	console.log(ids);
	if(!(ids instanceof Array)) {
		ids = [ids];
	}
	Cancertype.find({nctIds: {$in: ids}},{'_id':0,'symbol':1}).populate('user', 'displayName').exec(function(err, cancertypes) {
		if (err) return next(err);
		if (! cancertypes) return next(new Error('Failed to load Cancertype ' + ids));
		req.cancertypes = cancertypes ;
		next();
	});
};



/**
 * Cancertype authorization middleware
 */
exports.hasAuthorization = function(req, res, next) {
	if (req.cancertype.user.id !== req.user.id) {
		return res.status(403).send('User is not authorized');
	}
	next();
};
