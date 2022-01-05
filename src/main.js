import fs from 'fs'
import * as path from 'path';
import { TestCrater } from "./test-creater";
import {exec} from "child_process";

export function createTestFiles(options) {
    options.filesName.forEach(fileName => createTestFile({
        ...options,
        fileName
    }));
}

async function createTestFile(options) {
    options = {
        ...options,
        targetDirectory: options.targetDirectory || process.cwd(),
    };

    let targetDirectory = options.targetDirectory;
    let fileName = path.parse(options.fileName).base;
    let nameWithoutExtension = path.parse(options.fileName).name;
    if (fileName !== options.fileName) {
        targetDirectory = path.parse(options.fileName).dir;
    }
    fileName = path.parse(options.fileName).ext === '.ts' ? `${path.parse(options.fileName).name}.ts` : `${path.parse(options.fileName).base}.ts`
    const testCrater = new TestCrater();
    const fileText = await testCrater.buildTestFile(targetDirectory, fileName);
    fs.writeFile(`${targetDirectory}/${nameWithoutExtension}.spec.ts`, fileText, function (err) {
        if (err) {
            return console.log(err);
        }
        console.log(`${targetDirectory}/${nameWithoutExtension}.spec.ts Test file was created!`);
        //prettier the file
        exec(`prettier --write ${targetDirectory}/${nameWithoutExtension}.spec.ts`, function(err, stdout, stderr) {
            if (err) {
                return console.log(err);
            }
            console.log(stdout);
        });

    });
}