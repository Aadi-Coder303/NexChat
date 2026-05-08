const https = require('https');
https.get('https://chating-eosin.vercel.app', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const match = data.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (match) {
      console.log('Found JS:', match[1]);
      https.get('https://chating-eosin.vercel.app' + match[1], (res2) => {
        let jsData = '';
        res2.on('data', chunk => jsData += chunk);
        res2.on('end', () => {
          const apiMatch = jsData.match(/https:\/\/[^\.]+\.up\.railway\.app/g);
          console.log('API URLs:', apiMatch ? [...new Set(apiMatch)] : 'None found');
        });
      });
    }
  });
});
