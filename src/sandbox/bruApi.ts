export class bru {
    static version = "0.1.0";

    // ejemplo de API básica
    static Request = class { constructor(public url: string, public opts?: RequestInit) { } };
    static Response = class { constructor(public status: number, public body: any) { } };

    /* …más helpers que quieras… */
    public main() {
        console.log("hello bruno!");
    }
}