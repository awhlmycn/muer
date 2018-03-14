const numbers1 = [1, 2, 2, 1];
const numbers2 = [2, 2];
const findIntersection = (n1, n2) => {
  	const s1 = new Set( n1 );
  	return n2.filter(( number ) => s1.delete( number ) );
};
console.log(findIntersection(numbers1, numbers2));



// const fetch = require('node-fetch');
// const chunk = require('lodash/chunk');
// const images = [
//   'http://urlecho.appspot.com/echo?body=0',
//   'http://urlecho.appspot.com/echo?body=1',
//   'http://urlecho.appspot.com/echo?body=2',
//   'http://urlecho.appspot.com/echo?body=3',
//   'http://urlecho.appspot.com/echo?body=4',
//   'http://urlecho.appspot.com/echo?body=5',
//   'http://urlecho.appspot.com/echo?body=6',
//   'http://urlecho.appspot.com/echo?body=7',
//   'http://urlecho.appspot.com/echo?body=8',
//   'http://urlecho.appspot.com/echo?body=9',
// ];

// const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));
// const download = (url) => fetch(url)
//   .then((response) => response.text())
//   .then(console.log);
// const parallelDownload = (urls) => Promise.all(urls.map(download));
// const serialDownload = (previousDownload, urls) => previousDownload
//   .then(() => parallelDownload(urls));
// const serialDownloadWithDelay = (previousDownload, urls) => serialDownload(previousDownload, urls)
//   .then(() => delay(1000));
// const downloadImages = (imagesArray) => {
//   const chunks = chunk(imagesArray, 5);
//   chunks.reduce(serialDownloadWithDelay, Promise.resolve());
// };
// downloadImages(images);