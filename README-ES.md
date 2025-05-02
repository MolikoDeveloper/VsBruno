# VS-Bruno

**VS-Bruno** es una extensión para Visual Studio Code que ofrece una interfaz gráfica para archivos `.bru`, utilizados por [Bruno](https://usebruno.com/), un cliente HTTP de código abierto. Permite visualizar y editar fácilmente definiciones de API directamente dentro del editor, con una interfaz amigable y editable.

![UI Bruno](./assets/screenshot-1.png) <!-- Opcional: Agrega un screenshot -->

## ✨ Funcionalidades

- 🔍 Interfaz visual para archivos `.bru`
- 📝 Edición de métodos, URL, parámetros y cuerpo
- 🔄 Sincronización con el archivo `.bru` original
- ⌨️ Modo texto con F7

## 🧠 Cómo usar

1. Abre un archivo `.bru` en VSCode.
2. Se mostrará automáticamente una interfaz gráfica personalizada.
3. Presiona `F7` para cambiar a la vista de texto plano.

## 🛠️ Tecnologías

Construido con:
- React + TailwindCSS
- TypeScript + Bun + ESBuild
- API de editores personalizados de VSCode
