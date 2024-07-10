const https = require('https');
const fs = require('fs');

const url = process.env.SPRING_BOOT_APP_URL; // You'll set this in Vercel
const outputPath = './your-spring-boot-app';

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (error) => {
      fs.unlink(outputPath, () => reject(error));
    });
  });
}

async function main() {
  if (!url) {
    console.error('SPRING_BOOT_APP_URL environment variable is not set');
    process.exit(1);
  }

  try {
    await downloadFile(url, outputPath);
    console.log('Spring Boot app downloaded successfully');
    // Make the file executable
    fs.chmodSync(outputPath, '755');
    console.log('Made Spring Boot app executable');
  } catch (error) {
    console.error('Error downloading Spring Boot app:', error);
    process.exit(1);
  }
}

main();
