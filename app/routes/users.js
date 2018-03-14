const express = require('express');
const router = express.Router();
const lele = require( '../tools/lele');
const world = require( '../tools/common');
const runDao = require( '../dao/proDao.js')
const roleDao = require( '../dao/roleDao.js')

module.exports = router;

/*
	用户的登陆
	code : '用户登录id'
 */
router.all( '/login', function( req, res ){
	try{
		let data = lele.empty( req.body ) ? req.query : req.body;
		console.log( data );
		if( lele.empty( data.code ) ){
			throw( '登陆参数code错误' );
		}
		let code = data.code;
		let newToken = world.createToken({ 'openid' : '123456lmy' });
		res.json({ code : 200, result : { token : newToken } });
	}
	catch( error ){
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});

/**
 * 2.优惠券的核销( 使用 )
 * openid : 玩家id
 * id : 优惠券id
 */
router.all( '/used', async function( req, res ) {
	try{
		let data = lele.empty( req.body ) ? req.query : req.body;
		let openid = req.user.openid;
		if( lele.empty( openid ) || !data.hasOwnProperty( 'id' ) ) {
			throw( '参数错误，用户id或者优惠券id不存在');
		}
		let id = data.id;
		let where = 'openid="' + openid + '" and id=' + id;
		let couponInfo = await runDao.select( 'user_coupon', where, 'use_time' );
		if( couponInfo.length == 0 || couponInfo[0].use_time > 0 )
		{
			let error = couponInfo.length == 0 ? '优惠券不存在' : '此优惠券已经使用过了';
			throw( error );
		}
		await runDao.update( 'user_coupon', { use_time : lele.getTime() }, where );
		res.json({ code : 200 });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});


/**
 * 3.我的券  
 *  type 1：已经使用了的 2 ：我的优惠券
 *  openid  : 玩家id
 */
router.all( '/myCoupon', async function( req, res ) {
	try{
		let data = lele.empty( req.body ) ? req.params : req.body;
		let type = data.type || 1;
		let openid = req.user.openid ||'123456lmy';
		if( lele.empty( openid ) ) {
			throw( '玩家id不存在' );
		}
		let whereSql = 'openid="' + openid + '"';
		switch( lele.intval( type ) ) {
			case 1:
				whereSql + ' and use_time>0';
			break;
			default :
				throw( '传递的type类型不存在' );
		}
		let couponList = await runDao.select( 'user_coupon', whereSql, 'id,coupon_id,use_time,qr_code' );
		let ch_coupon = roleDao.getCouponInfo( 1 );
		couponList.forEach( function( sigData, index ){
			if( !lele.empty( ch_coupon[ sigData.coupon_id ]) ){
				sigData.couponInfo = ch_coupon[ sigData.coupon_id ];
			}
			else couponList.splice( index, 1 );
		});
		res.json( { code : 200, result : couponList } );
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});


/**
 * 4.领取优惠券  
 *  coupon_id : 优惠券的id
 *  openid : 用户id ( 需要修改 )
 */
router.all( '/received', async function( req, res ) {
	try{
		let data = lele.empty( req.body ) ? req.query : req.body;
		let coupon_id = data.coupon_id||1;
		let openid = req.user.openid||'123456lmy';
		let couponInfo = roleDao.getCouponInfo( 2, coupon_id );
		if( lele.empty( coupon_id ) || lele.empty( couponInfo ) ) {
			throw( '优惠券参数不对' );
		}
		if( lele.empty( openid )) {
			throw( '用户参数错误' );
		}
		let whereSql = 'coupon_id=' + coupon_id + ' and openid="' + openid + '"';
		let oldCoupon = await runDao.select( 'user_coupon', whereSql, 'id' );
		if( oldCoupon.length != 0 ) {
			throw( '您已经领取了该优惠券了' );
		}
		//要生存一个使用二维码 todo
		let insertData = {
			openid : openid,
			coupon_id : coupon_id,
			get_time : lele.getTime(),
			qr_code : '1111'
		};
		let insertInfo = await runDao.insert( 'user_coupon', insertData );
		insertData.id = insertInfo.insertId;
		insertData.couponInfo   = roleDao.getCouponInfo( 2, coupon_id );
		res.json( { code : '优惠券领取成功', couponInfo : insertData });
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
		let data = lele.empty( req.body ) ? req.query : req.body;
		let openid = req.user.openid;
		if( lele.empty( openid ) ) {
			throw( '用户不存在' );
		}
		let brandList = await runDao.select( 'user_follow','openid="' + openid + '"' );
		if( brandList.length == 0 ) {
			res.json( { code : 200, result : [] });
			return;
		}
		let ch_brand = roleDao.getBrandInfo( 1 );
		brandList.forEach( function( sigData, index ){
			if( !lele.empty( ch_brand[ sigData.brand_id ] )){
				sigData.brandInfo = ch_brand[ sigData.brand_id ];
			}
			else brandList.splice( index, 1 );
		});
		res.json( { code : '查询成功', result : brandList });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});

/*
	6.添加关注
 */
router.all( '/addFollow', async function( req, res ){
	try{
		let data = lele.empty( req.body ) ? req.query : req.body;
		let openid = req.user.openid;
		let brand_id = data.brand_id;
		let brandInfo = roleDao.getBrandInfo( 2, brand_id );
		if( lele.empty( openid ) || lele.empty( brand_id ) || lele.empty( brandInfo )) {
			throw( '参数错误' );
		}
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
		res.json( { code : 200, result : insertData });
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
		if( lele.empty( openid )){
			throw( '用户不存在' );
		}
		let time = lele.getTime();
		let ch_msg = roleDao.getChCache( 'ch_msg' );
			ch_msg = ch_msg.filter( sigMsg => sigMsg.start_time < time && sigMsg.end_time >= time );
		let myMsgs = await runDao.select( 'user_msg', 'openid="' + openid + '"' );
		let msgArr = [];
		for( let i = 0; i < ch_msg.length; i++ ){
			msgArr.push({
				'id' : ch_msg[ i ].msg_id,
				'msg_type'  : 1,
				'msg_cont' :  ch_msg[ i ].msg_cont,
				'from_user' : '系统消息',
				'is_read' : 0
			});
		}
		for( let i = 0; i < myMsgs.length; i++ ){
			msgArr.push({
				'id' : myMsgs[ i ].id,
				'msg_type'  : 2,
				'msg_cont' :  myMsgs[ i ].msg_cont,
				'from_user' : myMsgs[ i ].from_user,
				'is_read' : myMsgs[ i ].is_read
			});
		}
		res.json({ code : 200, result : msgArr });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});