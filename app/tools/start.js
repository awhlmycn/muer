"use strict";

/**
 * 启动初始化参数 
 */
const start = module.exports;

const fs = require('fs');
const mysql = require( '../mysql/mysql.js' );
const mysqlPro = require( '../mysql/proMysql.js' );
const mysqlConfig = require( '../../config/mysql.json' );
//连接MySQL(mysql连接必须处于最优先)
global.mysqlConfig = mysqlConfig;
// global.db = new mysql( 100, 'database', mysqlConfig );

global.dbPro = new mysqlPro( 100, 'database', mysqlConfig );
const roleDao = require('../dao/roleDao.js')

//启动运行
start.run =  function( app )
{
    //缓存数据库的基本信息
    roleDao.ch_brand();           //今日任务列表
    roleDao.ch_cate();        //领奖券
    roleDao.ch_contact_us();         //抽奖券
    roleDao.ch_coupon();      //今日推荐
    roleDao.ch_msg();  //商城推荐

    //加载路由
    start.router( app );
};

const world = require( './common.js' );

//加载路由
start.router = function( app )
{
	app.use( '/users', async function( req, res, next ){
		// req.url--->'/login?code=1111'
		if( !req.url.includes( 'login' ) ) {
			let info = await world.checkToken( req );
			if( info.error ){
				res.json( info );
			}
			else req.user = info;
		}
		next();
	});

    app.use( '/coupon', require( '../routes/coupon' ) );
    app.use('/gm',  require('../routes/gm') );
    app.use('/users', require('../routes/users') );

    // 没有找到页面
    app.use( '/', function( req, res )
    {
        res.send( '页面不存在');
    });
};

//启动定时程序(加载微信公众token)
start.wxTimer = function()
{
   //启动每日定时器
   // scheduleCronCycle();
};

//定时器的启动
function scheduleCronCycle()
{
    schedule.scheduleJob( '0 0 0 * * *', function()
    {
        // child_process.exec( 'sh /home/data/mysqlBack.sh', function( result )
        // {
        //     console.log(result );
        // });
    }); 
}