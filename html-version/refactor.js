const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const assetsDir = path.join(rootDir, 'assets');
const cssDir = path.join(assetsDir, 'css');
const jsDir = path.join(assetsDir, 'js');
const componentsDir = path.join(jsDir, 'components');
const jsPagesDir = path.join(jsDir, 'pages');
const pagesDir = path.join(rootDir, 'pages');

// 1. Create Directories
[assetsDir, cssDir, jsDir, componentsDir, jsPagesDir, pagesDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 2. Read layout-template.html to extract Sidebar and Header
const layoutHtml = fs.readFileSync(path.join(rootDir, 'layout-template.html'), 'utf8');
const sidebarStart = layoutHtml.indexOf('<!-- Sidebar -->');
const headerEnd = layoutHtml.indexOf('</header>') + '</header>'.length;
const layoutContents = layoutHtml.substring(sidebarStart, headerEnd);

const layoutJsContent = "const layoutHtml = `" + layoutContents.replace(/`/g, '\\\\`') + "`;\\n" +
`
document.addEventListener('DOMContentLoaded', () => {
    const wrapper = document.querySelector('.size-full');
    if (wrapper) {
        wrapper.insertAdjacentHTML('afterbegin', layoutHtml);
        
        // Highlight active link
        const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
        const navLinks = document.querySelectorAll('aside nav a');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPath) {
                // Remove normal classes
                link.classList.remove('text-gray-700', 'hover:bg-gray-100');
                // Add active classes
                link.classList.add('bg-[#2563EB]/10', 'text-[#2563EB]');
            } else {
                // If it had active classes, remove them and add normal ones
                link.classList.remove('bg-[#2563EB]/10', 'text-[#2563EB]');
                link.classList.add('text-gray-700', 'hover:bg-gray-100');
            }
        });
    }
    
    // Initialize icons if lucide is available
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});
`;
fs.writeFileSync(path.join(componentsDir, 'layout.js'), layoutJsContent);

// 3. Move JS files
const oldJsDir = path.join(rootDir, 'js');
if (fs.existsSync(oldJsDir)) {
    const jsFiles = fs.readdirSync(oldJsDir);
    jsFiles.forEach(file => {
        if (file.endsWith('.js')) {
            fs.renameSync(path.join(oldJsDir, file), path.join(jsPagesDir, file));
        }
    });
}

// 4. Process HTML Files
const htmlFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.html'));

htmlFiles.forEach(file => {
    let content = fs.readFileSync(path.join(rootDir, file), 'utf8');
    
    if (file === 'login.html') {
        content = content.replace('src="js/login.js"', 'src="../assets/js/pages/login.js"');
        fs.writeFileSync(path.join(pagesDir, file), content);
        fs.unlinkSync(path.join(rootDir, file));
        return;
    }

    // Strip Sidebar and Header
    const sideStart = content.indexOf('<!-- Sidebar -->');
    let headEnd = content.indexOf('</header>');
    if (headEnd !== -1) {
        headEnd += '</header>'.length;
    }

    if (sideStart !== -1 && headEnd !== -1) {
        content = content.substring(0, sideStart) + content.substring(headEnd);
    }
    
    // Add layout.js script at the end
    if(content.indexOf('</body>') !== -1) {
        content = content.replace('</body>', '    <script src="../assets/js/components/layout.js"></script>\n</body>');
    }

    // Update JS paths for pages
    content = content.replace(/src="js\//g, 'src="../assets/js/pages/');

    fs.writeFileSync(path.join(pagesDir, file), content);
    fs.unlinkSync(path.join(rootDir, file));
});

// 5. Create index.html at root
const indexHtmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="0; url=pages/dashboard.html">
    <title>Redirecting...</title>
</head>
<body>
    <p>If you are not redirected, <a href="pages/dashboard.html">click here</a>.</p>
</body>
</html>
`;
fs.writeFileSync(path.join(rootDir, 'index.html'), indexHtmlContent);

console.log("Refactoring complete");
