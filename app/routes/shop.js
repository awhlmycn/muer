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
router.all( '/brandRegister', async function( req, res ) {
	var data = lele.empty( req.body ) ? req.query : req.body;
	var type = data.type || 1;
	var form = new formidable.IncomingForm();   //创建上传表单
    form.encoding = 'utf-8';        //设置编辑
    form.uploadDir = './app/public/tmpFile/';    //设置上传目录
    form.keepExtensions = true;  //保留后缀
    form.maxFieldsSize = 20 * 1024 * 1024;   //文件大小
    form.keepExtensions = true;  //文件保存为原来的名字

    var openid = req.user.openid;
    form.parse( req, async function( err, formData, files )
    {
        if ( err )
        {
            res.json( {'error':'服务器异常'});
            return;
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
					openid : openid,
					// icon_img : formData.icon_img,
					is_pass : 1,
					latitude : formData.latitude,
					longitude : formData.longitude
				};
            	insertData.icon_img = newPathdir;
            	try{
            		if( type == 1 ) {
            			await runDao.insert( 'log_brand', insertData );
            		}
            		else{
            			await runDao.update( 'log_brand', insertData, 'openid="' + openid + '"' );
            		}
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
 * 2.商户审核
 *  id : log_brand
 *  is_pass :  1:正在审核 2 : 成功 3 失败
 */
router.all( '/brandExamine', async function( req, res ) {
	try{
		var data = lele.empty( req.body ) ? req.query : req.body;
		var id = data.id;
		var is_pass = data.is_pass;
		if( lele.intval( id ) == 0 || lele.intval( is_pass ) ) {
			throw( '商户审核id出错' );
		}
		var log_brand = await runDao.select( 'log_brand', 'id=' + id );
		if( log_brand.length == 0 ) {
			throw( '审核的商户不存在' );
		}
		if( is_pass == 1 ) {
			var insertData = {
				brand_name : log_brand[0].brand_name,
				brand_addr : log_brand[0].brand_addr,
				cate_id : log_brand[0].cate_id,
				brand_des : log_brand[0].brand_des,
				brand_tel : log_brand[0].brand_tel,
				icon_img : log_brand[0].icon_img,
				isOnline : 0,
				latitude : log_brand[0].latitude,
				longitude : log_brand[0].longitude
			};
			await runDao.insert( 'ch_brand', insertData );
		}
		await runDao.update( 'log_brand',{ is_pass : is_pass }, 'id=' + id );
		res.json( { code : 200 } );
	}
	catch( error ) {
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
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
		var brandInfo = roleDao.getBrandInfo( 2, brand_id );
		if( lele.empty( brandInfo ) ) {
			throw( '门店信息错误' );
		}
		var myVerif = await roleDao.getVerif( brand_id );
		res.json( { code : 200, result : brandInfo, myVerif : myVerif });
	}
	catch( error ) {
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
router.all('/alertShopAddr', async function( req, res ) {
	try{
		var openid = req.user.openid;
		var userInfo = await runDao.select( 'user', 'openid="' + openid + '"', 'brand_id' );
		if( userInfo.length == 0 || userInfo[0].brand_id == 0 ) {
			throw( '您还没有此操作权限');
		}
		var data = lele.empty( req.body ) ? req.query : req.body;
		var brand_id = userInfo[0].brand_id;
		var brand_addr = data.brand_addr;
		if( lele.empty( brand_addr ) || brand_addr.length < 0 ) {
			throw( '商户id参数没传或者新地址没改');
		}
		var brandInfo = await runDao.select( 'ch_brand', 'brand_id=' + brand_id, 'brand_id' );
		if( lele.empty( brandInfo ) ) {
			throw( '商户不存在' );
		}
		var alertData = {
			'brand_addr' : brand_addr
		};
		//修改缓存
		roleDao.alertBrandInfo( brand_id, alertData );
		res.json({ code : 200 });
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
		let filterParam = { 'brand_id' : '商店brand_id','name':'优惠券名称', 'num':'优惠券数量', 'use_know' :'优惠券使用须知', 'start_time':'优惠券有效时间', 'end_time' : '优惠券结束时间', 'price' : '抵扣金额', 'condition' : '优惠券使用条件', 'icon_img' : '优惠券图标' };
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
            		//把数据更新到缓存
        			var brandInfo = await runDao.select( 'ch_brand', 'brand_id=' + brand_id );
        			brandInfo.isOnline = 1;
        			global.ch_brands[ brandInfo.brand_id ] = brandInfo;
        			runDao.update( 'ch_brand', { isOnline : 1 }, 'brand_id=' + brand_id );
            		await roleDao.newChCoupon( insertData );
            		res.json( { code : 200 });
            	}
            	catch( error ) {
            		res.json({ error : error ? error.toString() : '服务器异常'});
            	}
            })
        }
        catch( error ) {
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