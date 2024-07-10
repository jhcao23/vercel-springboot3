const { exec } = require('child_process');
const http = require('http');
const httpProxy = require('http-proxy');

const SPRING_BOOT_PORT = 8080; // Assuming Spring Boot uses port 8080

// Start the Spring Boot application
const springBootProcess = exec('./your-spring-boot-app');

springBootProcess.stdout.on('data', (data) => {
  console.log(`Spring Boot stdout: ${data}`);
});

springBootProcess.stderr.on('data', (data) => {
  console.error(`Spring Boot stderr: ${data}`);
});

// Create a proxy server
const proxy = httpProxy.createProxyServer({});

// Create a simple HTTP server to proxy requests to Spring Boot
const server = http.createServer((req, res) => {
  // Proxy the request to your Spring Boot app
  proxy.web(req, res, { target: `http://localhost:${SPRING_BOOT_PORT}` });
});

server.listen(3000, () => {
  console.log('Node.js proxy server running on port 3000');
});
