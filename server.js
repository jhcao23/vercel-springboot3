const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { exec } = require('child_process');
const fs = require('fs');
const https = require('https');

const app = express();
const SPRING_BOOT_PORT = 8080;
const SPRING_BOOT_APP = './your-spring-boot-app';
const SPRING_BOOT_APP_URL = process.env.SPRING_BOOT_APP_URL;

let springBootProcess;

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading file from ${url} to ${outputPath}`);
    const file = fs.createWriteStream(outputPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          console.log('Download completed');
          resolve();
        });
      });
    }).on('error', (error) => {
      fs.unlink(outputPath, () => reject(error));
    });
  });
}

async function ensureSpringBootApp() {
  if (!fs.existsSync(SPRING_BOOT_APP)) {
    if (!SPRING_BOOT_APP_URL) {
      throw new Error('SPRING_BOOT_APP_URL environment variable is not set');
    }
    await downloadFile(SPRING_BOOT_APP_URL, SPRING_BOOT_APP);
    fs.chmodSync(SPRING_BOOT_APP, '755');
    console.log('Made Spring Boot app executable');
  }
}

function startSpringBoot() {
  return new Promise((resolve, reject) => {
    console.log('Starting Spring Boot application...');
    console.log('Current directory:', process.cwd());
    console.log('Files in current directory:', fs.readdirSync('.').join(', '));

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

// Middleware to ensure Spring Boot app is present and started before handling any requests
app.use(async (req, res, next) => {
  if (!springBootProcess) {
    try {
      await ensureSpringBootApp();
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