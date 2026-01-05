import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const certsDir = join(projectRoot, 'certs');

async function generateCertificate() {
  try {
    await fs.mkdir(certsDir, { recursive: true });
    console.log('📁 Certs directory created');

    const command = `openssl req -x509 -newkey rsa:4096 -keyout ${certsDir}/key.pem -out ${certsDir}/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`;

    await new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      });
    });

    console.log('✅ Self-signed certificate generated successfully!');
    console.log(`   Key: ${certsDir}/key.pem`);
    console.log(`   Cert: ${certsDir}/cert.pem`);
    console.log('\n⚠️  Note: This is a self-signed certificate for development only.');
    console.log('   Your browser will show a security warning - this is expected.\n');
  } catch (error) {
    console.error('❌ Error generating certificate:', error.message);
    process.exit(1);
  }
}

generateCertificate();
