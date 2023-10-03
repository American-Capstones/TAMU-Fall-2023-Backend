"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "main";
exports.ids = null;
exports.modules = {

/***/ "./src/service/router.ts":
/*!*******************************!*\
  !*** ./src/service/router.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   createRouter: () => (/* binding */ createRouter)\n/* harmony export */ });\n/* harmony import */ var _backstage_backend_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @backstage/backend-common */ \"@backstage/backend-common\");\n/* harmony import */ var _backstage_backend_common__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_backstage_backend_common__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var express__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! express */ \"express\");\n/* harmony import */ var express__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(express__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var express_promise_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! express-promise-router */ \"express-promise-router\");\n/* harmony import */ var express_promise_router__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(express_promise_router__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _octokit_graphql__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @octokit/graphql */ \"@octokit/graphql\");\n/* harmony import */ var _octokit_graphql__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_octokit_graphql__WEBPACK_IMPORTED_MODULE_3__);\n\n\n\n\nasync function createRouter(options) {\n    const { logger } = options;\n    const router = express_promise_router__WEBPACK_IMPORTED_MODULE_2___default()();\n    router.use(express__WEBPACK_IMPORTED_MODULE_1___default().json());\n    router.get('/health', (_, response)=>{\n        logger.info('PONG!');\n        response.json({\n            status: 'ok'\n        });\n    });\n    router.get('/pokemon/:pokemonName', async (request, response)=>{\n        const { pokemonName } = request.params;\n        const result = await (0,_octokit_graphql__WEBPACK_IMPORTED_MODULE_3__.graphql)(`\n        query pokemon_details {\n          species: pokemon_v2_pokemonspecies(where: { name: { _eq: ${pokemonName} } }) {\n            name\n            base_happiness\n            is_legendary\n            is_mythical\n          }\n        }\n      `, {\n            operationName: 'pokemon_details'\n        });\n        response.json({\n            result\n        });\n    });\n    router.use((0,_backstage_backend_common__WEBPACK_IMPORTED_MODULE_0__.errorHandler)());\n    return router;\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvc2VydmljZS9yb3V0ZXIudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBRUE7QUFNQTtBQUNBO0FBRUE7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUFBO0FBQUE7QUFDQTtBQUVBO0FBQ0E7QUFDQTs7QUFHQTs7Ozs7OztBQU9BO0FBQ0E7QUFBQTtBQUVBO0FBQUE7QUFBQTtBQUNBO0FBRUE7QUFDQTtBQUNBIiwic291cmNlcyI6WyJmaWxlOi8vLy9Vc2Vycy9hYTI4NTU4MS9EZXNrdG9wL2Rldi9UQU1VLUZhbGwtMjAyMy1CYWNrZW5kL3NyYy9zZXJ2aWNlL3JvdXRlci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBlcnJvckhhbmRsZXIgfSBmcm9tICdAYmFja3N0YWdlL2JhY2tlbmQtY29tbW9uJztcbmltcG9ydCBleHByZXNzIGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IFJvdXRlciBmcm9tICdleHByZXNzLXByb21pc2Utcm91dGVyJztcbmltcG9ydCB7IExvZ2dlciB9IGZyb20gJ3dpbnN0b24nO1xuaW1wb3J0IHsgZ3JhcGhxbCB9IGZyb20gJ0BvY3Rva2l0L2dyYXBocWwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJvdXRlck9wdGlvbnMge1xuICBsb2dnZXI6IExvZ2dlcjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVJvdXRlcihvcHRpb25zOiBSb3V0ZXJPcHRpb25zKTogUHJvbWlzZTxleHByZXNzLlJvdXRlcj4ge1xuICBjb25zdCB7IGxvZ2dlciB9ID0gb3B0aW9ucztcblxuICBjb25zdCByb3V0ZXIgPSBSb3V0ZXIoKTtcbiAgcm91dGVyLnVzZShleHByZXNzLmpzb24oKSk7XG5cbiAgcm91dGVyLmdldCgnL2hlYWx0aCcsIChfLCByZXNwb25zZSkgPT4ge1xuICAgIGxvZ2dlci5pbmZvKCdQT05HIScpO1xuICAgIHJlc3BvbnNlLmpzb24oeyBzdGF0dXM6ICdvaycgfSk7XG4gIH0pO1xuXG4gIHJvdXRlci5nZXQoJy9wb2tlbW9uLzpwb2tlbW9uTmFtZScsIGFzeW5jIChyZXF1ZXN0LCByZXNwb25zZSkgPT4ge1xuICAgIGNvbnN0IHsgcG9rZW1vbk5hbWUgfSA9IHJlcXVlc3QucGFyYW1zO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdyYXBocWw8YW55PihcbiAgICAgIGBcbiAgICAgICAgcXVlcnkgcG9rZW1vbl9kZXRhaWxzIHtcbiAgICAgICAgICBzcGVjaWVzOiBwb2tlbW9uX3YyX3Bva2Vtb25zcGVjaWVzKHdoZXJlOiB7IG5hbWU6IHsgX2VxOiAke3Bva2Vtb25OYW1lfSB9IH0pIHtcbiAgICAgICAgICAgIG5hbWVcbiAgICAgICAgICAgIGJhc2VfaGFwcGluZXNzXG4gICAgICAgICAgICBpc19sZWdlbmRhcnlcbiAgICAgICAgICAgIGlzX215dGhpY2FsXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBgLFxuICAgICAgeyBvcGVyYXRpb25OYW1lOiAncG9rZW1vbl9kZXRhaWxzJyB9LFxuICAgICk7XG4gICAgcmVzcG9uc2UuanNvbih7IHJlc3VsdCB9KTtcbiAgfSk7XG5cbiAgcm91dGVyLnVzZShlcnJvckhhbmRsZXIoKSk7XG4gIHJldHVybiByb3V0ZXI7XG59XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./src/service/router.ts\n");

/***/ })

};
exports.runtime =
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ /* webpack/runtime/getFullHash */
/******/ (() => {
/******/ 	__webpack_require__.h = () => ("21f64db84b06f3356286")
/******/ })();
/******/ 
/******/ }
;