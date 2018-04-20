const express = require( 'express' );
const router = express.Router();
const runDao = require( '../dao/proDao.js');
const roleDao = require( '../dao/roleDao.js');
const lele = require( '../tools/lele' );
module.exports = router;

/*
	1.读取数据库的审核列表
*/
router.all( '/brandList', async function( req, res ) {
	try{
		var brandList = await runDao.select( 'log_brand', 'is_pass=1' );
		var ch_cate = lele.arrToObj( roleDao.getChCache('ch_cate'), 'cate_id' );
		// global.mysqlConfig.hostname = 'http://127.0.0.1:3000';
		brandList.forEach( sigBrand => sigBrand.cate_id = ch_cate[sigBrand.cate_id].cate_name);
		// var openidArr = brandList.map( sigBrand => sigBrand.openid );
		// var userInfo = await runDao.query( 'select nickName, openid from user where openid in (' + openidArr.join(',') + ')' );
		
		var options = {
			brandList : JSON.stringify( brandList ),
			serverUrl : JSON.stringify( global.mysqlConfig.hostname )
		};
		res.render( 'brandList', options );
	}
	catch( err ) {
		console.log( err );
		res.json({ code : 200, errMsg : err.toString() });
	}
	// 
});

/**
 * 2.商户审核
 *  id : log_brand
 *  is_pass :  1:正在审核 2 : 成功 3 失败
 */
router.all( '/brandExamine', async function( req, res ) {
	try{
		var data = lele.empty( req.body ) ? req.query : req.body;
		console.log( data );
		var id = data.id;
		var isPass = data.isPass;
		if( lele.intval( id ) == 0 || lele.intval( isPass )  == 0 ) {
			throw( '商户审核id不存在' );
		}
		var log_brand = await runDao.select( 'log_brand', 'id=' + id );
		if( log_brand.length == 0 ) {
			throw( '商户不存在' );
		}
		if( isPass == 2 ) {
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
			var addBrandInfo = await runDao.insert( 'ch_brand', insertData );
			var openid = log_brand[0].openid;
			var updateInfo = await runDao.update( 'user', { brand_id : addBrandInfo.insertId }, 'openid="' + openid + '"');
		}
		await runDao.update( 'log_brand',{ is_pass : isPass }, 'id=' + id );
		res.json( { code : 200 } );
	}
	catch( error ) {
		console.log("error", error );
		res.json({ error : error ? error.toString() : '服务器异常'});
	}
});

router.all( '/ceshi', async function( req, res ) {
	var data = { brand_id: 79,
	  name: '昌里路',
	  num: '88',
	  cur_num: '88',
	  use_know: ' 图图他',
	  start_time: 1524096000,
	  end_time: 1524096000,
	  price: '88881',
	  condition: '5588',
	  xianling: '22',
	  icon_img: 'https://www.gbk7.cn/images/couponImages/tmp_69241fdbaf06a445bec34cb3526586f659a7f0139091ff85.jpg' }
	 var update = await runDao.insert( 'ch_coupon', data );
	 res.json( { code : 100, result : update });
});