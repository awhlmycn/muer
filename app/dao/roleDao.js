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
    let ch_BrandArr = [];
    try{
        ch_BrandArr = await runDao.query( 'select * from ch_brand where isOnline=1' );
    }
    catch( err ) {
        logger.info('[function-ch_brand-1]' + err.toString() );
    }
    global.ch_BrandJson = lele.arrToObj( ch_BrandArr, 'brand_id' );
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
    let ch_CouponArr = [];
    try{
        ch_CouponArr = await runDao.query( 'select * from ch_coupon' );
    }
    catch( err ) {
        logger.info('[function-ch_coupon-1]' + err.toString() );
    }
    global.ch_CouponJson = lele.arrToObj( ch_CouponArr, 'coupon_id' );
};

/**
 * 5.缓存商城推荐轮播图
 * ch_task ： [] 数组
 */
roleDao.ch_msg = async function()
{
    let ch_MsgArr = [];
    try{
        let sql = 'select * from ch_msg where start_time <=' + lele.getTime() + ' and end_time>=' + lele.getTime(); 
        ch_MsgArr = await runDao.query( sql );
    }
    catch( err ) {
        logger.info('[function-ch_msg-1]' + err.toString() );
    }
    global.ch_msg = ch_MsgArr;
};









/*********************************************************************************************************************************/
/*
    1.得到策划的缓存
 */
roleDao.getChCache = function( key )
{
    switch( key )
    {
        case 'ch_BrandJson' : 
            return global.ch_BrandJson;
        break;
        case 'ch_CouponJson' : 
            return global.ch_CouponJson;
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
         1：得到json数据
         2：得到过滤后的数组
*/
roleDao.getBrandInfo = function( type, brand_id )
{
    let ch_BrandJson = roleDao.getChCache('ch_BrandJson');
    switch( type ){
        case 1:
            if( !lele.empty( ch_BrandJson[ brand_id ] )) {
                return lele.clone( ch_BrandJson[ brand_id ] );
            }
            return {};
        break;
        case 2:
            let ch_BrandArr = lele.objToArr( ch_BrandJson );
            var brandArr = ch_BrandArr.filter( sigBrand => sigBrand.isOnline == 1 );
            return lele.clone( brandArr );
        break;
        default:
            return {};
    }
};

/*
    1.得到单个优惠券信息
    type
         1：得到json数据 得到单个优惠券信息, 并且传递coupon_id
         2 : 过滤那些不符合要求的优惠券
*/
roleDao.getCouponInfo = function( type, coupon_id )
{
    let ch_CouponJson = roleDao.getChCache('ch_CouponJson');
    switch( type ){
        case 1:
            return lele.clone( ch_CouponJson[ coupon_id ] );
        break;
        case 2:
            let time = lele.getTime();
            let ch_CouponArr = lele.objToArr( ch_CouponJson );
            var couponArr = ch_CouponArr.filter( function( sigCoupon ){
                return sigCoupon.start_time <= time && sigCoupon.end_time >= time;
            } );
            return lele.clone( couponArr );
        break;
        default:
            return {};
    }
}.bind( this );

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
        global.ch_BrandJson[ jsonData.brand_id ] = jsonData;
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
        global.ch_CouponJson[ jsonData.coupon_id ] = jsonData;
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
        if( !lele.empty( global.ch_BrandJson[ brand_id ] ) )
        {
            global.ch_BrandJson[ brand_id ] = Object.assign( global.ch_BrandJson[brand_id], data );
        }
    }
    catch( error ) {
        throw( '修改失败，服务器异常' );
        return;
    }
}

/*
    6.把商户信息放进缓存中
 */
roleDao.cacheSigBrand = function( brand_id, sigBrand ) {
    global.ch_BrandJson[ brand_id ] = sigBrand;
}

/*
    5.更新单个品牌的收索次数
 */
roleDao.updateBrandSearchNum = function( brands ) {
    for( let i = 0; i < brands.length; i++ ) {
        if( !lele.empty( global.ch_BrandJson[ brands[i] ])) {
            global.ch_BrandJson[ brands[i] ].searchNum += 1;
        }
    }
};

/*
    商户核销列表
 */
roleDao.getVerif = async function( brand_id )
{
    try{
        var ch_CouponJson = roleDao.getChCache( 'ch_CouponJson' );
        var couponJson = {};
        var couponArr = [];
        for( let coupon_id in ch_CouponJson ) {
            if( ch_CouponJson[ coupon_id ].brand_id == brand_id ){
                couponArr.push( coupon_id );
                couponJson[ coupon_id ] = ch_CouponJson[ coupon_id ].name;
            }
        }
        if( couponArr.length == 0 ) {
            return [];
        }
        var sql = 'select coupon_id,use_time,nickName from user_coupon where coupon_id in (' + couponArr.join( ',' ) + ') and use_time >0';
        var myChange = await runDao.query( sql );
        for( let i = 0; i < myChange.length; i++ ) {
            myChange[i].name = couponJson[ myChange[i].coupon_id ];
        }
        return myChange;
    }
    catch( error ) {
        console.log( error );
        return [];
    }
}
