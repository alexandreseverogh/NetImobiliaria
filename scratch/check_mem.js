const { execSync } = require('child_process');

try {
  const output = execSync('wmic process get processid,caption,workingSetSize,commandline').toString();
  const lines = output.split('\n');
  const procs = [];
  for (let line of lines) {
    if (!line.trim()) continue;
    if (line.startsWith('CommandLine')) continue;
    // extract process info
    const match = line.match(/(.*)\s+(\d+)\s+(\d+)\s*$/);
    if (match) {
      const cmd = match[1].trim();
      const pid = match[2];
      const memBytes = parseInt(match[3], 10);
      const memMB = (memBytes / 1024 / 1024).toFixed(1);
      if (memBytes > 50 * 1024 * 1024) { // > 50MB
        procs.push({ pid, memMB: parseFloat(memMB), cmd: cmd.substring(0, 120) });
      }
    }
  }
  procs.sort((a, b) => b.memMB - a.memMB);
  console.log('Top Memory Consuming Processes (>50MB):');
  console.table(procs.slice(0, 20));
} catch (e) {
  console.error(e);
}
