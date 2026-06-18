const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');
const server = http.createServer((req, res) => {
    let url = decodeURIComponent(req.url.split('?')[0]);
    if (url === '/') url = '/index.html';
    let filePath = path.join(__dirname, url);
    fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        let ext = path.extname(filePath);
        let ct = 'text/plain';
        if(ext==='.html') ct='text/html';
        if(ext==='.js') ct='application/javascript';
        if(ext==='.png') ct='image/png';
        res.writeHead(200, {'Content-Type': ct});
        res.end(data);
    });
});
server.listen(4001, async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    await page.setViewport({width: 1200, height: 800});
    await page.goto('http://localhost:4001/index.html?v=' + Date.now());
    await new Promise(r => setTimeout(r, 2000));
    const canvasElement = await page.canvas;
    if (canvasElement) {
        await canvasElement.screenshot({path: 'C:/Users/tecno/.gemini/antigravity/brain/66498739-f81f-40a9-b8d3-1d98d4b321ce/local_test_final_v2.png'});
    } else {
        await page.screenshot({path: 'C:/Users/tecno/.gemini/antigravity/brain/66498739-f81f-40a9-b8d3-1d98d4b321ce/local_test_final_v2.png'});
    }
    await browser.close();
    server.close();
    console.log('Done');
});
