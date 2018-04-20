const express = require('express');
const router = express.Router();
const lele = require( '../tools/lele');
const world = require( '../tools/common');
const runDao = require( '../dao/proDao.js')
const roleDao = require( '../dao/roleDao.js');
// const request = require( 'sync-request' );
const request = require('request');

module.exports = router;

/*
	1.用户的登陆
	code : '用户登录id'
	body { session_key: '0kRWw2yMpvkAzp4VUhDKJA==',
			expires_in: 7200,
			openid: 'oPOHs0ITX_ic83AQWevOfljdebBM'
		}
 */
router.all( '/login', async function( req, res )
{
	try{
		var data = lele.empty( req.body ) ? req.query : req.body;
		if( lele.empty( data.code ) || data.code == 'undefined' )
		{
			throw( '登陆参数code错误' );
		}
		var code = data.code;
		var option = {
			uri: 'https://api.weixin.qq.com/sns/jscode2session',
			json: true,
			qs: {
			  	grant_type: 'authorization_code',
			  	appid: 'wx92d2c3e614d29eb2',
			  	secret: '4a1c1b731305efc9badb13d68764e312',
			  	js_code: code
			}
		};
		request.get( option, async function( error, response, body )
		{
			try{
				if( error ) throw( '服务器异常' );
				if( body.errcode  ) throw( '登录失败' );
				const openid = body.openid;
				const user = await runDao.select( 'user', 'openid="' + openid + '"' );
				if( user.length == 0 ){
					var options = {
						openid : openid,
						register_time : lele.getTime(),
						nickName : data.nickName,
						avatarUrl : data.avatarUrl,
						city : data.city,
						country : data.country,
						gender : data.gender,
						language : data.language,
						province : data.province
					};
					runDao.insert( 'user', options );
				}
				var newToken = world.createToken({ 'openid' : openid });
				res.json({ code : 200, result : { token : newToken } });
			}
			catch( error ){
				console.log("error11-->" + error.toString() );
				res.json({ error : error ? error.toString() : '服务器异常'});
			}
		});
	}
	catch( error ){
		console.log("error222-->" + error.toString() );
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});



/**
 * 2.我的卡包
 *  type 1：未使用 2 已使用 3已过期
 *  openid  : 玩家id
 */
router.all( '/myCoupon', async function( req, res ) {
	try{
		var data = lele.empty( req.body ) ? req.query : req.body;
		var type = data.type || 1;
		var openid = req.user.openid;
		var whereSql = 'openid="' + openid + '"';
		switch( lele.intval( type ) ) {
			case 1:
			case 3:
				whereSql += ' and use_time=0';
			break;
			case 2:
				whereSql += ' and use_time>0';
			break;
			default :
				throw( '传递的type类型不存在' );
		}
		var couponList = await runDao.select( 'user_coupon', whereSql );
		var ch_CouponJson = roleDao.getChCache( 'ch_CouponJson' );
		var cardCoupons = [];
		couponList.forEach( function( sigData, index ){
			if( !lele.empty( ch_CouponJson[ sigData.coupon_id ]) ){
				let sigCoupon = ch_CouponJson[ sigData.coupon_id ];
				//已经过期的产品
				if( type == 3 && sigCoupon.end_time < lele.getTime() )
				{
					cardCoupons.push({
						coupon_id : sigCoupon.coupon_id,
						id : sigData.id,
						name : sigCoupon.name,
						icon_img : sigCoupon.icon_img,
						price : sigCoupon.price,
						end_time : sigCoupon.end_time,
						condition : sigCoupon.condition
					});
				}
				if( type == 1 || type == 2 ) {
					cardCoupons.push({
						coupon_id : sigCoupon.coupon_id,
						id : sigData.id,
						name : sigCoupon.name,
						icon_img : sigCoupon.icon_img,
						price : sigCoupon.price,
						end_time : sigCoupon.end_time,
						condition : sigCoupon.condition
					});
				}
			}
		});
		res.json( { code : 200, result : cardCoupons } );
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});

/**
 * 3.领取优惠券
 *  coupon_id : 优惠券的id
 *  openid : 用户id ( 需要修改 )
 */
router.all( '/received', async function( req, res ) {
	try{
		var data = lele.empty( req.body ) ? req.query : req.body;
		var coupon_id = data.coupon_id;
		var openid = req.user.openid;
		var couponInfo = roleDao.getCouponInfo( 1, coupon_id );
		if( lele.empty( coupon_id ) || lele.empty( couponInfo ) ) {
			throw( '优惠券参数不对' );
		}
		if( couponInfo.end_time < lele.getTime ) {
			throw( '优惠券已经过期，不能领取' );
		}
		var whereSql = 'coupon_id=' + coupon_id + ' and openid="' + openid + '"';
		var oldCoupon = await runDao.select( 'user_coupon', whereSql, 'id' );
		if( oldCoupon.length != 0 ) {
			throw( '您已经领取了该优惠券了' );
		}
		var userData = await runDao.select( 'user', 'openid="' + openid + '"', 'nickName' );
		//要生存一个使用二维码 todo
		var insertData = {
			openid : openid,
			coupon_id : coupon_id,
			use_time : 0,
			get_time : lele.getTime(),
			qr_code : 'https://qr.api.cli.im/qr?data=1&level=H&transparent=false&bgcolor=%23ffffff&forecolor=%23000000&blockpixel=12&marginblock=1&logourl=&size=280&kid=cliim&key=de32a4c489f3b70d8e9cc43ca476e2c8',
			dis_code : lele.randomString( 8, 1 ),
			tel : 12345678922,
			nickName : userData[0].nickName
		};
		var insertInfo = await runDao.insert( 'user_coupon', insertData );
		insertData.id = insertInfo.insertId;
		res.json( { code : 200, couponInfo : insertData });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});

/**
 * 5.我的关注
 * openid : 用户id
 */
router.all( '/myFollow', async function( req, res ) {
	try{
		var data = lele.empty( req.body ) ? req.query : req.body;
		var openid = req.user.openid;
		var followList = await runDao.select( 'user_follow','openid="' + openid + '"' );
		if( followList.length == 0 ) {
			res.json( { code : 200, result : [] });
			return;
		}
		var ch_BrandJson = roleDao.getChCache( 'ch_BrandJson' );
		var newArr = [];
		for( let i = 0 ; i < followList.length; i++ ) {
			if( !lele.empty( ch_BrandJson[ followList[ i ].brand_id ] ) ) {
				followList[ i ].brandInfo = ch_BrandJson[ followList[ i ].brand_id ];
				newArr.push( followList[ i ] );
			}
		}
		res.json( { code : 200, result : newArr });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});

/*
	6.添加关注 type 1 : 添加关注 2 取消关注
 */
router.all( '/addCancelFollow', async function( req, res ){
	try{
		let data = lele.empty( req.body ) ? req.query : req.body;
		let type = data.type || 1;
		let openid = req.user.openid;
		let brand_id = data.brand_id;
		let brandInfo = roleDao.getBrandInfo( 2, brand_id );
		if( lele.intval( type ) == 0 || lele.empty( brand_id ) || lele.empty( brandInfo )) {
			throw( '参数错误' );
		}
		if( type == 1 ) {
			let oldFollow = await runDao.select( 'user_follow', 'brand_id=' + brand_id + ' and openid="' + openid + '"', 'id');
			if( oldFollow.length != 0 ){
				throw( '你已经关注了此品牌' );
			}
			let insertData = {
				openid : openid,
				brand_id : brand_id,
				follow_time : lele.getTime()
			};
			let insertInfo = await runDao.insert( 'user_follow', insertData );
			insertData.id = insertInfo.insertId;
			insertData.brandInfo = brandInfo;
		}
		else if( type ==2 ) {
			runDao.delete( 'user_follow', 'brand_id=' + brand_id + ' and openid="' + openid + '"' );
		}
		res.json( { code : 200 });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});

/**
 * 7.我的消息
 */
router.all( '/myMsg', async function( req, res ) {
	try{
		let openid = req.user.openid;
		let time = lele.getTime();
		let ch_msg = roleDao.getChCache( 'ch_msg' );
		let myMsgs = await runDao.select( 'user_msg', 'openid="' + openid + '"' );
		let msgObj = lele.arrToObj( myMsgs, 'msg_id' );
		let msgIds = [];
		for( let i = 0; i < ch_msg.length; i++ ) {
			if( !msgObj[ ch_msg[i].msg_id ] ) {
				msgIds.push( { 
					msg_id : ch_msg[i].msg_id,
					is_read : 0,
					msg_type : 1,
					openid : openid
				} );
			}
		}
		if( msgIds.length != 0 ) {
			await runDao.inserts( 'user_msg', msgIds );
			myMsgs = await runDao.select( 'user_msg', 'openid="' + openid + '"' );
		}
		let msgArr = [];
		ch_msg = lele.arrToObj( ch_msg, 'msg_id' );
		for( let i = 0; i < myMsgs.length; i++ ) {
			msgArr.push({
				'id' : myMsgs[ i ].id,
				'msg_type'  : 1,
				'msg_cont' :  ch_msg[ myMsgs[ i ].msg_id ].msg_cont,
				'msg_icon' :  ch_msg[ myMsgs[ i ].msg_id ].msg_icon,
				'from_user' : '系统消息',
				'is_read' : 0
			});
		}
		res.json({ code : 200, result : msgArr });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});

/*
	8我的界面
 */
router.all( '/my', async function( req, res ) {
	try{
		var openid = req.user.openid;
		var ch_msg = roleDao.getChCache( 'ch_msg' );
		var userMsgs = await runDao.select( 'user_msg', 'openid="' + openid + '"', 'id,msg_id' );
		let isMsgNew = ch_msg.length > userMsgs.length ? true : false;
		for( let i = 0; i < userMsgs.length; i++ ) {
			if( userMsgs[i].is_read == 0 ) {
				isMsgNew = true;
				break;
			}
		}
		var userInfo = await runDao.select( 'user', 'openid="' + openid + '"', 'avatarUrl,nickName');
		var applyShop = await runDao.select( 'log_brand', 'openid="' + openid + '"', 'is_pass,is_first' );
		userInfo[0].isMsgNew = isMsgNew;
		userInfo[0].isShop = applyShop.length == 0 ? 0 : applyShop[0].is_pass;
		userInfo[0].isFisrt = applyShop.length == 0 ? 1 : applyShop[0].is_first;
		if( userInfo[0].isShop == 2 && applyShop[0].is_first ) runDao.update( 'log_brand', { is_first : 0 }, 'openid="' + openid + '"');
		res.json({ code : 200, result : userInfo[0] });
	}
	catch( error ) {
		console.log("error", error );
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});

/*
	9.阅读消息-》消息详情
 */
router.all( '/readMsg', async function( req, res ) {
	try{
		var openid = req.user.openid;
		var data = lele.empty( req.body ) ? req.query : req.body;
		var id = data.id;
		var userMsgs = await runDao.select( 'user_msg', 'openid="' + openid + '"', 'id,msg_id,is_read' );
		if( userMsgs.length == 0 ){
			throw( '此消息不存在 ' );
		}
		if( userMsgs[0].is_read == 0 ){
			runDao.update( 'user_msg', { is_read : 1 }, 'id=' + id );
		}
		res.json({ code : 200 });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});

/*
	10.单个消息
	id : id的信息
 */
router.all( '/msgDetail', async function( req, res ) {
	try{
		var openid = req.user.openid;
		var data = lele.empty( req.body ) ? req.query : req.body;
		var id = lele.intval( data.id  );
		if( id == 0 ) throw('参数错误');

		var userMsgs = await runDao.select( 'user_msg', 'id=' + id, 'id,msg_id,is_read' );
		if( userMsgs.length == 0 ){
			throw( '此消息不存在 ' );
		}
		userMsgs = userMsgs[0];
		var ch_msg = lele.arrToObj( roleDao.getChCache( 'ch_msg' ), 'msg_id' );
		var msgInfo = ch_msg[ userMsgs.msg_id ];
		if( lele.empty( msgInfo ) ) throw( '此消息不存在' );
		var data = {
			'id' : id,
			'msg_type'  : 1,
			'msg_cont' :  msgInfo.msg_cont,
			'msg_icon' :  msgInfo.msg_icon,
			'msg_time' : msgInfo.start_time,
			'from_user' : '系统消息',
			'is_read' : 0
		}
		if( userMsgs.is_read == 0 ){
			runDao.update( 'user_msg', { is_read : 1 }, 'id=' + id );
		}
		res.json({ code : 200, result : data });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});