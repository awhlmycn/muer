const express = require( 'express' );
const router = express.Router();
const lele = require( '../tools/lele');
const world = require( '../tools/common');
const runDao = require( '../dao/proDao.js')
const roleDao = require( '../dao/roleDao.js')

module.exports = router;






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
		var latitude = data.latitude;
		var longitude = data.longitude;
		var page = data.page;
		var pageNum = 10;
		var time = lele.getTime();
		var ch_brand = roleDao.getBrandInfo( 3 );
			ch_brand = lele.arrsToObj( ch_brand, 'cate_id' )[ cate_id ];
		var	ch_brand_json = lele.arrToObj( ch_brand, 'brand_id' );
		var brand_arr = Object.keys( ch_brand_json );

		//过滤那些不符合要求的
		var ch_coupon_arr = roleDao.getCouponInfo( 3 );
			ch_coupon_arr = ch_coupon_arr.filter( function( sig_coupon )
			{
				return brand_arr.includes( sig_coupon.brand_id.toString() );
			});
		var user_coupons = await runDao.select( 'user_coupon', 'openid="' + openid + '"', 'coupon_id' );
			user_coupons = lele.arrToObj( user_coupons, 'coupon_id' );
		ch_coupon_arr.forEach( function( sig_coupon, index )
		{
			sig_coupon.isHas = 0;
			if( user_coupons[ sig_coupon.coupon_id ] ) sig_coupon.isHas = 1;
			if( ch_brand_json[ sig_coupon.brand_id ])
			{
				let sigBrandInfo = ch_brand_json[ sig_coupon.brand_id ];
				ch_coupon_arr[ index ].distance = lele.mapDistance( latitude, longitude, sigBrandInfo.latitude, sigBrandInfo.longitude );
			}
			else ch_coupon_arr.splice( index, 1 );
		});
		var new_ch_coupon = [];
		switch( Number( data.order_by ) ){
			case 1 : //综合
				new_ch_coupon = ch_coupon_arr.slice( page*pageNum, (page +1)*pageNum );
			break;
			case 2 : //销量
				new_ch_coupon = lele.sortBy( ch_coupon_arr, 'cur_num' ).slice( page*pageNum, (page +1)*pageNum );
			break;
			case 3 :  //距离
				new_ch_coupon = lele.sortBy( ch_coupon_arr, 'distance' ).slice( page*pageNum, (page +1)*pageNum );
			break;
			case 4 : //上新
				new_ch_coupon = lele.sortBy( ch_coupon_arr, 'start_time', 'desc' ).slice( page*pageNum, (page +1)*pageNum );
			break;
		}
		res.json({ code : 200, result : new_ch_coupon });
	}
	catch( error ) {
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
		var coupon_id = data.coupon_id;
		var openid = req.user.openid;
		if( lele.empty( coupon_id ) )
		{
			res.json({ error : '优惠券参数错误'});
			return;
		}
		var couponInfo = roleDao.getCouponInfo( 2, coupon_id );
		if( lele.empty( couponInfo ) ) {
			throw( '优惠券数据不存在' );
		}
		var brand_id = couponInfo.brand_id;
		var ch_sig_brand = roleDao.getBrandInfo( 2, brand_id );
		couponInfo.brandInfo = ch_sig_brand;
		var whereSql = 'openid="' + openid + '"' + ' and coupon_id=' + coupon_id;
		var user_coupon = await runDao.select( 'user_coupon', whereSql );
		couponInfo.isHas = 0;
		couponInfo.userCoupon = {};
		if( user_coupon.length > 0 ) {
			couponInfo.isHas = 1;
			if( user_coupon[0].use_time > 0 ) couponInfo.isHas = 2;
			couponInfo.userCoupon = {
				qr_code : user_coupon[0].qr_code,
				dis_code : user_coupon[0].dis_code
			};
		}
		res.json( { code : 200, result : couponInfo } );
	}
	catch( error )
	{
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
		if( lele.empty( searchName ) ) {
			throw( '搜索名称为空的');
		}
		searchName = lele.clearString( searchName );
		var ch_brand = roleDao.getBrandInfo( 3 );
		var brandList = ch_brand.filter( function( sigBrand ){
			return sigBrand.brand_name.includes( searchName );
		});
		var brand_arr = brandList.map( sigBrand => sigBrand.brand_id );
		//更新次数
		if( brand_arr.length != 0 ) {
			var updateSql = 'update ch_brand set searchNum = searchNum + 1 where brand_id in(' + brand_arr.join( ',' ) + ')';
			runDao.query( updateSql );
			roleDao.updateBrandSearchNum( brand_arr );
			var user_follows = await runDao.select( 'user_follow', 'openid="' + openid + '"', 'brand_id' );
				user_follows = lele.arrToObj( user_follows, 'brand_id' );
			for( let i = 0; i < brandList.length; i++ )
			{
				brandList[i].isFollow = 0;
				if( user_follows[ brandList[i].brand_id] ) brandList[i].isFollow = 1;
			}
		}
		//过滤那些不
		var ch_coupon_arr = lele.empty( roleDao.getCouponInfo( 3 ) ) ? [] : roleDao.getCouponInfo( 3 );
		var couponList = [];
		if( ch_coupon_arr.length != 0 ) {
			couponList = ch_coupon_arr.filter( function( sigCoupon ) {
				return sigCoupon.name.includes( searchName );
			})
			var user_coupons = await runDao.select( 'user_coupon', 'openid="' + openid + '"', 'coupon_id' );
				user_coupons = lele.arrToObj( user_coupons, 'coupon_id' );
			for( let i = 0; i < couponList.length; i++ )
			{
				couponList[i].isHas = 0;
				if( user_coupons[ couponList[i].coupon_id] ) couponList[i].isHas = 1;
			}
		}
		res.json( { code : 200, brandList : brandList, couponList :couponList });
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
		let ch_brand = roleDao.getBrandInfo( 3 );
		ch_brand = lele.sortBy( ch_brand, 'searchNum', 'desc' ).slice( 0, 5 );
		let resultData = [];
		for( let i = 0; i < ch_brand.length; i++ ){
			resultData.push({
				brand_id : ch_brand[ i ].brand_id,
				brand_name : ch_brand[ i ].brand_name
			});
		}
		res.json({ code : 200, result : resultData });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});

