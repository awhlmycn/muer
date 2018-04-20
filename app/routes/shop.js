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
 * 1.商户注册
 * type : 1 提交审核 2 重新提交审核
 *  商户名称 : 手机号码 商户地址  简介
 */
router.post( '/brandRegister', async function( req, res ) {
	var data = lele.empty( req.body ) ? req.query : req.body;
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
        var tokenInfo = await world.checkToken( formData );
        var openid = tokenInfo.openid;
       	let filterParam = { 'brand_name':'商家名称', 'brand_addr':'商家地址', 'cate_id' :'商家类型', 'brand_des':'商家描述', 'brand_tel' : '商家电话', 'longitude' : '维度', 'latitude' : '经度' };
        try{
        	let oldDir = files.file.path;
        	for( let key in filterParam ) {
				if( !formData.hasOwnProperty( key ) ) {
					fs.unlinkSync( oldDir, function(){} );
					throw( filterParam[ key ] + '参数不存在!' );
					break;
				}
			}
			if( formData.brand_tel.length > 11 ) throw( '手机号输入错误')
			let brand_name = formData.brand_name;
			let brandInfo = await runDao.select( 'log_brand', 'brand_name="' + brand_name + '" and is_pass!=3', 'brand_name' );
			if( brandInfo.length != 0 ){
				fs.unlinkSync( oldDir, function(){} );
				throw( '此商户已经存在了' );
			}
			let name = files.file.name;
            var newPath = './app/public/images/brandImages/';
            var newPathdir = newPath + name;
            fs.rename( oldDir, newPathdir, async function( err ){
            	if( err ) throw( '服务器异常:fs-brandRegister->1' + err );
            	let insertData = {
					brand_name : formData.brand_name,
					brand_addr : formData.brand_addr,
					cate_id : formData.cate_id,
					brand_des : formData.brand_des,
					brand_tel : formData.brand_tel,
					openid : openid,
					// icon_img : formData.icon_img,
					is_pass : 1,
					latitude : formData.latitude,
					longitude : formData.longitude
				};
            	insertData.icon_img = global.mysqlConfig.hostname + '/images/brandImages/' + name;
            	try{
            		var type = Number( formData.type );
            		var selfBrandInfo = await runDao.select( 'log_brand', 'openid="' + openid + '"', 'brand_name' );
            		if( selfBrandInfo.length == 0 ) {
            			await runDao.insert( 'log_brand', insertData );
            		}
            		else{
            			await runDao.update( 'log_brand', insertData, 'openid="' + openid + '"' );
            		}
            		res.json({ code : 200 });
            	}
            	catch( error ) {
            		console.log("error--1", error.toString());
            		res.json({ error : error ? error.toString() : '服务器异常'});
            	}
            })
        }
        catch( error ){
        	console.log("error", error.toString() );
        	res.json({ error : error ? error.toString() : '服务器异常'});
        }
    });
});


/**
 * 3.商户信息
 */
router.all( '/info', async function( req, res ) {
	try{
		var openid = req.user.openid;
		var userInfo = await runDao.select( 'user', 'openid="' + openid + '"', 'brand_id' );
		if( userInfo.length == 0 || userInfo[0].brand_id == 0 ) {
			throw( '您还未申请为商户');
		}
		var brand_id = userInfo[0].brand_id;
		var sigBrand = await runDao.select( 'ch_brand', 'brand_id=' + brand_id );
		if( lele.empty( sigBrand ) ) {
			throw( '门店信息错误' );
		}
		var myVerif = await roleDao.getVerif( brand_id );
		res.json( { code : 200, result : sigBrand[0], myVerif : myVerif });
	}
	catch( error ) {
		console.log( error );
		res.json({ error : error ? error.toString() : '服务器异常'});
	}	
});

/**
 * 4.商户中(我的核销)
 * brand_id : 商户信息
 */
