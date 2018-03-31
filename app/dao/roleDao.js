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
    global.ch_brands = lele.arrToObj( ch_brand_list, 'brand_id' );
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
    global.ch_coupons = lele.arrToObj( ch_coupon_list, 'coupon_id' );
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
        let sql = 'select * from ch_msg where start_time <=' + lele.getTime() + ' and end_time>=' + lele.getTime(); 
        ch_msg_list = await runDao.query( sql );
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
        break;
        case 'ch_brands' : 
            return global.ch_brands;
        break;
        case 'ch_coupon' : 
            return global.ch_coupon;
        break
        case 'ch_coupons' : 
            return global.ch_coupons;
        break
        case 'ch_cate' : 
            return global.ch_cate;
        break
        case 'ch_contact_us' : 
            return global.ch_contact_us;
        break
        case 'ch_msg' : 
            let time = lele.getTime();
            return global.ch_msg.filter( sigMsg => sigMsg.start_time < time && sigMsg.end_time >= time );
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
    let ch_brands = roleDao.getChCache('ch_brands');
    switch( type ){
        case 1:
            return ch_brands;
        break;
        case 2:
            return ch_brands[ brand_id ];
        break;
        case 3:
            let ch_brandArr = lele.objToArr( ch_brands );
            return ch_brandArr.filter( sigBrand => sigBrand.isOnline == 1 );
        break;
        default:
            return {};
    }
};

/*
    1.得到单个优惠券信息
    type
         1：得到json数据
         2：得到单个优惠券信息, 并且传递coupon_id
         3 : 过滤那些不符合要求的优惠券
*/
roleDao.getCouponInfo = function( type, coupon_id )
{
    let ch_coupons = roleDao.getChCache('ch_coupons');
    switch( type ){
        case 1:
            return ch_coupons;
        break;
        case 2:
            return ch_coupons[ coupon_id ];
        break;
        case 3:
            let time = lele.getTime();
            let ch_couponArr = lele.objToArr( ch_coupons );
            return ch_couponArr.filter( sigCoupon => sigCoupon.start_time <= time && sigCoupon.end_time >= time );
        break;
        default:
            return {};
    }
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
        global.ch_brands[ jsonData.brand_id ] = jsonData;
        return jsonData;
    }
    catch( err ) {
        throw( err.toString() );
        logger.info('[function-newChBrand-1]' + err.toString() );
        return ;
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
        global.ch_coupons[ jsonData.coupon_id ] = jsonData;
        //更新缓存
        return jsonData;
    }
    catch( err ) {
        throw( err.toString() );
        logger.info('[function-newChCoupon-1]' + err.toString() );
        return;
    }
}

/*
    5.修改商户信息
 */
roleDao.alertBrandInfo = async function( brand_id, data ) {
    try{
        await runDao.update( 'ch_brand', data, 'brand_id=' + brand_id );
        if( !lele.empty( global.ch_brands[ brand_id ] ) )
        {
            global.ch_brands[ brand_id ] = Object.assign( global.ch_brands[brand_id], data );
        }
    }
    catch( error ) {
        throw( '修改失败，服务器异常' );
        return;
    }
}

/*
    5.更新单个品牌的收索次数
 */
roleDao.updateBrandSearchNum = function( brands ) {
    for( let i = 0; i < brands.length; i++ ) {
        if( !lele.empty( global.ch_brands[ brands[i] ])) {
            global.ch_brands[ brands[i] ].searchNum += 1;
        }
    }
};

/*
    商户核销列表
 */
roleDao.getVerif = async function( brand_id )
{
    try{
        var ch_coupons = roleDao.getChCache( 'ch_coupons' );
        var couponJson = {};
        var couponArr = [];
        for( let coupon_id in ch_coupons ) {
            if( ch_coupons[ coupon_id ].brand_id == brand_id ){
                couponArr.push( coupon_id );
                couponJson[ coupon_id ] = ch_coupons[ coupon_id ].name;
            }
        }
        var sql = 'select coupon_id,use_time,tel from user_coupon where coupon_id in (' + couponArr.join( ',' ) + ') and use_time >0';
        var myChange = await runDao.query( sql );
            myChange = lele.arrsToObj( myChange, 'coupon_id' );
        var result = [];
        for( let key in myChange ){
            result.push({
                name : couponJson[ key ],
                couponList : myChange[ key ]
            });
        }
        return result;
    }
    catch( error ) {
        console.log( error );
        return [];
    }
}
