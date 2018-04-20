const express = require( 'express' );
const router = express.Router();
const lele = require( '../tools/lele');
const world = require( '../tools/common');
const runDao = require( '../dao/proDao.js')
const roleDao = require( '../dao/roleDao.js');
const logger = require( __dirname +'/../tools/log4.js').getLogger( 'log_router' );

module.exports = router;

//原始数据是个JSON数组啊。。那就不能使用普通数组的slice()方法来复制了，因为数组保存的是对对象的引用

/**
 * 1.获取不同类型的优惠券类型
 *
 */
router.all( '/type', async function( req, res ) {
	try{
		let couponType = roleDao.getChCache( 'ch_cate' );
		res.json( { code : 200, result :couponType });
	}
	catch( error ) {
		console.log( "coupon-type" + error.toString() );
		logger.info('[function-type-1:]' + error.toString() );
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});




/**
 * 2.获取不同类型的优惠券列表
 * 	cate_id : 类型id  默认 1
 * 	select * from table limit 20,30;
 * 	select * from table limit (start-1)*limit,limit;
 * 	page : 页数 初始为0
 * 	latitude : 维度
 * 	longitude : 经度
 * 	order_by : 排序类型  1：综合2：销量3：距离 4上新
 */
router.all( '/list', async function( req, res ) {
	try{
		var data = lele.empty( req.body ) ? req.query : req.body;
		var openid = req.user.openid;
		var paramList = {'cate_id':'商家类型没有传','page':'页数没有传','latitude':'当前精度没有传','longitude' : '当前维度没有传', 'order_by' : '排序规则没有传递'};
		for( let key in paramList )
		{
			if( !data.hasOwnProperty( key ))
			{
				throw( paramList[ key ] );
				break;
			}
		}
		var cate_id = data.cate_id;
		var couponTypeArr= roleDao.getChCache( 'ch_cate' );
		var ch_cate_json = lele.arrToObj( couponTypeArr, 'cate_id' );
		if( lele.empty( ch_cate_json[ cate_id ] ) ) throw('此优惠券类型不存在');

		var latitude = data.latitude;
		var longitude = data.longitude;
		var page = data.page;
		var pageNum = 5;
		var time = lele.getTime();
		var ch_BrandArr = roleDao.getBrandInfo( 2 );
			ch_BrandArr = lele.arrsToObj( ch_BrandArr, 'cate_id' )[ cate_id ];
		if( lele.empty( ch_BrandArr ) )
		{
			res.json({ code : 200, result : [] });
		}
		var	chBrandJson = lele.arrToObj( ch_BrandArr, 'brand_id' );
		var ch_BrandIdArr = Object.keys( chBrandJson );
		//过滤那些不符合要求的
		var ch_CouponArr = roleDao.getCouponInfo( 2 );
		ch_CouponArr = ch_CouponArr.filter( function( sigCoupon )
		{
			return ch_BrandIdArr.includes( sigCoupon.brand_id.toString() );
		});
		var userCouponArr = await runDao.select( 'user_coupon', 'openid="' + openid + '"', 'coupon_id,use_time' );
		var userCouponJson = lele.arrToObj( userCouponArr, 'coupon_id' );
		var coupon_lists = [];
		for( let i = 0; i < ch_CouponArr.length; i++ ) {
			let sigCoupon = ch_CouponArr[ i ];
			sigCoupon.isHas = 0;
			if( userCouponJson[ sigCoupon.coupon_id ] ) {
				sigCoupon.isHas = 1;
				//用户已经使用的优惠券直接跳过
				if( userCouponJson[ sigCoupon.coupon_id ].use_time > 0 ){
					sigCoupon.isHas = 2;
					continue;
				}
			}
			if( !lele.empty( chBrandJson[ sigCoupon.brand_id ] ))
			{
				let sigBrandInfo = chBrandJson[ sigCoupon.brand_id ];
				sigCoupon.distance = lele.mapDistance( latitude, longitude, sigBrandInfo.latitude, sigBrandInfo.longitude );
				coupon_lists.push( sigCoupon );
			}
		}
		var new_ch_coupon = [];
		switch( Number( data.order_by ) ){
			case 1 : //综合
				new_ch_coupon = coupon_lists.slice( page*pageNum, (page +1)*pageNum );
			break;
			case 2 : //销量
				new_ch_coupon = lele.sortBy( coupon_lists, 'cur_num' ).slice( page*pageNum, (page +1)*pageNum );
			break;
			case 3 :  //距离
				new_ch_coupon = lele.sortBy( coupon_lists, 'distance' ).slice( page*pageNum, (page +1)*pageNum );
			break;
			case 4 : //上新
				new_ch_coupon = lele.sortBy( coupon_lists, 'start_time', 'desc' ).slice( page*pageNum, (page +1)*pageNum );
			break;
		}
		res.json({ code : 200, result : new_ch_coupon });
	}
	catch( error ) {
		console.log( "coupon-list" + error );
		logger.info('[function-list-1:]' + error.toString() );
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});



/**
 * 3.优惠券详情
 * coupon_id : 优惠券的id
 */
router.all( '/details', async function( req, res )
{
	try{
		var data = lele.empty( req.body ) ? req.query : req.body;
		var coupon_id = lele.intval( data.coupon_id );
		var openid = req.user.openid;
		if( lele.empty( coupon_id ) || coupon_id == 0 )
		{
			throw( '优惠券参数错误' );
		}
		var sigCoupon = roleDao.getCouponInfo( 1, coupon_id );
		if( lele.empty( sigCoupon ) )
		{
			throw( '优惠券数据不存在' );
		}
		var sigBrand = roleDao.getBrandInfo( 1, sigCoupon.brand_id );
		if( lele.empty( sigBrand ) )
		{
			throw( '商户信息不存在' );
		}
		sigCoupon.brandInfo = sigBrand;
		var whereSql = 'openid="' + openid + '"' + ' and coupon_id=' + coupon_id;
		var userCouponArr = await runDao.select( 'user_coupon', whereSql );
		sigCoupon.isHas = 0;
		sigCoupon.userCoupon = {};
		if( userCouponArr.length > 0 ) {
			sigCoupon.isHas = 1;
			if( userCouponArr[0].use_time > 0 ) sigCoupon.isHas = 2;
			sigCoupon.userCoupon = {
				qr_code : userCouponArr[0].qr_code,
				dis_code : userCouponArr[0].dis_code
			};
		}
		res.json( { code : 200, result : sigCoupon } );
	}
	catch( error )
	{
		console.log( "coupon-details" + error.toString() );
		logger.info('[function-details-1:]' + error.toString() );
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});


/**
 * 4.品牌搜索
 	searchName : '搜索的名字';
 	是否领取 是否关注
 */
router.all( '/brandSearch', async function( req, res ) {
	try{
		var data = lele.empty( req.body ) ? req.query : req.body;
		var openid = req.user.openid;
		var searchName = data.searchName;
		if( lele.empty( searchName ) || searchName.length == 0 ) {
			throw( '搜索名称为空的');
		}
		searchName = lele.clearString( searchName );
		var ch_BrandArr = roleDao.getBrandInfo( 2 );
		var filterbrandArr = ch_BrandArr.filter( function( sigBrand ) {
			return sigBrand.brand_name.includes( searchName );
		});
		var brandIdArr = filterbrandArr.map( sigBrand => sigBrand.brand_id );
		//更新次数
		if( brandIdArr.length != 0 ) {
			var updateSql = 'update ch_brand set searchNum = searchNum + 1 where brand_id in(' + brandIdArr.join( ',' ) + ')';
			runDao.query( updateSql );
			roleDao.updateBrandSearchNum( brandIdArr );
			var user_follows = await runDao.select( 'user_follow', 'openid="' + openid + '"', 'brand_id' );
				user_follows = lele.arrToObj( user_follows, 'brand_id' );
			for( let i = 0; i < filterbrandArr.length; i++ )
			{
				filterbrandArr[i].isFollow = 0;
				if( user_follows.length != 0 && user_follows[ filterbrandArr[i].brand_id ] ) {
					filterbrandArr[i].isFollow = 1;
				}
			}
		}
		//过滤那些不
		var chCouponArr = lele.empty( roleDao.getCouponInfo( 2 ) ) ? [] : roleDao.getCouponInfo( 2 );
		var filterCouponArr = [];
		if( chCouponArr.length != 0 ) {
			filterCouponArr = chCouponArr.filter( function( sigCoupon ) {
				return sigCoupon.name.includes( searchName );
			})
			var user_coupons = await runDao.select( 'user_coupon', 'openid="' + openid + '"', 'coupon_id' );
				user_coupons = lele.arrToObj( user_coupons, 'coupon_id' );
			for( let i = 0; i < filterCouponArr.length; i++ )
			{
				filterCouponArr[i].isHas = 0;
				if( user_coupons.length!=0 && user_coupons[ filterCouponArr[i].coupon_id ] ) {
					filterCouponArr[i].isHas = 1;
				} 
			}
		}
		res.json( { code : 200, brandList : filterbrandArr, couponList :filterCouponArr });
	}
	catch( error ) {
		console.log( "coupon-brandSearch" + error.toString() );
		logger.info('[function-brandSearch-1:]' + error.toString() );
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
		res.json({ code : 200, result: concatUsInfo[0] });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});

/**
 * 6.热门搜索
 */
router.all( '/hotSearch', async function( req, res ) {
	try{
		let ch_BrandArr = roleDao.getBrandInfo( 2 );
		ch_BrandArr = lele.sortBy( ch_BrandArr, 'searchNum', 'desc' ).slice( 0, 5 );
		let resultData = [];
		for( let i = 0; i < ch_BrandArr.length; i++ ){
			resultData.push({
				brand_id : ch_BrandArr[ i ].brand_id,
				brand_name : ch_BrandArr[ i ].brand_name
			});
		}
		res.json({ code : 200, result : resultData });
	}
	catch( error ) {
		console.log( "coupon-hotSearch" + error.toString() );
		logger.info('[function-hotSearch-1:]' + error.toString() );
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});

/**
 * 7.商户详情
 *  brand_id : 品牌商户id
 */
router.all( '/brandDetails', async function( req, res ) {
	try{
		var data = lele.empty( req.body ) ? req.query : req.body;
		var openid = req.user.openid;
		var brand_id = lele.intval( data.brand_id );
		if( lele.empty( brand_id ) || brand_id == 0 ) {
			throw( '传递的商家信息有问题');
		}
		var sigBrand = roleDao.getBrandInfo( 1, brand_id );
		if( lele.empty( sigBrand ) ) {
			throw( '此商家不存在' );
		}
		var chCouponArr = roleDao.getCouponInfo( 2 );
		var brandCoupons = lele.arrsToObj( chCouponArr, 'brand_id' );
			brandCoupons = lele.empty( brandCoupons )? {} : brandCoupons;
		var couponArr = brandCoupons[ brand_id ];
		if( lele.empty( couponArr ) || couponArr.length == 0 ){
			sigBrand.couponArr = [];
			res.json({ code : 200, result : sigBrand });
			return;
		}
		var userCoupons = await runDao.select( 'user_coupon', 'openid="' + openid + '"', 'coupon_id' );
			userCoupons = lele.arrsToObj( userCoupons, 'coupon_id' );
		if( lele.empty( userCoupons ) ) userCoupons = {};
		for( let i = 0; i < couponArr.length; i++ ) {
			couponArr[ i ].isHas = 0;
			if( !lele.empty( userCoupons[ couponArr[ i ].coupon_id ] )) { 
				couponArr[ i ].isHas = 1;
			}
		}
		var whereSql = 'openid="' + openid + '" and brand_id=' + brand_id;
		var userFollow = await runDao.select( 'user_follow', whereSql, 'id' );
		sigBrand.isFollow = userFollow.length > 0 ? 1 : 0;
		sigBrand.couponList = couponArr;
		res.json({ code : 200, result : sigBrand });
	}
	catch( error ) {
		console.log( "coupon-brandDetails" + error.toString() );
		logger.info('[function-brandDetails-1:]' + error.toString() );
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});