const express = require( 'express' );
const router = express.Router();
const lele = require( '../tools/lele');
const world = require( '../tools/common');
const runDao = require( '../dao/proDao.js')
const roleDao = require( '../dao/roleDao.js')

module.exports = router;


/**
 * 1.优惠券详情
 */
router.all( '/details/:coupon_id', async function( req, res )
{
	const coupon_id = req.params.coupon_id;
	if( lele.empty( coupon_id ) )
	{
		res.json({ error : '优惠券参数错误'});
		return;
	}
	try{
		let couponInfo = roleDao.getCouponInfo( 2, coupon_id );
		if( lele.empty( couponInfo ) ) {
			throw( '优惠券数据不存在' );
		}
		res.json( { code : 200, result : couponInfo } );
	}
	catch( error )
	{
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});


/**
 * 2.获取不同类型的优惠券类型
 * 
 */
router.all( '/type', async function( req, res ) {
	try{
		let couponType = roleDao.getChCache( 'ch_cate' );
		res.json( { code : 200, result :couponType });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});

/**
 * 3.获取不同类型的优惠券列表
 * 	cate_id : 类型id  默认 1 
 * 	select * from table limit 20,30;
 * 	select * from table limit (start-1)*limit,limit;
 * 	page : 页数 初始为0 
 */
router.all( '/list', async function( req, res ) {
	try{
		let data = lele.empty( req.body ) ? req.query : req.body;
		let cate_id = data.cate_id;
		if( data.hasOwnProperty( cate_id ) || data.hasOwnProperty( data.page ) ) {
			throw( '传递的优惠券列表参数有问题');
		}
		let brandList = roleDao.getChCache( 'ch_brand' );
			brandList = lele.arrsToObj( brandList, 'cate_id' )[ cate_id ];
			brandList = brandList.filter( function( val )
			{
				return val.isOnline == 1;
			});
		if( brandList.length == 0 ) {
			return res.json({ code : [] });
		}
		var pageNum = 10; //每次刷新得到10条数据
		//每次截取一部分的数据
		brandList = lele.sortBy( brandList, 'brand_id' ).slice( data.page*pageNum, (data.page +1)*pageNum );
		let brandArr = [];
		for( let i = 0; i < brandList.length; i++ )
		{
			brandArr.push( brandList[ i ].brand_id );
		}
		let ch_coupon = roleDao.getChCache( 'ch_coupon' );
		let	ch_coupons = ch_coupon.filter( function( val ) {
				return ( val.start_time <= lele.getTime() ) && ( val.end_time >= lele.getTime() ) && brandArr.includes( val.brand_id );
			});
		ch_coupons = lele.arrsToObj( ch_coupons, 'brand_id' );
		for( let i = 0; i < brandList.length; i++ ) {
			brandList[i].couponList = ch_coupons[ brandList[i].brand_id ]? ch_coupons[ brandList[i].brand_id ] :[];
		}
		res.json( { code : 200, result : brandList });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});

/**
 * 4.品牌搜索
 * brand_id : 商户的品牌id
 */
router.all( '/brandSearch', async function( req, res ) {
	try{
		let data = lele.empty( req.body ) ? req.query : req.body;
		let brand_id = data.brand_id;
		if( lele.empty( brand_id ) ) {
			throw( '传递的商户id错误');
		}
		let brandList = roleDao.getBrandInfo( 2, brand_id )
		if( lele.empty( brandList ) || !brandList.isOnline ) {
			throw( '商户不存在' );
		}
		let ch_coupon = lele.arrsToObj( roleDao.getChCache( 'ch_coupon' ), 'brand_id' );
		let brandCoupon = ch_coupon[ brand_id ];
			brandCoupon = brandCoupon.filter( function( val ) {
				return ( val.start_time < lele.getTime() ) && ( val.end_time > lele.getTime() );
			});
		brandList.couponList = brandCoupon;
		res.json( { code : 200, result : brandList });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});


/**
 * 5.联系我们
 */
router.all( '/contactUs', async function( req, res ) {
	try{
		let concatUsInfo = roleDao.getChCache( 'ch_contact_us' );
		if( lele.empty( concatUsInfo ) ) concatUsInfo = {};
		res.json({ code : 200, result: concatUsInfo });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});


/**
 * 6.商户注册
 *  商户名称 : 手机号码 商户地址  简介
 */
router.all( '/brandRegister', async function( req, res ) {
	try{
		let data = lele.empty( req.body ) ? req.query : req.body;
		let filterParam = { 'brand_name':'商家名称', 'brand_addr':'商家地址', 'cate_id' :'商家类型', 'brand_des':'商家描述', 'brand_tel' : '商家电话', 'icon_img' : '商户图标' };
		for( let key in filterParam ) {
			if( !data.hasOwnProperty( key ) ) {
				throw( filterParam[ key ] + '参数不存在!' );
				break;
			}
		}
		let brand_name = data.brand_name;
		let brandInfo = await runDao.select( 'ch_brand', 'brand_name="' + brand_name + '"', 'brand_id' );
		if( brandInfo.length != 0 ) {
			throw( '此商户已经存在了' );
		}
		let insertData = {
			brand_name : data.brand_name,
			brand_addr : data.brand_addr,
			cate_id : data.cate_id,
			brand_des : data.brand_des,
			brand_tel : data.brand_tel,
			icon_img : data.icon_img,
			isOnline : 1
		};
		insertData = await roleDao.newChBrand( insertData );
		res.json( { code : 200 } );
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});

/**
 * 7.添加优惠券
 * 名称 ,金额，优惠条件满，发放数量，优惠券图片，每人限领取，优惠券类型，到期提醒，活动有效期，活动截止日期
 */
router.all( '/addCoupon', async function( req, res ) {
	try{
		let data = lele.empty( req.body ) ? req.query : req.body;
		let filterParam = { 'brand_id' : '商店id','name':'优惠券名称', 'num':'优惠券数量', 'use_know' :'优惠券使用须知', 'start_time':'优惠券有效时间', 'end_time' : '优惠券有效时间', 'price' : '商家电话', 'condition' : '商家电话', 'icon_img' : '商家电话'};
		for( let key in filterParam ) {
			if( !data.hasOwnProperty( key ) ) {
				throw( filterParam[ key ] + '参数不存在!' );
				break;
			}
		}
		let whereSql = 'brand_id=' + data.brand_id + ' and name="' + data.name + '"';
		let oldCoupon = await runDao.select( 'ch_coupon', whereSql, 'coupon_id' );
		if( oldCoupon.length != 0 ) {
			throw( '此优惠券名称已经生成了，请重新输入' );
		}
		let insertData = {
			brand_id : data.brand_id,
			name : data.name,
			num : data.num,
			cur_num : data.num,
			use_know : data.use_know,
			start_time : data.start_time,
			end_time : data.end_time,
			price : data.price,
			condition : data.condition,
			icon_img : data.icon_img
		};
		let brandList = await runDao.select( 'ch_brand', 'brand_id=' + brand_id );
		insertData = await roleDao.newChCoupon( insertData );
		brandList[0].couponList = insertData;
		res.json( { code : '优惠券添加成功', couponInfo : insertData });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});










// /**
//  * 10.商户详情 
//  *  brand_id : 品牌商户id
//  */
// router.get( '/brandDetails', async function( req, res ) {
// 	try{
// 		let data = req.query;
// 		let brand_id = data.brand_id;
// 		if( lele.empty( brand_id ) ) {
// 			throw( '传递的商家信息有问题');
// 		}

// 		let brandInfo = await runDao.select( 'ch_brand', 'brand_id=' + brand_id );
// 		if( brandInfo.length == 0 ) {
// 			throw( '此商家不存在' );
// 		}
// 		let whereSql = 'start_time<=' + lele.getTime() + ' and end_time >=' + lele.getTime();
// 		let couponList = await runDao.select( 'ch_coupon', 'brand_id=' + brand_id );
// 		brandInfo[0].couponList = couponList;
// 		res.json( { code : '查询成功', result : brandInfo });
// 	}
// 	catch( error ) {
// 		res.json({ error : error ? error.toString() : '服务器异常'});
// 	}
// });
