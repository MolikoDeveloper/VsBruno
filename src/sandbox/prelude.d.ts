declare class bru {
    /** 
     * @custom current version of the extension itself. 
     */
    static version: string;

    /** 
     * returns the absolute path location.
     */
    static cwd(): string;

    /**
     * @todo
     * Pauses execution for the specified duration. 
     * This is useful for introducing delays or waiting for a 
     * specific amount of time before proceeding with the next operation.
     * @param ms time in miliseconds.
     * @example
     * await bru.sleep(3000); // <== sleeps 3 seconds
     */
    static sleep(ms: number): void;

    /**
     * @todo
     * To prevent the automatic parsing of the JSON response body and work directly with the raw data, 
     * you can use the expression below in the pre-request script of the request
     * @example
     * bru.disableParsingResponseJson();
     */
    static disableParsingResponseJson(): void;

    /**
     * @todo
     * Get the Node process environment variable. 
     * This allows secret token usage without committing secrets to version control.
     * @param envVar environment variable name
     * @example
     * // get {{secret_access_token}} variable
     * let secret_token = bru.getProcessEnv("secret_access_token");
     */
    static getProccessEnv(envVar: string): string;

    /**
     * Set the Bruno global environment variable.
     * @example
     * // set {{val}} value "vs-bruno"
     * bru.setGlobalEnvVar("val", "vs-bruno");
     */
    static setGlobalEnvVar(envVar: string, value: string): void;

    /**
     * Get the Bruno global environment variable.
     * @example
     * // get {{val}} value.
     * const AppName = bru.getGlobalEnvVar("val");
     */
    static getGlobalEnvVar(envVar: string): string;

    /**
     * Get the Bruno environment variable
     */
    static getEnvVar(envVar: string): string;

    /**
     * Set the Bruno environment variable
     */
    static setEnvVar(envVar, value): void;

    static runner: {
        /**
         * By default, the collection runner (UI), CLI and vscode execute requests in sequential order.
         * You can alter this order by invoking \`bru.runner.setNextRequest\` with the name of the next request to execute. 
         * 
         * This function is applicable only within post-request scripts or test scripts.
         */
        setNextRequest: () => void,
        /**
         * skip the execution of the current request,
         * use \`bru.runner.skipRequest()\` in the pre-request script section. 
         * 
         * This function is valid only within the context of a collection run.
         */
        skipRequest: () => void,
        /**
         * terminate the collection run by using \`bru.runner.stopExecution()\` in the pre-request scripts, 
         * post-request scripts, or the test scripts. 
         * 
         * This function is effective only within the context of a collection run.
         */
        stopExecution: () => void
    };

    static Render<P = unknown>(Element: React.ComponentType<P>, props?: P): React.ReactNode;
}

declare class req {
    static body: any;
    static method: string;
    static headers: Record<string, string>;
    static url: string;
    static timeout: number | undefined;

    script_body: any;
    script_method: string;
    script_headers: Record<string, string>;
    script_url: string;
    script_timeout: string;

    static setMethod(method: string): void;
    static getMethod(): string;

    static setBody(body: any): void;
    static getBody<T>(): T | any;

    static getUrl(): void;
    static setUrl(url: string): void;

    static getHeader(header: string): void;
    static getHeaders(): void;
    static setHeader(header: string): void;
    static setHeaders(headers: Record<string, string>): void;

    static setMaxRedirects(count: number): void;

    static getTimeout(): void;
    static setTimeout(ms: number): void;

    static getExecutionMode(): void;
    static getExecutionPlatform(): "vscode" | "app" | "cli";
}

declare class res {
    static body: any;
    static status: number;
    static statusText: string;

    static getStatus(): number;

    static getHeader(header: string): string;

    static getHeaders(): Record<string, string>;

    /**
     * Get the response data
     */
    static getBody(): any;

    /**
     * Get the response time in ms
     */
    static getResponseTime(): number;
}