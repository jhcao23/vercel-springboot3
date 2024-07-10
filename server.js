const { exec } = require('child_process');
const http = require('http');
const fs = require('fs');

const SPRING_BOOT_PORT = 8080;
const SPRING_BOOT_APP = './your-spring-boot-app';

let springBootProcess;

function startSpringBoot() {
  return new Promise((resolve, reject) => {
    console.log('Starting Spring Boot application...');
    console.log('Current directory:', process.cwd());
    console.log('Files in current directory:', fs.readdirSync('.').join(', '));

    if (!fs.existsSync(SPRING_BOOT_APP)) {
      console.error(`Error: ${SPRING_BOOT_APP} not found!`);
      return reject(new Error(`${SPRING_BOOT_APP} not found`));
    }

    console.log('File permissions:', fs.statSync(SPRING_BOOT_APP).mode.toString(8));

    // Make sure the file is executable
    fs.chmodSync(SPRING_BOOT_APP, '755');

    springBootProcess = exec(SPRING_BOOT_APP, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        reject(error);
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
    });
    
    springBootProcess.stdout.on('data', (data) => {
      console.log(`Spring Boot stdout: ${data}`);
      if (data.includes('Started')) {
        resolve();
      }
    });

    springBootProcess.stderr.on('data', (data) => {
      console.error(`Spring Boot stderr: ${data}`);
    });

    // Set a timeout in case the app doesn't start
    setTimeout(() => {
      reject(new Error('Spring Boot app failed to start in time'));
    }, 30000);
  });
}

module.exports = async (req, res) => {
  try {
    if (!springBootProcess) {
      await startSpringBoot();
    }

    const options = {
      hostname: 'localhost',
      port: SPRING_BOOT_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (error) => {
      console.error('Proxy request error:', error);
      res.statusCode = 500;
      res.end('Internal Server Error: Failed to proxy request to Spring Boot application');
    });

    req.pipe(proxyReq, { end: true });
  } catch (error) {
    console.error('Error:', error);
    res.statusCode = 500;
    res.end(`Internal Server Error: ${error.message}`);
  }
};
