var fs = require('fs');

const version = JSON.parse(fs.readFileSync('module.json', 'utf8')).version;

var mod = JSON.parse(fs.readFileSync('template.json', 'utf8'));

mod.version = version;
mod.download = `https://github.com/MemelyPepeartly/ponyfinder-foundryvtt-module/releases/download/${version}/ponyfinder-foundryvtt-module.zip`;

console.log(JSON.stringify(mod));