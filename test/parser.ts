import { parseBru, stringifyBru } from "../src/bruno/bruno";

const bruText = Bun.file("test/bruno/test.bru")

// 1) Parseamos
const blocks = parseBru(await bruText.text());

// 2) Modificamos en memoria (ejemplo)
blocks[0].data.name = 99; // Cambiamos seq a "99"

// 3) Generamos de nuevo
const nuevoBru = stringifyBru(blocks);

Bun.write("test/bru.json", JSON.stringify(blocks, null, 1))
