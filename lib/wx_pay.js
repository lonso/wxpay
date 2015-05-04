/**
 * lonso @ 15-3-23_Sun.
 */

var Promise = require('bluebird');
var helper = require('../helper');
var urlencode = require('urlencode');
var crypto = require('crypto');
var moment = require('moment');
var utf8 = require('utf8');
var parseString = Promise.promisify(require('xml2js').parseString);
var debug = require('debug')('wxpay');

var URI = {
	UNIFIEDORDER: 'https://api.mch.weixin.qq.com/pay/unifiedorder'
};

var ERRORMSG = {
	ILLEGAL: {
		code: -1,
		statusCode: 401,
		message: '非法请求！'
	},
	FAILURE: {
		code: -1,
		statusCode: 400,
		message: '预下单失败！'
	}
};

module.exports = WxPay;


function WxPay(appInfo) {
	if (!(this instanceof WxPay)) return new WxPay(appInfo);
	if (!appInfo.appid || !appInfo.mch_id || !appInfo.paternerKey || !appInfo.notify_url)
		throw new Error('appid, mch_id, paternerKey not be null');
	this.appid = appInfo.appid;
	this.mch_id = appInfo.mch_id;
	this.paternerKey = appInfo.paternerKey;
	this.notify_url = appInfo.notify_url;
	return this;
}

WxPay.prototype.getTimestamp = function () {
	return moment().format('X');
};


WxPay.prototype.json2xml = function (json) {
	var xml = '<xml>'
	for (var key in json) {
		xml += '\n<' + key + '>' + json[key] + '</' + key + '>'
	}
	xml += '</xml>';
	return xml;
};

WxPay.prototype.sortArgs = function (args, isUrlencode) {
	var _keys = [];
	var signatureVal = [];
	for (var item in args) {
		_keys.push(item);
	}
	_keys.sort();


	for (var key in _keys) {
		var _v = _keys[key] + '=';
		if (isUrlencode) {
			_v += urlencode(args[_keys[key]])
		} else {
			_v += args[_keys[key]]
		}
		signatureVal.push(_v)
	}
	return signatureVal.join('&');
};

WxPay.prototype.md5Sign = function (args, secret_key) {
	var signRaw = this.sortArgs(args);
	var signatureVal = signRaw + '&' + 'key=' + secret_key;
	return helper.cryptoMD5(signatureVal).then(function (data) {
		return Promise.resolve({
			signRaw: signRaw,
			sign: data.toUpperCase()
		});
	})
};


WxPay.prototype.urlencode = function (args) {
	return this.sortArgs(args, true);
};

WxPay.prototype.checkSign = function (args) {
	var responseSign = args.sign;
	delete args.sign;
	return this.md5Sign(args, this.paternerKey).then(function (data) {
		if (data.sign === responseSign)
			return Promise.resolve();
		else
			return Promise.reject(ERRORMSG.ILLEGAL);
	})
};

WxPay.prototype.appResponse = function (response) {
	var appResObj = {
		"appId": response.appid,
		"nonceStr": this.generateNonceStr(),
		"package": "Sign=WXpay",
		"partnerId": this.partnerid,
		"prepayId": response.prepay_id,
		"timeStamp": this.getTimestamp()
	};
	return this.md5Sign(appResObj, this.paternerKey).bind(this).then(function (data) {
		appResObj.sign = data.sign;
		var xml = this.json2xml(appResObj);
		debug('[app response]', xml);
		return Promise.resolve(xml);
	})
};


/**
 * signature check
 */
WxPay.prototype.getResult = function (requestBody, options) {
	return this.md5Sign(requestBody, this.paternerKey).bind(this).then(function (data) {
		debug('[md5sign]', data.sign);
		requestBody.sign = data.sign;
		options.body = this.json2xml(requestBody);
		return helper.requestHelper(options);
	}).then(function (data) {
			return parseString(data, {explicitArray: false, explicitRoot: false})
		}).then(function (data) {
			debug('[wx response]', data);
			this.response = data;
			if (data.return_code === 'SUCCESS') {
				return this.checkSign(data)
			} else
				throw ERRORMSG.FAILURE
		}).then(function () {
			return this.appResponse(this.response);
		}).catch(function (err) {
			return Promise.reject(err);
		});
};


WxPay.prototype.generateNonceStr = function (length) {
	var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var maxPos = chars.length;
	var noceStr = "";
	var i;
	for (i = 0; i < (length || 32); i++) {
		noceStr += chars.charAt(Math.floor(Math.random() * maxPos));
	}
	return noceStr;
};


WxPay.prototype.pushTrade = function (orderNumber, total_fee, body, ip) {
	var options = {
		uri: URI.UNIFIEDORDER,
		method: 'POST'
	};
	var message = {
		appid: this.appid,
		mch_id: this.mch_id,
		body: body,
		nonce_str: this.generateNonceStr(),
		notify_url: this.notify_url,
		spbill_create_ip: ip,
		out_trade_no: orderNumber,
		total_fee: total_fee,
		trade_type: 'APP'
	};

	debug('[pushTrade]', JSON.stringify(message));
	return this.getResult(message, options);
};
