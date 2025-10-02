module.exports = [
"[turbopack-node]/transforms/postcss.ts { CONFIG => \"[project]/Doan/my-todo-list-app/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "build/chunks/b18ec_41f1408d._.js",
  "build/chunks/[root-of-the-server]__b1eb0fa6._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[turbopack-node]/transforms/postcss.ts { CONFIG => \"[project]/Doan/my-todo-list-app/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript)");
    });
});
}),
];