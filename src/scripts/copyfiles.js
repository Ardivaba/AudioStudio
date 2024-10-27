import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import clipboard from 'clipboardy';
import ignore from 'ignore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadGitignore(dir) {
    const ig = ignore();
    try {
        const gitignorePath = path.join(dir, '.gitignore');
        const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
        ig.add(gitignoreContent);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.warn('Error reading .gitignore:', error);
        }
    }
    return ig;
}

async function getAllFiles(dir, ig, baseDir) {
    let files = new Set();
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);
        if (ig.ignores(relativePath)) continue;

        if (entry.isDirectory()) {
            const subFiles = await getAllFiles(fullPath, ig, baseDir);
            subFiles.forEach(file => files.add(file));
        } else {
            files.add(fullPath);
        }
    }
    return files;
}

async function fileContainsKeywords(filePath, keywords) {
    if (keywords.length === 0) return true;
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return keywords.every(keyword => content.includes(keyword));
    } catch (error) {
        console.warn(`Error reading file ${filePath}:`, error);
        return false;
    }
}

async function combineFiles(files, baseDir) {
    let combinedContent = '';
    for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        const relPath = path.relative(baseDir, file);
        combinedContent += `// ${relPath.replace(/\\/g, '/')}\n${content}\n\n`;
    }
    return combinedContent;
}

function parseArguments(args) {
    return args.map(arg => {
        // Remove surrounding quotes if present
        arg = arg.replace(/^(['"])(.*)\1$/, '$2');

        const isExclude = arg.startsWith('!');
        const actualArg = isExclude ? arg.slice(1) : arg;
        let type, value;

        if (actualArg.startsWith('.')) {
            type = 'extension';
            value = actualArg;
        } else if (actualArg.startsWith('file:')) {
            type = 'file';
            value = actualArg.slice(5);
        } else if (actualArg.startsWith('dir:')) {
            type = 'dir';
            value = actualArg.slice(4);
        } else if (actualArg.startsWith('contains:')) {
            type = 'contains';
            const match = actualArg.match(/contains:"([^"]*)"/);
            value = match ? match[1] : actualArg.slice(9);
        } else {
            type = 'unknown';
            value = actualArg;
        }

        return { type, value, isExclude };
    });
}

async function applyFilters(files, filters, baseDir) {
    let currentFiles = new Set();
    let hasIncludeFilter = false;

    // First pass: apply all include filters
    for (const filter of filters) {
        if (!filter.isExclude) {
            hasIncludeFilter = true;
            const matchingFiles = new Set();
            for (const file of files) {
                const relativePath = path.relative(baseDir, file);
                let matches = false;

                switch (filter.type) {
                    case 'extension':
                        matches = relativePath.endsWith(filter.value);
                        break;
                    case 'file':
                        matches = path.basename(file).toLowerCase().includes(filter.value.toLowerCase());
                        break;
                    case 'dir':
                        matches = relativePath.toLowerCase().includes(filter.value.toLowerCase());
                        break;
                    case 'contains':
                        matches = await fileContainsKeywords(file, [filter.value]);
                        break;
                }

                if (matches) matchingFiles.add(file);
            }
            currentFiles = new Set([...currentFiles, ...matchingFiles]);
        }
    }

    // If no include filters were applied, start with all files
    if (!hasIncludeFilter) {
        currentFiles = new Set(files);
    }

    // Second pass: apply all exclude filters
    for (const filter of filters) {
        if (filter.isExclude) {
            const filesToRemove = new Set();
            for (const file of currentFiles) {
                const relativePath = path.relative(baseDir, file);
                let matches = false;

                switch (filter.type) {
                    case 'extension':
                        matches = relativePath.endsWith(filter.value);
                        break;
                    case 'file':
                        matches = path.basename(file).toLowerCase().includes(filter.value.toLowerCase());
                        break;
                    case 'dir':
                        matches = relativePath.toLowerCase().includes(filter.value.toLowerCase());
                        break;
                    case 'contains':
                        matches = await fileContainsKeywords(file, [filter.value]);
                        break;
                }

                if (matches) filesToRemove.add(file);
            }
            currentFiles = new Set([...currentFiles].filter(file => !filesToRemove.has(file)));
        }
    }

    return currentFiles;
}

function displayUsageInstructions() {
    console.log('Usage: node filecollect.js [options]');
    console.log('\nOptions:');
    console.log('  .ext                    Include files with the specified extension (e.g., .js, .ts, .vue)');
    console.log('  !.ext                   Exclude files with the specified extension');
    console.log('  file:part               Include files with names containing the specified part (case-insensitive)');
    console.log('  !file:part              Exclude files with names containing the specified part');
    console.log('  dir:part                Include all files in directories whose path contains the specified part (case-insensitive)');
    console.log('  !dir:part               Exclude files in directories whose path contains the specified part');
    console.log('  contains:"keyword"      Include files containing the specified keyword or phrase');
    console.log('  !contains:"keyword"     Exclude files containing the specified keyword or phrase');
    console.log('\nNotes:');
    console.log('  - Filters are applied in the order they are specified.');
    console.log('  - Directory inclusions add files without removing previously included files.');
    console.log('  - Exclusion filters remove files from the current selection.');
    console.log('  - Non-exclusion filters after directory inclusions only add files, they don\'t remove any.');
    console.log('  - The contains filter is case-sensitive and requires exact matches.');
    console.log('\nImportant:');
    console.log('  When using exclusion filters (starting with !), you may need to escape them or use quotes');
    console.log('  to prevent shell interpretation. For example:');
    console.log('    npm run copyfiles -- dir:pages "!file:Sensor"');
    console.log('    npm run copyfiles -- dir:pages \\!file:Sensor');
    console.log('\nExamples:');
    console.log('  node filecollect.js dir:pages "!file:Sensor"');
    console.log('    # Includes all files in directories containing "pages", then excludes files with "Sensor" in the name');
    console.log('  node filecollect.js dir:src !.json');
    console.log('    # Includes all files in directories containing "src", then excludes .json files');
    console.log('  node filecollect.js .js "!file:test" dir:src "!contains:\\"TODO\\""');
    console.log('    # Includes .js files, excludes files with "test" in the name,');
    console.log('    # adds all files from "src" directories, then excludes files containing "TODO"');
    console.log('\nCombine and chain multiple options to create complex file selection criteria.');
}

async function main() {
    const filters = parseArguments(process.argv.slice(2));
    if (filters.length === 0) {
        displayUsageInstructions();
        return;
    }

    const projectDir = process.cwd();
    try {
        const ig = await loadGitignore(projectDir);
        const allFiles = await getAllFiles(projectDir, ig, projectDir);
        const matchingFiles = await applyFilters(allFiles, filters, projectDir);

        if (matchingFiles.size === 0) {
            console.log(`No files found matching the specified criteria.`);
            return;
        }

        const combinedContent = await combineFiles(matchingFiles, projectDir);
        await clipboard.write(combinedContent);

        console.log(`Combined ${matchingFiles.size} files matching the specified criteria and copied to clipboard.`);
        console.log('\nList of copied files (relative paths):');
        matchingFiles.forEach(file => {
            const relativePath = path.relative(projectDir, file);
            console.log(relativePath.replace(/\\/g, '/'));
        });
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

main();