/**
 * 7.商户详情
 *  brand_id : 品牌商户id
 */
router.all( '/brandDetails', async function( req, res ) {
	try{
		let data = lele.empty( req.body ) ? req.query : req.body;
		let openid = req.user.openid;
		let brand_id = data.brand_id;
		if( lele.empty( brand_id ) ) {
			throw( '传递的商家信息有问题');
		}
		let brandInfo = roleDao.getBrandInfo( 2, brand_id );
		if( lele.empty( brandInfo ) ) {
			throw( '此商家不存在' );
		}
		let brandCoupons = lele.arrsToObj( roleDao.getCouponInfo( 3 ), 'brand_id' );
		let couponList = brandCoupons[ brand_id ];
		if( lele.empty( couponList ) || couponList.length == 0 ){
			brandInfo.couponList = [];
			res.json({ code : 200, result : brandInfo });
			return;
		}
		let userCoupons = await runDao.select( 'user_coupon', 'openid="' + openid + '"', 'coupon_id' );
			userCoupons = lele.arrsToObj( userCoupons, 'coupon_id' );
		for( let i = 0; i < ch_coupon.length; i++ ) {
			ch_coupon[ i ].isHas = 0;
			if( !lele.empty( userCoupons[ ch_coupon[ i ].coupon_id ] )) { 
				ch_coupon[ i ].isHas = 1;
			}
		}
		let userFollow = await runDao.select( 'user_follow', 'brand_id=' + brand_id, 'id' );
		brandInfo.isFollow = userFollow.length > 0 ? 1 : 0;
		brandInfo.couponList = couponList;
		res.json({ code : 200, result : brandInfo });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});

















// /**
//  * 1.获取不同类型的优惠券类型
//  *
//  */
// router.all( '/type', async function( req, res ) {
// 	try{
// 		let couponType = roleDao.getChCache( 'ch_cate' );
// 		res.json( { code : 200, result :couponType });
// 	}
// 	catch( error ) {
// 		res.json({ error : error ? error.toString() : '服务器异常'});
// 	}
// });




// /**
//  * 3.获取不同类型的优惠券列表
//  * 	cate_id : 类型id  默认 1
//  * 	select * from table limit 20,30;
//  * 	select * from table limit (start-1)*limit,limit;
//  * 	page : 页数 初始为0
//  * 	latitude : 维度
//  * 	longitude : 经度
//  * 	order_by : 排序类型  1：综合2：销量3：距离 4上新
//  */
// router.all( '/list', async function( req, res ) {
// 	try{
// 		let data = lele.empty( req.body ) ? req.query : req.body;
// 		let openid = req.user.openid;
// 		let paramList = {'cate_id':'商家类型没有传','page':'页数没有传','latitude':'当前精度没有传','longitude' : '当前维度没有传', 'order_by' : '排序规则没有传递'};
// 		for( let key in paramList )
// 		{
// 			if( !data.hasOwnProperty( key ))
// 			{
// 				throw( paramList[ key ] );
// 				break;
// 			}
// 		}
// 		let cate_id = data.cate_id;
// 		let latitude = data.latitude;
// 		let longitude = data.longitude;
// 		let page = data.page;
// 		let pageNum = 10;
// 		let time = lele.getTime();
// 		let ch_brand = roleDao.getBrandInfo( 3 );
// 			ch_brand = lele.arrsToObj( ch_brand, 'cate_id' )[ cate_id ];
// 		let	ch_brand_json = lele.arrToObj( ch_brand, 'brand_id' );
// 		let brandArr = Object.keys( ch_brand_json );

// 		let userCoupon = await runDao.select( 'user_coupon', 'openid="' + openid + '"', 'coupon_id' );
// 			userCoupon = Object.keys( lele.arrsToObj( userCoupon, 'coupon_id' ));
// 		//过滤那些不符合要求的
// 		let ch_coupon = roleDao.getCouponInfo( 3 );
// 			ch_coupon = ch_coupon.filter( function( sigCoupon ){
// 				return brandArr.includes( sigCoupon.brand_id.toString() ) && !userCoupon.includes( sigCoupon.coupon_id.toString() );
// 			});
// 		ch_coupon.forEach( function( sigCoupon, index ){
// 			if( ch_brand_json[ sigCoupon.brand_id ]){
// 				let sigBrandInfo = ch_brand_json[ sigCoupon.brand_id ];
// 				ch_coupon[ index ].distance = lele.mapDistance( latitude, longitude, sigBrandInfo.latitude, sigBrandInfo.longitude );
// 			}
// 			else ch_coupon.splice( index, 1 );
// 		});
// 		let new_ch_coupon = [];
// 		switch( Number( data.order_by ) ){
// 			case 1 : //综合
// 				new_ch_coupon = ch_coupon.slice( page*pageNum, (page +1)*pageNum );
// 			break;
// 			case 2 : //销量
// 				new_ch_coupon = lele.sortBy( ch_coupon, 'cur_num' ).slice( page*pageNum, (page +1)*pageNum );
// 			break;
// 			case 3 :  //距离
// 				new_ch_coupon = lele.sortBy( ch_coupon, 'distance' ).slice( page*pageNum, (page +1)*pageNum );
// 			break;
// 			case 4 : //上新
// 				new_ch_coupon = lele.sortBy( ch_coupon, 'start_time', 'desc' ).slice( page*pageNum, (page +1)*pageNum );
// 			break;
// 		}
// 		res.json({ code : 200, result : new_ch_coupon });
// 	}
// 	catch( error ) {
// 		res.json({ error : error ? error.toString() : '服务器异常'});
// 	}
// });



// /**
//  * 1.优惠券详情
//  * coupon_id : 优惠券的id
//  */
// router.all( '/details', async function( req, res )
// {
// 	try{
// 		let data = lele.empty( req.body ) ? req.query : req.body;
// 		let coupon_id = data.coupon_id;
// 		if( lele.empty( coupon_id ) )
// 		{
// 			res.json({ error : '优惠券参数错误'});
// 			return;
// 		}
// 		let couponInfo = roleDao.getCouponInfo( 2, coupon_id );
// 		if( lele.empty( couponInfo ) ) {
// 			throw( '优惠券数据不存在' );
// 		}
// 		res.json( { code : 200, result : couponInfo } );
// 	}
// 	catch( error )
// 	{
// 		res.json({ error : error ? error.toString() : '服务器异常'});
// 	}
// });


// /**
//  * 4.品牌搜索
//  	searchName : '搜索的名字';
//  */
// router.all( '/brandSearch', async function( req, res ) {
// 	try{
// 		let data = lele.empty( req.body ) ? req.query : req.body;
// 		let searchName = data.searchName;
// 		if( lele.empty( searchName ) ) {
// 			throw( '搜索名称为空的');
// 		}
// 		searchName = lele.clearString( searchName );
// 		let ch_brand = roleDao.getBrandInfo( 3 );
// 		let brandList = ch_brand.filter( function( sigBrand ){
// 			return sigBrand.brand_name.includes( searchName );
// 		});
// 		let brandArr = brandList.map( sigBrand => sigBrand.brand_id );
// 		//更新次数
// 		if( brandArr.length != 0 ) {
// 			let updateSql = 'update ch_brand set searchNum = searchNum + 1 where brand_id in(' + brandArr.join( ',' ) + ')';
// 			runDao.query( updateSql );
// 			roleDao.updateBrandSearchNum( brandArr );
// 		}
// 		//过滤那些不
// 		let chCouponArr = lele.empty( roleDao.getCouponInfo( 3 ) ) ? [] : roleDao.getCouponInfo( 3 );
// 		let couponList = [];
// 		if( chCouponArr.length != 0 ) {
// 			couponList = chCouponArr.filter( function( sigCoupon ) {
// 				return sigCoupon.name.includes( searchName );
// 			})
// 		}
// 		res.json( { code : 200, brandList : brandList, couponList :couponList });
// 	}
// 	catch( error ) {
// 		res.json({ error : error ? error.toString() : '服务器异常'});
// 	}
// });


// /**
//  * 5.联系我们
//  */
// router.all( '/contactUs', async function( req, res ) {
// 	try{
// 		let concatUsInfo = roleDao.getChCache( 'ch_contact_us' );
// 		if( lele.empty( concatUsInfo ) ) concatUsInfo = {};
// 		res.json({ code : 200, result: concatUsInfo });
// 	}
// 	catch( error ) {
// 		res.json({ error : error ? error.toString() : '服务器异常'});
// 	}
// });

// /**
//  * 6.热门搜索
//  */
// router.all( '/hotSearch', async function( req, res ) {
// 	try{
// 		let ch_brand = roleDao.getBrandInfo( 3 );
// 		ch_brand = lele.sortBy( ch_brand, 'searchNum', 'desc' ).slice( 0, 5 );
// 		let resultData = [];
// 		for( let i = 0; i < ch_brand.length; i++ ){
// 			resultData.push({
// 				brand_id : ch_brand[ i ].brand_id,
// 				brand_name : ch_brand[ i ].brand_name
// 			});
// 		}
// 		res.json({ code : 200, result : resultData });
// 	}
// 	catch( error ) {
// 		res.json({ error : error ? error.toString() : '服务器异常'});
// 	}
// });

// /**
//  * 7.商户详情
//  *  brand_id : 品牌商户id
//  */
// router.all( '/brandDetails', async function( req, res ) {
// 	try{
// 		let data = lele.empty( req.body ) ? req.query : req.body;
// 		let openid = req.user.openid;
// 		let brand_id = data.brand_id;
// 		if( lele.empty( brand_id ) ) {
// 			throw( '传递的商家信息有问题');
// 		}
// 		let brandInfo = roleDao.getBrandInfo( 2, brand_id );
// 		if( lele.empty( brandInfo ) ) {
// 			throw( '此商家不存在' );
// 		}
// 		let brandCoupons = lele.arrsToObj( roleDao.getCouponInfo( 3 ), 'brand_id' );
// 		let couponList = brandCoupons[ brand_id ];
// 		if( lele.empty( couponList ) || couponList.length == 0 ){
// 			brandInfo.couponList = [];
// 			res.json({ code : 200, result : brandInfo });
// 			return;
// 		}
// 		let userCoupons = await runDao.select( 'user_coupon', 'openid="' + openid + '"', 'coupon_id' );
// 			userCoupons = lele.arrsToObj( userCoupons, 'coupon_id' );
// 		for( let i = 0; i < ch_coupon.length; i++ ) {
// 			ch_coupon[ i ].isHas = 0;
// 			if( !lele.empty( userCoupons[ ch_coupon[ i ].coupon_id ] )) { 
// 				ch_coupon[ i ].isHas = 1;
// 			}
// 		}
// 		let userFollow = await runDao.select( 'user_follow', 'brand_id=' + brand_id, 'id' );
// 		brandInfo.isFollow = userFollow.length > 0 ? 1 : 0;
// 		brandInfo.couponList = couponList;
// 		res.json({ code : 200, result : brandInfo });
// 	}
// 	catch( error ) {
// 		res.json({ error : error ? error.toString() : '服务器异常'});
// 	}
// });