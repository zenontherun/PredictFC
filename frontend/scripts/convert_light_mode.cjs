const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const map = {
  // Backgrounds
  'background: "#0b0f14"': 'background: "transparent"',
  'background: "#161b22"': 'background: "rgba(255, 255, 255, 0.9)"',
  'background: "linear-gradient(135deg, #161b22, #0d1117)"': 'background: "rgba(255, 255, 255, 0.95)"',
  'background: "linear-gradient(180deg, rgba(22, 27, 34, 0.9) 0%, rgba(13, 17, 23, 0.95) 100%)"': 'background: "rgba(255, 255, 255, 0.9)"',
  'background: "#010409"': 'background: "#f8fafc"',
  
  // Borders
  'border: "1px solid #30363d"': 'border: "1px solid #e2e8f0"',
  'border: "1px solid #484f58"': 'border: "1px solid #cbd5e1"',
  'borderColor: "#30363d"': 'borderColor: "#e2e8f0"',
  'borderColor = "#484f58"': 'borderColor = "#cbd5e1"',
  
  // Text Colors
  'color: "#fff"': 'color: "#0f172a"',
  'color: "#8b949e"': 'color: "#64748b"',
  'color: "#e6edf3"': 'color: "#475569"',
  
  // Button text fix
  'color: "#0b0f14"': 'color: "#ffffff"',
  
  // Box shadows
  'box-shadow: 0 8px 32px rgba(0,0,0,0.4)': 'box-shadow: 0 8px 32px rgba(0,0,0,0.08)',
  'boxShadow: "0 8px 32px rgba(0,0,0,0.5)"': 'boxShadow: "0 8px 32px rgba(0,0,0,0.1)"'
};

for (const [oldStr, newStr] of Object.entries(map)) {
  content = content.split(oldStr).join(newStr);
}

// Fix styles block
content = content.replace(/color: #fff;/g, 'color: #0f172a;')
  .replace(/color: #0b0f14;/g, 'color: #ffffff;')
  .replace(/background: #010409;/g, 'background: #f8fafc;')
  .replace(/border: 1px solid #484f58;/g, 'border: 1px solid #cbd5e1;')
  .replace(/background: #0b0f14;/g, 'background: #ffffff;')
  .replace(/border-color: #30363d;/g, 'border-color: #e2e8f0;');

fs.writeFileSync('src/App.jsx', content);
console.log('Done');
