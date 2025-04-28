export interface BrunoConfig {
    uri: string
    data: Data
}

export interface Data {
    version: string
    name: string
    type: string
    ignore: string[]
    presets: Presets
    proxy: Proxy
}

export interface Presets {
    requestType: string
    requestUrl: string
}

export interface Proxy {
    bypassProxy: string
    enabled: boolean
    auth: Auth
    port: any
    hostname: string
    protocol: string
}

export interface Auth {
    enabled: boolean
    username: string
    password: string
}
