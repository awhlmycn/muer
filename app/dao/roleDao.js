const lele = require( '../tools/lele.js' );
const runDao = require( './proDao.js' );
// var async = require( 'async' );
const logger = require( __dirname +'/../tools/log4.js').getLogger( 'log_dao' );
const roleDao = module.exports;

/**
 * 1.缓存商户
 * ch_brand ： [] 数组
 */
roleDao.ch_brand =  async function()
{
    let ch_brand_list = [];
    try{
        ch_brand_list = await runDao.query( 'select * from ch_brand where isOnline=1' );
    }
    catch( err ) {
        logger.info('[function-ch_brand-1]' + err.toString() );
    }
    global.ch_brand = ch_brand_list;
};

/**
 * 2.缓存商户类型
 * ch_cate ： [] 数组
 */
roleDao.ch_cate = async function()
{
    let ch_cate_list = [];
    try{
        ch_cate_list = await runDao.query( 'select * from ch_cate' );
    }
    catch( err ) {
        logger.info('[function-ch_cate-1]' + err.toString() );
    }
    global.ch_cate = ch_cate_list;
};

/**
 * 3.缓存抽奖券
 * ch_task ： [] 数组
 */
roleDao.ch_contact_us = async function()
{
    let ch_contact_list = [];
    try{
        ch_contact_list = await runDao.query( 'select * from ch_contact_us' );
    }
    catch( err ) {
        logger.info('[function-ch_contact_us-1]' + err.toString() );
    }
    global.ch_contact_us = ch_contact_list;
};

/**
 * 4.缓存今日推荐轮播图
 * ch_task ： [] 数组
 */
roleDao.ch_coupon = async function()
{
    let ch_coupon_list = [];
    try{
        ch_coupon_list = await runDao.query( 'select * from ch_coupon' );
    }
    catch( err ) {
        logger.info('[function-ch_coupon-1]' + err.toString() );
    }
    global.ch_coupon = ch_coupon_list;
};

/**
 * 5.缓存商城推荐轮播图
 * ch_task ： [] 数组
 */
roleDao.ch_msg = async function()
{
    let ch_msg_list = [];
    try{
        ch_msg_list = await runDao.query( 'select * from ch_msg' );
    }
    catch( err ) {
        logger.info('[function-ch_msg-1]' + err.toString() );
    }
    global.ch_msg = ch_msg_list;
};









/*********************************************************************************************************************************/
/*
    1.得到策划的缓存
 */
roleDao.getChCache = function( key )
{
    switch( key )
    {
        case 'ch_brand' : 
            return global.ch_brand;
        break
        case 'ch_cate' : 
            return global.ch_cate;
        break
        case 'ch_contact_us' : 
            return global.ch_contact_us;
        break
        case 'ch_coupon' : 
            return global.ch_coupon;
        break
        case 'ch_msg' : 
            return global.ch_msg;
        break
        default:
            return {};
        break
    }
};
/*
    1.得到单个用户信息
    type 1 得到数组
         2：得到json数据
         3：得到单个任务信息, 并且传递brand_id
*/
roleDao.getBrandInfo = function( type, brand_id )
{
    var chBrandJson = lele.arrToObj( global.ch_brand, 'brand_id' );
    if( type == 1 ) return chBrandJson;
    return chBrandJson[ brand_id ];
};

/*
    1.得到单个优惠券信息
    type
         1：得到json数据
         2：得到单个优惠券信息, 并且传递coupon_id
*/
roleDao.getCouponInfo = function( type, coupon_id )
{
    var chCouponJson = lele.arrToObj( global.ch_coupon, 'coupon_id' );
    if( type == 1 ) return chCouponJson;
    return chCouponJson[ coupon_id ];
};

/*
    3.生成新的商户信息
    jsonData {
        brand_name: brand_addr: cate_id: brand_des:
        brand_tel: icon_img: 
    }
 */
roleDao.newChBrand = async function( jsonData )
{
    try{
        let insertInfo = await runDao.insert( 'ch_brand', jsonData );
        jsonData.brand_id = insertInfo.insertId;
        //更新缓存
        global.ch_brand.push( jsonData );
        return jsonData;
    }
    catch( err ) {
        logger.info('[function-newChBrand-1]' + err.toString() );
        return {};
    }
    
}


/*
    4.生成新的优惠券
    jsonData {
        brand_id: num: cur_num: name:
        des: start_time: end_time: price: condition:
        qr_code: icon_img:
    }
 */
roleDao.newChCoupon = async function( jsonData )
{
    try{
        let insertInfo = await runDao.insert( 'ch_coupon', jsonData );
        jsonData.coupon_id = insertInfo.insertId;
        //更新缓存
        global.ch_coupon.push( jsonData );
        return jsonData;
    }
    catch( err ) {
        logger.info('[function-newChCoupon-1]' + err.toString() );
        return {};
    }
}
