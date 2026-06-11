// inspect_sprites.js - Script para ver y mapear exactamente los sprites
const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple static file server
const server = http.createServer((req, res) => {
    let filePath = path.join('c:/Users/tecno/OneDrive/Documentos/Hola/Otros/Grunis', req.url === '/' ? '/inspect.html' : req.url);
    const ext = path.extname(filePath);
    const mimeTypes = { '.html': 'text/html', '.png': 'image/png', '.js': 'application/javascript', '.css': 'text/css' };
    const contentType = mimeTypes[ext] || 'text/plain';
    
    fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found: ' + filePath); return; }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(3999, async () => {
    console.log('Server running on http://localhost:3999');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1000 });
    await page.goto('http://localhost:3999/', { waitUntil: 'networkidle0', timeout: 10000 });
    await page.screenshot({ path: 'sprite_map.png', fullPage: true });
    console.log('Screenshot saved to sprite_map.png');
    await browser.close();
    server.close();
    process.exit(0);
});
