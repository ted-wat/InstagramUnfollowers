// Run the project's TypeScript modules directly in Node's built-in test runner.
// Type checking remains part of the normal webpack build.
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    fileName: filename,
  });
  module._compile(result.outputText, filename);
};
