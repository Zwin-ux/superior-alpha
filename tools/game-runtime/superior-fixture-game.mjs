#!/usr/bin/env node

let tick = 0;

process.title = "SUPERIOR Fixture Cartridge";
process.stdout.write("SUPERIOR fixture cartridge online\n");

const interval = setInterval(() => {
  tick += 1;
  process.stdout.write(`fixture:${tick}:clay-cart-ready\n`);
}, 1000);

function shutdown() {
  clearInterval(interval);
  process.stdout.write("SUPERIOR fixture cartridge stopped\n");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
