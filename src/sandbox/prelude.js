
// USE IT TO RUN COLLECTIONS!!!!  IF FALSE, STOP CURRENT.
globalThis.__SKIP__ = false; //return this value to VM
globalThis.__STOP_ALL__ = false; //return this value to VM
(function () {
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
  globalThis.__bruInbound = function (evt) {
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
    static version = "__VERSION__";

    static cwd() {
      return _cwd;
    }

    static sleep(ms) {

    }

    static disableParsingResponseJson() {

    }


    static getProccessEnv(envVar) {

    }

    /**
     * Set the Bruno global environment variable.
     */
    static setGlobalEnvVar(envVar, value) {

    }

    /**
     * Get the Bruno global environment variable.
     */
    static getGlobalEnvVar(envVar) {

    }

    /**
     * Get the Bruno environment variable
     */
    static getEnvVar(envVar) {

    }

    /**
     * Set the Bruno environment variable
     */
    static setEnvVar(envVar, value) {

    }

    /**
     * Get the collection variable
     */
    static getCollectionVar(envVar) {

    }

    /**
     * Get the folder variable
     */
    static getFolderVar(folderVar) {

    }
    /**
     * Get the runtime variable
     */
    static getVar(runtimeVar) {

    }

    /**
     * Set the runtime variable
     */
    static setVar(runtimeVar) {

    }

    /**
     * Delete the runtime variable
     */
    static deleteVar(runtimeVar) {

    }

    /**
     * By default, the collection runner (UI) and the CLI run requests in order. 
     * You can change the order by calling setNextRequest with the name of the next request to be run. This works only in a post-request script or test-script.
     * 
     * You can also abort the run by explicitly setting the next request to null:
     */
    static setNextRequest(request) {

    }

    /**
     * execute any request in the collection and retrieve the response directly within the script.
     * absolute basedir is current collection root location (if exists)
     */
    static async runRequest(request) {

    }

    /**
     * Collection runner utility functions
     */
    static runner = {
      setNextRequest: () => {

      },

      skipRequest: () => {
        if (!isPre) globalThis.__SKIP__ = true;
      },

      stopExecution: () => {
        if (!isPre) globalThis.__STOP_ALL__ = true;
      }
    }

    /**
     * Obtain the test results of a request by calling \`bru.getTestResults\` within test scripts.
     */
    static getTestResults() {

    }

    /**
     * Obtain the assertion results of a request by calling \`bru.getAssertionResults\` within test scripts.
     */
    static getAssertionResults() {

    }
  }

  class req {
    script_body = "";
    script_method = "";
    script_headers = {};
    script_url = "";
    script_timeout = "";

    static body = (function () {
      if (bruContent.http.body === "none" || bruContent.http.body === undefined) return undefined;
      switch (bruContent.http.body) {
        case "json":
          try {
            const json = JSON.parse(bruContent?.body[bruContent.http.body]);
            return json;
          }
          catch (err) {
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

    static setMethod(_method) {
      if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'CONNECT', 'TRACE'].includes(_method.toUpperCase())) {
        this.script_method = _method.toUpperCase()
      }
      else {
        throw "method " + _method.toUpperCase() + " does not exist"
      }
    }

    static getMethod() {
      return this.script_method || this.method
    }

    static setBody(_body) {
      if (typeof _body === string) this.script_body = JSON.parse(_body)
      this.script_body = _body
    }

    static getBody() {
      return this.script_body || this.body
    }

    static getUrl() {
      __emit__("req.url")
    }

    static setUrl(url) {
      __emit__("set.req.url", url)
    }

    static getHeader(header) {
      __emit__("req.header", header)
    }

    static getHeaders() {
      __emit__("req.headers")
    }

    static setHeader(header) {
      __emit__("set.req.header", header)
    }

    static setHeaders(headers) {
      __emit__("set.req.headers", headers)
    }

    static setMaxRedirects(count) {
      __emit__("set.req.max_redirects", count)
    }

    static getTimeout() {
      __emit__("req.timeout")
    }

    static setTimeout(ms) {
      __emit__("set.req.timeout", ms)
    }

    /**
     * Get the current active execution mode of the request.
     * runner: When the request is being executed as part of a collection run
     * standalone: When the request is being executed individually
     */
    static getExecutionMode() {
      __emit__("req.execution_mode")
    }
    /**
     * To prevent the automatic parsing of the JSON response body and work directly with the raw data, 
     * you can use the expression below in the pre-request script of the request.
     */
    static getExecutionPlatform() {
      return "vscode"
    }
  }

  class res {
    static body = args?.bruResponse?.body;
    static status = args?.bruResponse.status;
    static statusText = args?.bruResponse.statusText;

    static getStatus() {
      return this.status;
    }

    static getHeader(header) {
      const keys = Object.keys(args?.bruResponse?.headers || {})
      return keys.includes(header.toLowerCase()) ? args?.bruResponse?.headers[header.toLowerCase()] : undefined
    }

    static getHeaders() {
      return args?.bruResponse?.headers
    }

    /**
     * Get the response data
     */
    static getBody() {
      return args?.bruResponse?.body || undefined
    }

    /**
     * Get the response time in ms
     */
    static getResponseTime() {
      return args?.bruResponse.timems
    }
  }

  globalThis.bru = bru;
  globalThis.req = req;
  if (!isPre) globalThis.res = res;
  globalThis.__bruQueued = __queue__;

  /*delete globalThis.bruContent
  delete globalThis.args
  delete globalThis.__bruInbound
  delete globalThis.cwd*/
  isPre && delete globalThis.res
})()
