import { parseBru, stringifyBru } from "../src/bruno/bruno";

const bruText = `
meta {
  name: aaa
  type: http
  seq: 2
}

post {
  url: http://localhost:3001/api/product/edit?method=set
  body: json
  auth: none
}

params:query {
  method: set
}

body:json {
  {
    "userId": "inventory?",
    "itemId": "aaa"
  }
}

docs {
  # \`POST\` products
  
  ### description
   insert a single product throught the API.
  
  
  
  ### data body:
  \`\`\`ts
  //as multipart form
  {
    data: {
      brand: string;
      model_name: string;
      product_name: string;
      type: string;
    },
    image: File ;
  }
  \`\`\`
  
  ### returns
   details of the created product.
   
  ### return model:
  \`\`\`ts
  ProductResponse: {
    data?: {
      id: string,
      brand: string,
      model_name: string,
      product_name: string,
      type: string
    },
    status: {
      code: number,
      description: string
    }
  }
  \`\`\`
  
  ### endpoint
  
  endpoint        | method | auth?
  ----------------|--------|------
  \`/api/products\` | POST   | true
}

`;

// 1) Parseamos
const blocks = parseBru(bruText);

blocks.forEach(b => {
  console.log(b.blockName)
})
// 2) Modificamos en memoria (ejemplo)
blocks[0].data.name = 99; // Cambiamos seq a "99"

// 3) Generamos de nuevo
const nuevoBru = stringifyBru(blocks);

