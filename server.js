const { exec } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SPRING_BOOT_PORT = 8080;
const SPRING_BOOT_APP = './your-spring-boot-app';

let springBootProcess;

function startSpringBoot() {
  if (!springBootProcess) {
    console.log('Starting Spring Boot application...');
    console.log('Current directory:', process.cwd());
    console.log('Files in current directory:', fs.readdirSync('.').join(', '));

    if (!fs.existsSync(SPRING_BOOT_APP)) {
      console.error(`Error: ${SPRING_BOOT_APP} not found!`);
      return Promise.reject(new Error(`${SPRING_BOOT_APP} not found`));
    }

    // Make sure the file is executable
    fs.chmodSync(SPRING_BOOT_APP, '755');

    springBootProcess = exec(SPRING_BOOT_APP, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
    });
    
    springBootProcess.stdout.on('data', (data) => {
      console.log(`Spring Boot stdout: ${data}`);
    });

    springBootProcess.stderr.on('data', (data) => {
      console.error(`Spring Boot stderr: ${data}`);
    });

    return new Promise((resolve) => setTimeout(resolve, 10000)); // Increased timeout to 10 seconds
  }
  return Promise.resolve();
}

module.exports = async (req, res) => {
  try {
    await startSpringBoot();

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
    console.error('Error starting Spring Boot:', error);
    res.statusCode = 500;
    res.end('Internal Server Error: Failed to start Spring Boot application');
  }
};
