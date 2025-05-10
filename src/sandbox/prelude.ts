export const prelude = /* js */ `
(function(){
  
  const _cwd = cwd; 
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
      return _cwd;
    }
  }

  class req {
    script_body = "";
    script_method = "";
    script_headers = {};
    script_url = "";
    script_timeout = "";

    static body = (function() {
      if(bruContent.http.body === "none" || bruContent.http.body === undefined) return undefined;
      switch (bruContent.http.body) {
        case "json":
          try{
            const json = JSON.parse(bruContent?.body[bruContent.http.body]);
            return json;
          }
          catch(err){
            console.error(err.message);
          }
          break;
      
        default:
          bruContent?.body[bruContent.http.body]
          break;
      }
    })();

    static method = bruContent.http.method.toUpperCase();
    static headers = bruContent.headers;
    static url = bruContent.http.url;
    static timeout = undefined

    static setMethod(_method){
      if(['GET','POST','PUT','DELETE','PATCH','OPTIONS','HEAD','CONNECT','TRACE'].includes(_method.toUpperCase())){
        this.script_method = _method.toUpperCase()
      }
      else{
        throw "method " + _method.toUpperCase() + " does not exist"
      }
    }

    static getMethod(){
      return this.script_method || this.method
    }

    static setBody(_body){
      if(typeof _body === string) this.script_body = JSON.parse(_body)
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
  if(!isPre) globalThis.res = res;
  globalThis.__bruQueued = __queue__;

  delete globalThis.bruContent
  delete globalThis.args
  delete globalThis.__bruInbound
  delete globalThis.cwd
  isPre && delete globalThis.res
})();
`;
