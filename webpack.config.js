const path = require('path');

const preact = path.dirname(require.resolve('preact/package.json'));
const compat = path.join(preact, 'compat/src/index.js');

module.exports = {
    devtool: false,
    optimization: { minimize: false, moduleIds: 'named', mangleExports: false },
    entry: './src/main.tsx',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.s[ac]ss$/i,
                use: [
                    // Creates `style` nodes from JS strings
                    'style-loader',
                    // Translates CSS into CommonJS
                    'css-loader',
                    // Compiles Sass to CSS
                    { loader: 'sass-loader', options: { api: 'modern', sassOptions: { style: 'expanded' } } },
                ],
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.jsx'],
        alias: {
            'react$': compat,
            'react-dom$': compat,
            'preact$': path.join(preact, 'src/index.js'),
            'preact/hooks$': path.join(preact, 'hooks/src/index.js'),
        },
    },
    output: {
        filename: 'iu-diff-console.js',
        path: path.resolve(__dirname, 'dist'),
    },
    devServer: {
        static: { directory: path.resolve(__dirname, 'dist') },
        client: {
            overlay: {
                errors: true,
                warnings: false,
            },
        },
    },
};
