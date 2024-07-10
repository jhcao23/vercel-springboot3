const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
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

// Middleware to start Spring Boot before handling any requests
app.use(async (req, res, next) => {
  if (!springBootProcess) {
    try {
      await startSpringBoot();
    } catch (error) {
      console.error('Failed to start Spring Boot:', error);
      return res.status(500).send('Failed to start Spring Boot application');
    }
  }
  next();
});

// Proxy middleware
app.use('/', createProxyMiddleware({
  target: `http://localhost:${SPRING_BOOT_PORT}`,
  changeOrigin: true,
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error occurred');
  }
}));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// For Vercel, we need to export a function that starts our server
module.exports = app;

// If running locally, listen on a port
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
