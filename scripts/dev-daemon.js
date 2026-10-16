// Daemonize the Next dev server: double-fork via detached spawn, stdio to dev.log
const { spawn } = require("child_process");
const fs = require("fs");

const out = fs.openSync("/home/z/my-project/dev.log", "a");
const child = spawn("/home/z/my-project/node_modules/.bin/next", ["dev", "-p", "3000"], {
  cwd: "/home/z/my-project",
  detached: true,
  stdio: ["ignore", out, out],
  env: { ...process.env, FORCE_COLOR: "0" },
});
child.unref();
console.log("spawned next dev pid:", child.pid);
