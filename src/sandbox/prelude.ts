export const prelude = /* js */ `
(function(){
  // Queue outgoing events until host is ready
  const __queue__ = [];
  // Simple event listener registry for incoming events
  const __listeners__ = {};

  function __emit__(type, payload) {
    const evt = { type, payload };
    if (typeof globalThis.__bruOutbound === "function") {
      globalThis.__bruOutbound(evt);
    } else {
      __queue__.push(evt);
    }
  }

  function __on__(type, handler) {
    (__listeners__[type] = __listeners__[type] || []).push(handler);
  }

  // Called by host to deliver inbound events into the sandbox
  globalThis.__bruInbound = function(evt) {
    const handlers = __listeners__[evt.type] || [];
    handlers.forEach(h => {
      try { h(evt.payload); }
      catch (e) { /* swallow errors */ }
    });
  };

  // Minimal UUID generator (no require or crypto)
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  class bru {
    static version = "0.1.0";

    static Response = class {
      constructor(status, body) {
        this.status = status;
        this.body = body;
      }
    };

    static send(type, payload) {
      __emit__(type, payload);
    }

    static get(key) {
      const id = uuid();
      __emit__("bru-get", { id, key });
      return new Promise(resolve => {
        __on__("bru-get-result", result => {
          if (result.id === id) {
            resolve(result.data);
          }
        });
      });
    }
  }

  class req {
    static setBody(body){
      __emit__("set.req.body", body);
    }

    static getBody(body){
      __emit__("req.body");
    }

    static getUrl(){
      __emit__("req.url")
    }

    static setUrl(url){
      __emit__("set.req.url", url)
    }

    static getMethod(){
      return bru.get("req.method")
    }

    static setMethod(method){
      __emit__("set.req.method", method);
    }

    static getHeader(header){
      __emit__("req.header", header)
    }

    static getHeaders(){
      __emit__("req.headers")
    }

    static setHeader(header){
      __emit__("set.req.header", header)
    }

    static setHeaders(headers){
      __emit__("set.req.headers", headers)
    }

    static setMaxRedirects(count){
      __emit__("set.req.max_redirects", count)
    }
     
    static getTimeout(){
      __emit__("req.timeout")
    }

    static setTimeout(ms){
      __emit__("set.req.timeout", ms)
    }

    /**
     * Get the current active execution mode of the request.
     * runner: When the request is being executed as part of a collection run
     * standalone: When the request is being executed individually
     */
    static getExecutionMode(){
      __emit__("req.execution_mode")
    }

    static method = this.getMethod()
  }

  globalThis.bru = bru;
  globalThis.req = req;
  globalThis.__bruQueued = __queue__;
})();
`;
