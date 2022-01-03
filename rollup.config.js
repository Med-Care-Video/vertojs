import typeScript from 'rollup-plugin-typescript2';
import visualizer from 'rollup-plugin-visualizer';
import {sizeSnapshot} from "rollup-plugin-size-snapshot";
import {terser} from 'rollup-plugin-terser';

export default [
{
	input: 'src/index.ts',
	output: {
		file: 'dist/verto.js',
		format: 'iife',
		name: 'Verto',
	},
	plugins: [
        typeScript({tsconfig: "tsconfig.json"}),
        sizeSnapshot(),
        terser(),
        visualizer()
	]
},
{
	input: 'src/index.ts',
	output: {
		file: 'dist/index.js',
		format: 'umd',
		name: 'Verto',
	},
	plugins: [
        typeScript({tsconfig: "tsconfig.json"}),
        sizeSnapshot(),
        terser(),
        visualizer()
	]
},
];
