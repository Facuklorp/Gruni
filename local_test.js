// local_test.js - Levanta servidor local, espera que cargue, toma screenshot
const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = 'c:/Users/tecno/OneDrive/Documentos/Hola/Otros/Grunis';

const server = http.createServer((req, res) => {
    let url = req.url.split('?')[0];
    let filePath = path.join(ROOT, url === '/' ? 'index.html' : url);
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg',
        '.js': 'application/javascript', '.css': 'text/css'
    };
    const contentType = mimeTypes[ext] || 'text/plain';
    fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found: ' + filePath); return; }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(4000, async () => {
    console.log('Server up at http://localhost:4000');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Enable CORS for local images
    await page.setRequestInterception(true);
    page.on('request', req => req.continue());
    
    console.log('Loading game...');
    await page.goto('http://localhost:4000/', { waitUntil: 'networkidle0', timeout: 15000 });
    
    // Wait for game to initialize and run for a bit
    console.log('Waiting for game to run (5 seconds)...');
    await new Promise(r => setTimeout(r, 5000));
    
    await page.screenshot({ path: 'local_test_1.png' });
    console.log('Screenshot 1 saved');
    
    // Wait more to see agent moving
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: 'local_test_2.png' });
    console.log('Screenshot 2 saved');

    // Wait for potential action state
    await new Promise(r => setTimeout(r, 8000));
    await page.screenshot({ path: 'local_test_3.png' });
    console.log('Screenshot 3 saved');
    
    await browser.close();
    server.close();
    process.exit(0);
});
