const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envConfig[key.trim()] = value.trim();
    }
});

const pool = new Pool({
    user: envConfig.DB_USER,
    host: envConfig.DB_HOST,
    database: envConfig.DB_NAME,
    password: envConfig.DB_PASSWORD,
    port: parseInt(envConfig.DB_PORT || '5432'),
});

async function listSidebar() {
    try {
        const res = await pool.query('SELECT id, parent_id, name, url, order_index, system_id, permission_required FROM sidebar_menu_items ORDER BY order_index ASC');
        const items = res.rows;
        
        const buildTree = (parentId) => {
            return items
                .filter(item => item.parent_id == parentId)
                .sort((a, b) => a.order_index - b.order_index)
                .map(item => ({
                    ...item,
                    children: buildTree(item.id)
                }));
        };

        const tree = buildTree(null);
        
        function printTree(nodes, indent = '') {
            nodes.forEach(node => {
                console.log(`${indent}${node.name} [ID: ${node.id}] (URL: ${node.url}) (Perm: ${node.permission_required})`);
                if (node.children && node.children.length > 0) {
                    printTree(node.children, indent + '  └── ');
                }
            });
        }

        printTree(tree);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

listSidebar();
