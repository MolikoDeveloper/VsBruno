export const prelude = /* js */ `
(function(){
  globalThis.bruContent = ___BRU_CONTENT___;
  globalThis.cwd = ___cwd___;
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

  function get(key) {
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

  class bru {
    static version = "0.1.0";

    static cwd(){
      return cwd;
    }
  }

  class req {
    script_body = "";
    script_method = "";
    script_headers = {};
    script_url = "";
    script_timeout = "";


    static body = bruContent.body[bruContent.http.body];
    static method = bruContent.http.method.toUpperCase();

    static setMethod(_method){
      this.script_method = _method.toUpperCase()
    }

    static getMethod(){
      return this.script_method || this.method
    }

    static setBody(_body){
      this.script_body = _body
    }

    static getBody(){
      return this.script_body || this.body
    }

    static getUrl(){
      __emit__("req.url")
    }

    static setUrl(url){
      __emit__("set.req.url", url)
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

    static getExecutionPlatform(){
      return "vscode"
    }

  }

  class res {
    static body = args?.bruResponse?.body || null
  }

  globalThis.bru = bru;
  globalThis.req = req;
  globalThis.res = res;
  globalThis.__bruQueued = __queue__;
})();
`;
