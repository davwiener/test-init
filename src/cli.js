import arg from 'arg';
import inquirer from 'inquirer';
import {createTestFiles} from './main';
import fs from'fs'
import path from "path";
const ignoredFiles = ['.spec', '.type', '.types', '.module','.enum', '.dto'];


function parseArgumentsIntoOptions(rawArgs) {
    const args = arg(
        {
            '--file': String,
            '--override': Boolean,
            '--f': '--file',
            '--o': '--override',
        },
        {
            argv: rawArgs.slice(2),
        }
    );
    return {
        fileName: args['--file'] || false,
        override: args['--override'] || false,
    };
}

async function promptForMissingOptions(options) {
    const questions = [];
    const folderFiles = fs.readdirSync(process.cwd()).filter(fileName => !ignoredFiles.find(ignoreExtenuation => fileName.includes(ignoreExtenuation))).
    filter(fileName => path.parse(fileName).ext === '.ts');
    if (options.fileName) {
        return options;
    }
    if (!options.fileName && !options.override) {
        questions.push({
            type: 'confirm',
            name: 'override',
            message: 'override spec files?',
            default: false,
        });
        const answer = await inquirer.prompt(questions);
        if (answer.override) {
            questions.pop();
            const choices = ['all', ...folderFiles];
            questions.push({
                type: 'list',
                name: 'fileName',
                message: 'Please choose which file to use',
                choices,
                default: 'all',
            });
        } else {
            console.log('please select a file name');
            process.exit(0);
        }
    }
    const answers = await inquirer.prompt(questions);
    return {
        ...options,
        filesName: options.fileName ? [options.fileName] : answers.fileName === 'all' ? folderFiles : [answers.fileName],
    };
}

export async function cli(args) {
    let options = parseArgumentsIntoOptions(args);
    options = await promptForMissingOptions(options);
    await createTestFiles(options);
}