const express = require('express');
const router = express.Router();

module.exports = router;

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});



/********************爬虫数据*************
https://www.cnblogs.com/coco1s/p/4954063.html
https://segmentfault.com/a/1190000009542336
https://www.cnblogs.com/xianyulaodi/p/6049237.html
http://blog.csdn.net/yezhenxu1992/article/details/50820629

http://blog.csdn.net/u010129985/article/details/53423656

************/
var fs = require( 'fs' );
var cheerio = require( 'cheerio' );
var request = require( 'request' );
var i = 0;
var url = 'http://www.ss.pku.edu.cn/index.php/newscenter/news/2391';

/*数据的爬虫*/
router.get( '/cherr', function( req, res )
{

});


/***
	vue的音乐播放器网址
	https://github.com/zce/music-player
	git clone https://github.com/zce/music-player.git -b vue --depth 1
*/