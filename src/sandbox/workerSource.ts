export const workerSource = /* js */ `
const cache = new Map();
self.onmessage = async (ev) => {
  const { id, msg } = ev.data;
  if (msg.type === "exec") {
    try {
      const result = await runModule(id, msg.entryRel, msg.code, msg.args);
      postMessage({ id, ok: true, data: result });
    } catch (err) {
      postMessage({ id, ok: false, err: String(err) });
    }
  } else if (msg.type === "code") {
    cache.set(msg.path, msg.code);
  }
};

async function runModule(id, relPath, code, args, baseDir = "/") {
  const absPath = baseDir + relPath;
  if (cache.has(absPath) === false) cache.set(absPath, code);

  const module = { exports: {} };
  const localRequire = async (rel) => {
    if (!rel.startsWith(".")) throw "Solo rutas relativas";
    const nextRel = rel.endsWith(".js") ? rel : rel + ".js";
    const nextAbs = absPath.replace(/[^/]+$/, "") + nextRel;
    if (cache.has(nextAbs) === false) {
      // Pedir al host
      postMessage({ id, request: { type: "file", path: nextAbs } });
      await new Promise(res => {
        const h = (e) => { if (e.data.id === id && e.data.msg?.type === "code" && e.data.msg.path === nextAbs) { self.removeEventListener("message", h); res(); } };
        self.addEventListener("message", h);
      });
    }
    const childCode = cache.get(nextAbs);
    return runModule(id, nextRel, childCode, args, absPath.replace(/[^/]+$/, ""));
  };

  const fn = new Function("module", "exports", "require", "args", "console", cache.get(absPath));
  await fn(module, module.exports, localRequire, args, sandboxConsole);


  return module.exports;
}

function sendLog(kind, args) {
  const line = "["+kind+"] " + args.map(a=>String(a)).join(" ");
  postMessage({ id, log: { kind, values: args } });
}

const sandboxConsole = {
  log:  (...a)=>sendLog("log",  a),
  warn: (...a)=>sendLog("warn", a),
  error:(...a)=>sendLog("err ", a),
  info: (...a)=>sendLog("info", a),
};
`;
