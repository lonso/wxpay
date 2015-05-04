wxPay
-------------------

weixin pay by nodejs for V3.7


```javascript
 var appInfo = {
    	appid: 'xx',
    	mch_id: 'xx',
    	paternerKey: 'xx',
    	notify_url: 'http://www.baidu.com'
    };
    var wxPay = new WxPay(appInfo);
    var orderNo = '1234567890';
    var total_fee = 100;
    var ip = '8.8.8.8';
    wxPay.pushTrade(orderNo, total_fee, 'test', ip).then(function (data) {
        ..do something
    })
```