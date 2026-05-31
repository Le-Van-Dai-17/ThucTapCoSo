const fs = require('fs');
const path = require('path');
const dir = 'D:/Thuc_tap_co_so/ThucTapCoSo/html-version/assets/js';

const walk = (d) => {
    fs.readdirSync(d).forEach(f => {
        const fp = path.join(d, f);
        if (fs.statSync(fp).isDirectory()) walk(fp);
        else if (fp.endsWith('.js')) {
            let content = fs.readFileSync(fp, 'utf8');
            let modified = false;
            // Matches alert('something')
            content = content.replace(/alert\('([^']+)'\)/g, (match, p1) => {
                modified = true;
                return 'showToast(\'' + p1 + '\', \'info\')';
            });
            // Matches alert("something")
            content = content.replace(/alert\("([^"]+)"\)/g, (match, p1) => {
                modified = true;
                return 'showToast("' + p1 + '", \'info\')';
            });
            // Matches alert(variable)
            content = content.replace(/alert\(([^)]+)\)/g, (match, p1) => {
                if(match.includes('showToast')) return match;
                modified = true;
                return 'showToast(' + p1 + ', \'info\')';
            });
            if (modified) fs.writeFileSync(fp, content, 'utf8');
        }
    });
};

walk(dir);
console.log('Done!');
