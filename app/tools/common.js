const lele = require( './lele.js' );
const common = module.exports;
const jwt =  require( 'jwt-simple' );
const runDao = require( '../dao/proDao.js')
const request = require( 'request' );

let jwtTokenSecret = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
/*
    1.生成jsonWebToken
 */ 
common.createToken = function( data ){
    let expires = lele.zeroTime(1) + 86400;//每天凌晨过期
    let payload= {
        data : data,
        exp : expires
    }
    var token = jwt.encode( payload, jwtTokenSecret);
    return token;
};

/*
    2.解密token
*/
common.decodeToken = function( token ) {
    let decToken = jwt.decode( token, jwtTokenSecret );
    return decToken;
};

/**
 * 3.检查token是否过期
 */
common.checkToken = async function( data )
{
    try{
        let token = data.token;
        if( lele.empty( token )) return{ 'error' : '用户登录token没有' };

        let decToken = common.decodeToken( token );
        if( lele.empty( decToken ) || decToken.exp < lele.getTime() ) {
            console.log("checkToken--1");
            return{ 'error' : '用户登录失败,请重新登陆' };
        }
        return decToken.data;
    }
    catch( error ) {
        console.log("checkToken--2222");
        return{ 'error' : '用户登录失败,请重新登陆' };
    }
};
// var redisStore = require('connect-redis')( session );
    // app.use( session({
    //     // 假如你不想使用 redis 而想要使用 memcached 的话，代码改动也不会超过 5 行。
    //     // 这些 store 都遵循着统一的接口，凡是实现了那些接口的库，都可以作为 session 的 store   使用，比如都需要实现 .get(keyString) 和 .set(keyString, value) 方法。
    //     // 编写自己的 store 也很简单
    //     store: new redisStore(),
    //     secret: 'somesecrettoken',
    //     name : 'aaaa',
    //     resave: false,
    //     saveUninitialized: true,
    //     cookie: { secure: false, maxAge: 7*3600000 }
    // }));
    // var session = require( 'express-session' );
    // var SessionStore = require('connect-mongo')(session)
    //  app.use( '/shop', session( {
    //     // name : 'aaaa',
    //     secret: 'vlavr-shop',
    //     resave: false,
    //     saveUninitialized: true,
    //         store : new SessionStore({
    //                   url: "mongodb://localhost/db_session",
    //                   collection : 'sessions',
    //                   interval: 120000 // expiration check worker run interval in millisec (default: 60000)
    //              }),
    //     cookie: { secure: false, maxAge: 100000, Domain : '139.196.215.224'}
    // }))

    //对shop底下的绑定session
    // app.use( '/shop', session( {
    //     secret: 'vlavr-shop',
    //     saveUninitialized: false,  // 当 其设置为true的时候  即在设定时间过的时候就失效，resave和rolling不存在
    //     resave:true,               //当resave和rolling存在的时候 他们代表的是会话一直在操作的时候，他就会更新过期时间
    //     rolling:true,
    //     store : new SessionStore({}, global.tlogDB.pool ),
    //     cookie: { secure: false, maxAge : 1800 * 1000 }
    // }))
    // //这个是微信商城的
    // app.use( '/shop', require( '../routes/shop.js' ) );

    // app.use('/ssh', require('redirect-https')({
    //     body: '<!-- Please use HTTPS ! -->'
    // }));

    // app.use( '/ssh', require( '../routes/ssh.js' ) );

    /*
        1.背景图片全屏 ： <div><img style="position:absolute;width:100%;height:100%;z-Index:-1;" src="./liuliang_12.jpg" /></div>
     */ 