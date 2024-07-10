const { exec } = require('child_process');
const http = require('http');

const SPRING_BOOT_PORT = 8080; // Assuming Spring Boot uses port 8080

let springBootProcess;

function startSpringBoot() {
  if (!springBootProcess) {
    springBootProcess = exec('./your-spring-boot-app');
    
    springBootProcess.stdout.on('data', (data) => {
      console.log(`Spring Boot stdout: ${data}`);
    });

    springBootProcess.stderr.on('data', (data) => {
      console.error(`Spring Boot stderr: ${data}`);
    });

    // Give Spring Boot some time to start up
    return new Promise((resolve) => setTimeout(resolve, 5000));
  }
  return Promise.resolve();
}

module.exports = async (req, res) => {
  await startSpringBoot();

  // Forward the request to Spring Boot
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

  req.pipe(proxyReq, { end: true });
};