router.all( '/changeList', async function( req, res ) {
	try{
		var openid = req.user.openid;
		var userInfo = await runDao.select( 'user', 'openid="' + openid + '"', 'brand_id' );
		if( userInfo.length == 0 || userInfo[0].brand_id == 0 ) {
			throw( '您还没有此操作权限');
		}
		var brand_id = userInfo[0].brand_id;
		var myVerif = await roleDao.getVerif( brand_id );
		res.json( { code : 200, myVerif : myVerif });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});

/**
 * 5.我的优惠券列表
 */
router.all( '/couponList', async function( req, res ) {
	try{
		var openid = req.user.openid;
		var userInfo = await runDao.select( 'user', 'openid="' + openid + '"', 'brand_id' );
		if( userInfo.length == 0 || userInfo[0].brand_id == 0 ) {
			throw( '您还没有此操作权限');
		}
		var brand_id = userInfo[0].brand_id;
		var couponList = await runDao.select( 'ch_coupon', 'brand_id=' + brand_id );
		res.json( { code : 200, result : couponList });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});

/*
	6.修改商户的地址信息
	brand_id
	brand_addr : '新的商户地址'
 */
router.all('/alertShopInfo', async function( req, res ) {
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
        var tokenInfo = await world.checkToken( formData );
        var openid = tokenInfo.openid;
        var brand_id = lele.intval( formData.brand_id );
        if( brand_id == 0 ) {
        	throw( '商户id不存在' );
        }
       	let filterParam = { 'brand_name':'商家名称', 'brand_addr':'商家地址', 'cate_id' :'商家类型', 'brand_des':'商家描述', 'brand_tel' : '商家电话', 'longitude' : '维度', 'latitude' : '经度' };
        try{
        	let oldDir = files.file.path;
        	for( let key in filterParam ) {
				if( !formData.hasOwnProperty( key ) ) {
					fs.unlinkSync( oldDir, function(){} );
					throw( filterParam[ key ] + '参数不存在!' );
					break;
				}
			}
			if( formData.brand_tel.length > 11 ) throw( '手机号输入错误')
			let name = files.file.name;
            var newPath = './app/public/images/brandImages/';
            var newPathdir = newPath + name;
            fs.rename( oldDir, newPathdir, async function( err ){
            	if( err ) throw( '服务器异常:fs-alertShopInfo->1' + err );
            	let updateInfo = {
					brand_name : formData.brand_name,
					brand_addr : formData.brand_addr,
					cate_id : formData.cate_id,
					brand_des : formData.brand_des,
					brand_tel : formData.brand_tel,
					openid : openid,
					is_pass : 1,
					latitude : formData.latitude,
					longitude : formData.longitude
				};
            	insertData.icon_img = global.mysqlConfig.hostname + '/images/brandImages/' + name;
            	roleDao.alertBrandInfo( brand_id, updateInfo );
            	// await runDao.update( 'ch_brand', updateInfo, 'brand_id=' + brand_id );
            })
        }
        catch( error ){
        	console.log("error", error.toString() );
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
		let filterParam = { 'name':'优惠券名称', 'num':'优惠券数量', 'use_know' :'优惠券使用须知', 'start_time':'优惠券有效时间', 'end_time' : '优惠券结束时间', 'price' : '抵扣金额', 'condition' : '优惠券使用条件' };
        try{
        	// var tokenInfo = await world.checkToken( formData );
        	let oldDir = files.file.path;
        	for( let key in filterParam ) {
				if( !formData.hasOwnProperty( key ) ) {
					fs.unlinkSync( oldDir, function(){} );
					throw( filterParam[ key ] + '参数不存在!' );
					break;
				}
			}
			var tokenInfo = await world.checkToken( formData );
        	var openid = tokenInfo.openid;
			let brandInfo = await runDao.select( 'user', 'openid="' + openid + '"', 'brand_id');
			let brand_id = brandInfo[0].brand_id;
			let coupon_name = formData.name;
			let whereSql = 'brand_id=' + brand_id + ' and name="' + formData.name + '"';
			let oldCoupon = await runDao.select( 'ch_coupon', whereSql, 'coupon_id' );
			if( oldCoupon.length != 0 ) {
				fs.unlinkSync( oldDir, function(){} );
				throw( '此优惠券名称已经生成了，请重新输入' );
			}
            var newPath = './app/public/images/couponImages/';
            var newPathdir = newPath + files.file.name;
            fs.rename( oldDir, newPathdir, async function( err ){
            	var insertData = {
						brand_id : brand_id,
						'`name`' : formData.name,
						num : formData.num,
						cur_num : formData.num,
						use_know : formData.use_know,
						start_time : ( new Date( formData.start_time )/1000 ),
						end_time : (new Date( formData.end_time )/1000),
						price : formData.price,
						'`condition`' : formData.condition,
						xianling : formData.xianling || 0
						// icon_img : data.icon_img
					};
					insertData.icon_img =  global.mysqlConfig.hostname + '/images/couponImages/' + files.file.name;
            	try{
            		//把数据更新到缓存
        			var brandInfo = await runDao.select( 'ch_brand', 'brand_id=' + brand_id );
        			brandInfo.isOnline = 1;
        			roleDao.cacheSigBrand( brand_id, brandInfo );
        			runDao.update( 'ch_brand', { isOnline : 1 }, 'brand_id=' + brand_id );
            		await roleDao.newChCoupon( insertData );
            		res.json( { code : 200 });
            	}
            	catch( error ) {
            		console.log("addCoupon-->111" + error );
            		res.json({ error : error ? error.toString() : '服务器异常'});
            	}
            })
        }
        catch( error ) {
        	console.log("addCoupon-->22" + error );
        	res.json({ error : error ? error.toString() : '服务器异常'});
        }
    });
});


/**
 * 8.优惠券的核销( 使用 )
 * dis_code : 优惠券dis_code
 */
router.all( '/used', async function( req, res ) {
	try{
		var openid = req.user.openid;
		var userInfo = await runDao.select( 'user', 'openid="' + openid + '"', 'brand_id' );
		if( userInfo.length == 0 || userInfo[0].brand_id == 0 ) {
			throw( '您还没有此操作权限');
		}
		var data = lele.empty( req.body ) ? req.query : req.body;
		if( !data.hasOwnProperty( 'dis_code' ) ) {
			throw( '参数错误,优惠券id不存在');
		}
		let dis_code = data.dis_code;
		let where = 'dis_code="' + dis_code + '"';
		let couponInfo = await runDao.select( 'user_coupon', where, 'use_time' );
		if( couponInfo.length == 0 || couponInfo[0].use_time > 0 )
		{
			let error = couponInfo.length == 0 ? '请输入正确的优惠券码' : '此优惠券已经使用过了';
			throw( error );
		}
		await runDao.update( 'user_coupon', { use_time : lele.getTime() }, where );
		res.json({ code : 200 });
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});
