import jso from "./jso.json"


const map = jso.map((dd) => {
    return {
        label: dd.header,
        type: "property",
        info: dd.description,
        detail: dd.spec_href
    }
})

Bun.write("test/headers.json", JSON.stringify(map, null, 4))