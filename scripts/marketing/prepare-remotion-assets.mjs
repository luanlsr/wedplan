import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const generatedScreenshots = path.join(root, 'marketing-output', 'screenshots');
const publicScreenshots = path.join(root, 'public', 'marketing', 'screenshots');

function copyDir(source, destination) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(destination, { recursive: true });

  for (const item of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, item.name);
    const destinationPath = path.join(destination, item.name);

    if (item.isDirectory()) {
      copyDir(sourcePath, destinationPath);
    } else if (item.isFile()) {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

copyDir(generatedScreenshots, publicScreenshots);
fs.mkdirSync(path.join(root, 'marketing-output', 'ads'), { recursive: true });

console.log('Marketing assets preparados para o Remotion.');
