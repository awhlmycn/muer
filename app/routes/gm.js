const express = require('express');
let router = express.Router();
const runDao = require('../dao/runDao.js');
const lele = require( '../tools/lele.js')
module.exports = router;
var dbLogic = global.db;

const jwt = require('jwt-simple');//对数据进行加密
/**
	http://www.jianshu.com/p/a2a327550d20
	https://github.com/hokaccha/node-jwt-simple/blob/master/README.md
*/
router.get( '/login', function( req, res )
{
	var data = req.query;
	var account = data.account || 'lmy';
	var password = data.password || 'a112125';
	runDao.select( 'user', 'account="' + account + '"', function( err, result )
	{
		console.log( result );
		var token = creatToken();
		res.json({code : token});
	});
});

var jwtTokenSecret = 'woshixiaoming';

var creatToken = function()
{
	var expires = lele.getTime() + 7*86400;//七天后过期
	var payload= {
		account : 11111,
		exp : expires
	}
	var token = jwt.encode( payload, jwtTokenSecret);
	return token;
}

router.get( '/getToken', function( req, res )
{
	var data = req.query;
	var token = data.token;
	console.log( "token", token );
	var newToken = jwt.decode( token, jwtTokenSecret );
	console.log( "newToken", newToken );
	res.json( newToken );
});



/*************对数据库防止注入******************/

router.get( '/sqlLogin', function( req, res ){
	
	var param = { 'name' : 'xiaoming11'};
	dbLogic.selectNew( 'user', param , function( err, result )
	{
		if( err )
		{
			res.send( err );
			return
		}
		res.json( result );
	});
});

router.get( '/ceshi', async function( req, res )
{
	try{
		var con = await global.dbPro.startTransaction();
		con.beginTransaction( async function( err )
		{
			if( err )
			{
				con.end();
				return;
			}
			try
			{
				var ruslt = await con.update( 'user', { 'gold' : 'gold-' + 10 },'id=2' );
				await con.update( 'user', { 'gold' : 'gold+'+10},'id=1' );
				await con.commit();
				con.end();
				res.json( {'ok':'ok'} );
			}
			catch( e )
			{
				res.json( {'ok':e.toString()} );
				con.rollback();
			}
		});
	}
	catch( e )
	{
		res.json( { 'err' : e.toString() });
	}
});


router.get( '/ceshio111', function(){
	text();
	res.send(1111111);
});