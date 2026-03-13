import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir: string, callback: (path: string) => void) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

function fixDeepImports(filePath: string) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    // ONLY apply to files inside subdirectories of components/ (depth = 2)
    const normalizedPath = filePath.replace(/\\/g, '/');
    if (!normalizedPath.includes('/components/')) return;

    const parts = normalizedPath.split('/components/');
    if (parts.length < 2) return;

    const subPath = parts[1]; // e.g., 'reviews/ReviewDetailModal.tsx'
    const isSubFolder = subPath.includes('/'); // If it has a slash, it's in a subfolder

    if (!isSubFolder) return; // Ignore top-level components

    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // We moved from src/components/ to src/components/folder/
    // So anything imported as '../types/...' needs an extra '../' -> '../../types/...'
    const dirsToDeepen = ['types', 'contexts', 'services', 'hooks', 'config', 'mock', 'assets'];

    dirsToDeepen.forEach(dir => {
        // Regex matches from '../dir/...' and changes to '../../dir/...'
        const regex = new RegExp(`from\\s+['\"]\\.\\./${dir}`, 'g');
        if (regex.test(content)) {
            content = content.replace(regex, `from '../../${dir}`);
            changed = true;
        }
    });

    // Top level UI components might be imported as './ui/...' but now need '../ui/...'
    const regexUi = /from\s+['"]\.\/ui\//g;
    if (regexUi.test(content)) {
        content = content.replace(regexUi, `from '../ui/`);
        changed = true;
    }

    // Cross domain imports. E.g., a component in src/components/folder/ importing something from src/dashboard/organisms
    // Example: from '../../NotificationPanel' doesn't exist, it should be from '../NotificationPanel' or similar
    // Let's just fix the generic deep paths for now.

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Deepened imports in ${filePath}`);
    }
}

walkDir('./src/components', fixDeepImports);
