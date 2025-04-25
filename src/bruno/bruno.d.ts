/* ───────────────────────── Root ───────────────────────── */
export interface BruFile {
  meta?: BruMeta;
  http?: BruHttp;

  /* query / params / headers */
  query?: Record<string, string>;
  params?: {
    enabled: boolean;
    name: string,
    type: "query" | "path",
    value: string
  }[];
  headers?: {
    enabled: boolean,
    name: string,
    value: string
  }[];

  /* bodies */
  body?: BruBody;

  /* authentication blocks */
  auth?: BruAuth;

  /* variables & asserts */
  vars?: {
    preRequest?: Record<string, string>;
    postResponse?: Record<string, string>;
  };
  assert?: Record<string, string>;

  /* scripts, tests, docs */
  script?: {
    preRequest?: string;
    postResponse?: string;
  };
  tests?: string;
  docs?: string;

  /* any future blocks */
  [unknownBlock: string]: unknown;
}

/* ───────────────────── meta ───────────────────── */
export interface BruMeta {
  name: string;
  /** block category; Bruno currently uses "http" by default */
  type: string;
  /** parsed as string by the lib; cast to number if needed */
  seq: string;
}

/* ───────────────────── http ───────────────────── */
export type HttpMethod = | 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'connect' | 'trace';

export interface BruHttp {
  method: HttpMethod;
  url: string;
  body?: keyof BruBody;   // e.g. "json" | "multipartForm"
  auth?: keyof BruAuth;   // e.g. "bearer"
}

/* ───────────────────── auth ───────────────────── */
export interface AuthBearer { token: string; }
export interface AuthBasic { username: string; password: string; }
export interface AuthDigest { username: string; password: string; realm?: string; }
export interface AuthNTLM { username: string; password: string; domain?: string; workstation?: string; }
export interface AuthOAuth2 {
  grantType?: 'password' | 'authorization_code' | 'client_credentials';
  username?: string; password?: string;
  callbackUrl?: string; authorizationUrl?: string;
  accessTokenUrl?: string; refreshTokenUrl?: string;
  clientId?: string; clientSecret?: string;
  scope?: string; state?: string;
  pkce?: boolean;
  /** placement / prefixes / auto flags */
  credentialsPlacement?: 'body' | 'header' | 'query';
  credentialsId?: string;
  tokenPlacement?: 'header' | 'query';
  tokenHeaderPrefix?: string;
  tokenQueryKey?: string;
  autoFetchToken?: boolean;
  autoRefreshToken?: boolean;
}
export interface AuthApiKey { key: string; location: 'header' | 'query' | 'cookie'; name: string; }
export interface AuthAWSSigV4 { accessKey: string; secretKey: string; region: string; service: string; }
export interface AuthWsse { username: string; password: string; }
export type BruAuth = Partial<{
  mode: string;        // set by plain `auth { mode: <value> }`
  bearer: AuthBearer;
  basic: AuthBasic;
  digest: AuthDigest;
  ntlm: AuthNTLM;
  oauth2: AuthOAuth2;
  apikey: AuthApiKey;
  awsv4: AuthAWSSigV4;
  wsse: AuthWsse;
}>;

/* ───────────────────── body ───────────────────── */
export interface MultipartFormField {
  name: string;
  /** text → string,  file → absolute paths array (as emitted by Bruno) */
  value: string | string[];
  enabled: boolean;
  type: 'text' | 'file';
  contentType: string;
}

export type BruBody = Partial<{
  json: string;                      // body:json  (raw string)
  ldjson: string;
  text: string;                      // body:text
  xml: string;                      // body:xml
  sparql: string;                      // body:sparql
  graphql: string;                      // body:graphql
  graphqlVars: string;                      // body:graphql:vars
  formUrlEncoded: Record<string, string>;      // body:form-urlencoded
  multipartForm: MultipartFormField[];        // body:multipart-form
  file: { path: string };            // body:file  (single attachment)
}>;

/*────────────────────────── meta (collection) ───────────────────── */
export interface BruCollectionMeta {
  name: string;
  type: 'collection';             // Bruno parser hard-codes this
  /** still a string in the AST (seq is optional in collections) */
  seq?: string;
}

/*────────────────────────── shared helpers ─────────────────────────*/
export interface BruKeyValue {
  /** actual key without ~ prefix (always trimmed) */
  name: string;
  value: string;
  enabled: boolean;               // false ⇢ key was prefixed with '~'
}

export interface BruVar extends BruKeyValue {
  /** true ⇢ key was prefixed with '@' (local-only variable) */
  local: boolean;
}

/* ───────────────────── collection ───────────────────── */
export interface BruCollection {
  /** mandatory block according to Bruno semantics */
  meta: BruCollectionMeta;

  /** optional high-level blocks */
  auth?: BruAuth;
  query?: BruKeyValue[];
  headers?: BruKeyValue[];

  vars?: {
    /** variables set *before* the request (vars:pre-request) */
    req?: BruVar[];
    /** variables captured *after* the response (vars:post-response) */
    res?: BruVar[];
  };

  script?: {
    /** script:pre-request - JS code (outdented) */
    req?: string;
    /** script:post-response - JS code (outdented) */
    res?: string;
  };

  tests?: string;   // block “tests { … }”
  docs?: string;   // block “docs  { … }”

  /** any future/unknown blocks are still preserved */
  [unknownBlock: string]: unknown;
}