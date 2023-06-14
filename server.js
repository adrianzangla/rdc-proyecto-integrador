const http = require('http');
const https = require('https');
const fs = require('fs');
const qs = require('querystring');

const write = async (filename, data, encoding) => {
    try {
        await fs.promises.writeFile(filename, data, encoding);
    } catch (err) {
        throw err;
    }
};

const read = async (filename, encoding) => {
    if (!fs.existsSync(filename)) {
        throw new Error('File not found');
    }
    try {
        const data = await fs.promises.readFile(filename, encoding);
        return data;
    } catch (err) {
        throw err;
    }
};

const post = async (req, res) => {
    try {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        await new Promise((resolve, reject) => {
            req.on('end', resolve);
            req.on('error', reject);
        });

        const data = qs.parse(body);
        const email = data['email'];
        const team = data['team'];

        const file = await read('data/emails.json', 'utf-8');
        const emails = JSON.parse(file);

        if (emails[email]) {
            res.writeHead(409);
            res.end("E-mail repetido");
            return;
        }

        emails[email] = true;

        const teamsFile = await read('data/teams.json', 'utf-8');
        const teams = JSON.parse(teamsFile);

        teams[team] += 1;

        write('data/teams.json', JSON.stringify(teams), 'utf-8');
        write('data/emails.json', JSON.stringify(emails), 'utf-8');

        res.writeHead(303, { 'Location': '/' });
        res.end();

    } catch (error) {
        console.error('Error:', error);
        res.writeHead(500);
        res.end();
    }
};

function removeLeadingAndTrailingSlashes(url) {
    while (url.startsWith('/')) {
        url = url.slice(1);
    }

    while (url.endsWith('/')) {
        url = url.slice(0, -1);
    }

    return url;
}


const get = async (req, res) => {
    let filePath = removeLeadingAndTrailingSlashes(req.url);
    if (filePath === '') {
        filePath = 'index.html';
    }
    try {
        let encoding;
        if (filePath.endsWith('.html')) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            encoding = 'utf-8';
        }
        if (filePath.endsWith('.json')) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            encoding = 'utf-8';
        }
        if (filePath.endsWith('.png')) {
            res.writeHead(200, { 'Content-Type': 'image/png' });
            encoding = null;
        }
        const file = await read(filePath, encoding);
        res.end(file);
    } catch (error) {
        console.error('Error:', error);
        res.writeHead(500);
        res.end();
    }
};

const route = (req, res) => {
    switch (req.method) {
        case 'GET':
            get(req, res);
            break;
        case 'POST':
            post(req, res);
            break;
        default:
            res.writeHead(405);
            break;
    }
}

try {
    if (!fs.existsSync('data/emails.json')) {
        fs.promises.writeFile('data/emails.json', JSON.stringify({}), 'utf-8');
    }

    if (!fs.existsSync('data/teams.json')) {
        fs.promises.writeFile('data/teams.json', JSON.stringify({
            boca: 0,
            river: 0,
            sanlo: 0,
            racing: 0,
            indep: 0
        }), 'utf-8');
    }
} catch (error) {
    console.log('Error:', error);
    return;
}

const httpServer = http.createServer(route);
httpServer.listen(80, () => {
    console.log('HTTP server running on port 80');
});

const options = {
    key: fs.readFileSync('key/key.key'),
    cert: fs.readFileSync('certificate/certificate.crt')
};

const httpsServer = https.createServer(options, route);
httpsServer.listen(443, () => {
    console.log('HTTPS server running on port 443');
});