fetch("http://localhost:9005/api/posts", {
    'method': "POST",
    'body': JSON.stringify({
        "nombre": "Alberto Arriagada"
    })
}).then(d => {
    if (d.ok)
        return d.json();
}).then(text => {
    console.log(text)
})