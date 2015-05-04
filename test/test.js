/**
 * lonso @ 15-3-23_Sun.
 */

var WxPay = require('..');
var should = require('should');

var appInfo = {
	appid: 'xx',
	mch_id: 'xx',
	paternerKey: 'xx',
	notify_url: 'http://www.baidu.com'
};


describe('wxPay server push test', function () {
	var wxPay = new WxPay(appInfo);
	var orderNo = '1234567890';
	var total_fee = 100;
	var ip = '8.8.8.8';
	it.only('good testCase for push trader', function (done) {
		wxPay.pushTrade(orderNo, total_fee, 'test', ip).then(function (data) {
			(!!data).should.be.true
		}).catch(function (err) {
				(!err).should.be.true;
			}).finally(function () {
				done()
			})
	});

});
