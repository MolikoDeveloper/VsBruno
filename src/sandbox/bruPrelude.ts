export const bruPrelude = /* js */ `
(function(){
  const __queue__ = [];
  function __emit__(type, payload) {
    if (typeof globalThis.__bruOutbound === "function") {
      globalThis.__bruOutbound({ type, payload });
    } else {
      __queue__.push({ type, payload });
    }
  }
  class bru {
    static version = "0.1.0";
    static Request = class {
      constructor(url, opts){ this.url = url; this.opts = opts; }
      setBody(b){ __emit__("req.body", b); }
    };
    static Response = class {
      constructor(status, body){ this.status = status; this.body = body; }
    };
    static send(t, p){ __emit__(t, p); }
    static get(key){
      const id = crypto.randomUUID();
      __emit__("bru-get", { id, key });
      return new Promise(res => {
        function handler(evt){
          if(evt.type==="bru-get-result" && evt.payload.id===id){
            globalThis.removeEventListener("bru-host", handler);
            res(evt.payload.data);
          }
        }
        globalThis.addEventListener("bru-host", e=>handler(e.detail));
      });
    }
    static main(){ console.log("hello bruno!"); }
  }
  globalThis.bru = bru;
  globalThis.__bruQueued = __queue__;
})();
`;
