const express = require( 'express' );
const router = express.Router();
const lele = require( '../tools/lele');
const world = require( '../tools/common');
const runDao = require( '../dao/proDao.js')
const roleDao = require( '../dao/roleDao.js')
const formidable = require( 'formidable' );
const fs = require( 'fs' );

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
 * 	latitude : 维度
 * 	longitude : 经度
 * 	order_by : 排序类型  1：综合2：销量3：距离 4上新
 */
router.all( '/list', async function( req, res ) {
	try{
		let data = lele.empty( req.body ) ? req.query : req.body;
		let paramList = {'cate_id':'商家类型没有传','page':'页数没有传','latitude':'当前精度没有传','longitude' : '当前维度没有传', 'order_by' : '排序规则没有传递'};
		for( let key in paramList ){
			if( !data.hasOwnProperty( key )){
				throw( paramList[ key ] );
				break;
			}
		}
		let cate_id = data.cate_id;
		let latitude = data.latitude;
		let longitude = data.longitude;
		let page = data.page;
		let pageNum = 10;
		let time = lele.getTime();
		let ch_brand = roleDao.getBrandInfo( 3 );
			ch_brand = lele.arrsToObj( ch_brand, 'cate_id' )[ cate_id ];
		let	ch_brand_json = lele.arrToObj( ch_brand, 'brand_id' );
		let brandArr = Object.keys( ch_brand_json );
		//过滤那些不符合要求的
		let ch_coupon = roleDao.getCouponInfo( 3 );
			ch_coupon = ch_coupon.filter( function( sigCoupon ){
				return brandArr.includes( sigCoupon.brand_id.toString() );
			});
		ch_coupon.forEach( function( sigCoupon, index ){
			if( ch_brand_json[ sigCoupon.brand_id ]){
				let sigBrandInfo = ch_brand_json[ sigCoupon.brand_id ];
				ch_coupon[ index ].distance = lele.mapDistance( latitude, longitude, sigBrandInfo.latitude, sigBrandInfo.longitude );
			}
			else ch_coupon.splice( index, 1 );
		});
		let new_ch_coupon = [];
		switch( Number( data.order_by ) ){
			case 1 : //综合
				new_ch_coupon = ch_coupon.slice( page*pageNum, (page +1)*pageNum );
			break;
			case 2 : //销量
				new_ch_coupon = lele.sortBy( ch_coupon, 'cur_num' ).slice( page*pageNum, (page +1)*pageNum );
			break;
			case 3 :  //距离
				new_ch_coupon = lele.sortBy( ch_coupon, 'distance' ).slice( page*pageNum, (page +1)*pageNum );
			break;
			case 4 : //上新
				new_ch_coupon = lele.sortBy( ch_coupon, 'start_time', 'desc' ).slice( page*pageNum, (page +1)*pageNum );

			break;
		}
		res.json({ code : 200, result : new_ch_coupon });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});



/**
 * 4.品牌搜索
 	searchName : '搜索的名字';
 */
router.all( '/brandSearch', async function( req, res ) {
	try{
		let data = lele.empty( req.body ) ? req.query : req.body;
		let searchName = data.searchName;
		if( lele.empty( searchName ) ) {
			throw( '搜索名称为空的');
		}
		searchName = lele.clearString( searchName );
		let ch_brand = roleDao.getBrandInfo( 3 );
		let brandList = ch_brand.filter( function( sigBrand ){
			return sigBrand.brand_name.includes( searchName );
		});
		//过滤那些不
		let ch_coupon = roleDao.getCouponInfo( 3 );
		let couponList = ch_coupon.filter( function( sigCoupon ){
			return sigCoupon.name.includes( searchName );
		});
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
		res.json({ code : 200, result: concatUsInfo });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});

router.all( '/ceshi', function( req, res ){
	res.render( 'index' );
});

/**
 * 6.商户注册
 *  商户名称 : 手机号码 商户地址  简介
 */
router.all( '/brandRegister', async function( req, res ) {
	var form = new formidable.IncomingForm();   //创建上传表单
    form.encoding = 'utf-8';        //设置编辑
    form.uploadDir = './app/public/tmpFile/';    //设置上传目录
    form.keepExtensions = true;  //保留后缀
    form.maxFieldsSize = 20 * 1024 * 1024;   //文件大小
    form.keepExtensions = true;  //文件保存为原来的名字

    form.parse( req, async function( err, formData, files ) 
    {
        if ( err ) 
        {
            res.json( {'error':'服务器异常'});
            return;     
        }
       let filterParam = { 'brand_name':'商家名称', 'brand_addr':'商家地址', 'cate_id' :'商家类型', 'brand_des':'商家描述', 'brand_tel' : '商家电话', 'icon_img' : '商户图标', 'longitude' : '维度', 'latitude' : '经度' };
        try{
        	let oldDir = files.file.path;
        	
        	for( let key in filterParam ) {
				if( !formData.hasOwnProperty( key ) ) {
					fs.unlinkSync( oldDir, function(){} );
					throw( filterParam[ key ] + '参数不存在!' );
					break;
				}
			}
			let brand_name = formData.brand_name;
			let brandInfo = await runDao.select( 'ch_brand', 'brand_name="' + brand_name + '"', 'brand_id' );
			if( brandInfo.length != 0 ){
				fs.unlinkSync( oldDir, function(){} );
				throw( '此商户已经存在了' );
			}
			let name = files.file.name;
            var newPath = './app/public/images/brandImages/';
            var newPathdir = newPath + name;
            fs.rename( oldDir, newPathdir, async function( err ){
            	let insertData = {
					brand_name : formData.brand_name,
					brand_addr : formData.brand_addr,
					cate_id : formData.cate_id,
					brand_des : formData.brand_des,
					brand_tel : formData.brand_tel,
					// icon_img : formData.icon_img,
					isOnline : 1,
					latitude : formData.latitude,
					longitude : formData.longitude
				};
            	insertData.icon_img = newPathdir;
            	try{
            		insertData = await roleDao.newChBrand( insertData );
            		res.json({ code : 200 });
            	}
            	catch( error ) {
            		res.json({ error : error ? error.toString() : '服务器异常'});
            	}            	
            })
        }
        catch( error ){
        	res.json({ error : error ? error.toString() : '服务器异常'});
        }
    });
});

/**
 * 7.添加优惠券
 * 名称 ,金额，优惠条件满，发放数量，优惠券图片，每人限领取，优惠券类型，到期提醒，活动有效期，活动截止日期
 */
router.all( '/addCoupon', async function( req, res ) {
	var form = new formidable.IncomingForm();   //创建上传表单
    form.encoding = 'utf-8';        //设置编辑
    form.uploadDir = './app/public/tmpFile/';    //设置上传目录
    form.keepExtensions = true;  //保留后缀
    form.maxFieldsSize = 20 * 1024 * 1024;   //文件大小
    form.keepExtensions = true;  //文件保存为原来的名字

    form.parse( req, async function( err, formData, files ) 
    {
        if ( err ) 
        {
            res.json( {'error':'服务器异常'});
            return;     
        }
		let filterParam = { 'brand_id' : '商店brand_id','name':'优惠券名称', 'num':'优惠券数量', 'use_know' :'优惠券使用须知', 'start_time':'优惠券有效时间', 'end_time' : '优惠券有效时间', 'price' : '商家电话', 'condition' : '商家电话', 'icon_img' : '商家电话' };
        try{
        	let oldDir = files.file.path;
        	for( let key in filterParam ) {
				if( !formData.hasOwnProperty( key ) ) {
					fs.unlinkSync( oldDir, function(){} );
					throw( filterParam[ key ] + '参数不存在!' );
					break;
				}
			}       
			let coupon_name = formData.name;
			let whereSql = 'brand_id=' + formData.brand_id + ' and name="' + formData.name + '"';
			let oldCoupon = await runDao.select( 'ch_coupon', whereSql, 'coupon_id' );
			if( oldCoupon.length != 0 ) {
				fs.unlinkSync( oldDir, function(){} );
				throw( '此优惠券名称已经生成了，请重新输入' );
			}
            var newPath = './app/public/images/couponImages/';
            var newPathdir = newPath + files.file.name;
            fs.rename( oldDir, newPathdir, async function( err ){
            	let insertData = {
						brand_id : formData.brand_id,
						name : formData.name,
						num : formData.num,
						cur_num : formData.num,
						use_know : formData.use_know,
						start_time : formData.start_time,
						end_time : formData.end_time,
						price : formData.price,
						condition : formData.condition
						// icon_img : data.icon_img
					};

            	insertData.icon_img = newPathdir;
            	try{
            		insertData = await roleDao.newChCoupon( insertData );
            		res.json( { code : 200, couponInfo : insertData });
            	}
            	catch( error ) {
            		res.json({ error : error ? error.toString() : '服务器异常'});
            	}            	
            })
        }
        catch( error ){
        	res.json({ error : error ? error.toString() : '服务器异常'});
        }
    });
});

/**
 * 8.热门搜索
 * 
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


/**
 * 4.品牌搜索
 * brand_id : 商户的品牌id
 */
router.all( '/brandSearch1', async function( req, res ) {
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
 * 3.获取不同类型的优惠券列表
 * 	cate_id : 类型id  默认 1 
 * 	select * from table limit 20,30;
 * 	select * from table limit (start-1)*limit,limit;
 * 	page : 页数 初始为0 
 */
router.all( '/list1', async function( req, res ) {
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
 * 7.添加优惠券
 * 名称 ,金额，优惠条件满，发放数量，优惠券图片，每人限领取，优惠券类型，到期提醒，活动有效期，活动截止日期
 */
router.all( '/addCoupon111', async function( req, res ) {
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