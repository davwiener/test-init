import * as TypescriptParser from "typescript-parser";
import path from "path";
import util from "util";
import fs from "fs";
const readFile = util.promisify(fs.readFile);

export class TestCrater {
    injectors = [];
    functionNames = [];
    uses = {};
    parser = new TypescriptParser.TypescriptParser();
    testFile = '';
    declaration;
    imports;
    filePath = '';

    buildImports() {
        this.testFile += 'import { INestApplication } from \'@nestjs/common\';\n';
        this.testFile += 'import { Test, TestingModule } from \'@nestjs/testing\';\n';
        this.testFile += `import { ${this.declaration.name} } from \'./${this.filePath}\';\n`;
        this.imports.forEach(im => {
            if (im.specifiers) {
                const specifiers = im.specifiers.filter(specifier => this.injectors.find(injector => {
                    return injector.type === specifier.specifier;
                }))
                if (specifiers.length) {
                    this.testFile += 'import { '
                    specifiers.forEach((specifier, index) => {
                        this.testFile += `${(specifier.specifier)}`
                        this.testFile += index + 1 === specifiers.length ? ' ' : ', '
                    })
                    this.testFile += `} from \'${im.libraryName}\'\n`
                }
            }
        });
    }

    buildMocks() {
        Object.keys(this.uses).forEach(property => {
            this.testFile += `\nconst mock${this.uses[property].type}: Partial<${this.uses[property].type}>= {\n`
            this.uses[property].calls.forEach(call => {
                this.testFile += `\t${call}: jest.fn(),\n`
            });
            this.testFile += '}\n'
        });
    }

    buildBeforeEach() {
        this.testFile += `describe('test ${this.declaration.name} methods', () => {\n`
        this.testFile += `\tlet app: INestApplication\n`
        this.injectors.forEach(injector => {
            this.testFile += `\tlet ${injector.name};\n`
        });
        this.testFile += '\tbeforeEach(async () => {\n'
        this.testFile += '\t\tconst moduleFixture: TestingModule = await Test.createTestingModule({\n'
        this.testFile += `\t\t\tproviders: [${this.declaration.name},\n`
        this.injectors.forEach(injector => {
            this.testFile += `\t\t\t{ provide: ${injector.type}, useValue: mock${injector.type}},\n`
        });
        this.testFile += '\t\t]'
        this.testFile += '\t\t}).compile()\n'
        this.testFile += '\t\tapp = moduleFixture.createNestApplication();\n'
        this.injectors.forEach(injector => {
            this.testFile += `\t${injector.name} = app.get<${injector.type}>(${injector.type});\n`
        });
        this.testFile += '\tawait app.init();\n'
        this.testFile += '\t})\n'
        this.testFile += '\tit(\'init tests\', () => {\n' +
            '\t\texpect(app).toBeDefined();\n' +
            '\t});\n'

    }

    buildDescribes() {
        this.functionNames.forEach(functionName => {
            this.testFile += `\tdescribe('test ${functionName} method', () => {\n`;
            this.testFile += '\t\tit(\'example test\', async () => {\n';
            this.testFile += '\t\t\texpect(true).toEqual(true);\n';
            this.testFile += '\t\t});\n';
            this.testFile += '\t})\n';
        });

    }

    buildFile() {
        this.buildImports();
        this.buildMocks();
        this.buildBeforeEach();
        this.buildDescribes();
        this.testFile += "});";
        return this.testFile;
    }


    async buildTestFile(targetDirectory, fileName) {
        this.filePath = path.parse(fileName).name;
        try {
            const data = await readFile(`${targetDirectory}/${fileName}`, 'utf8');
            const parsed = await this.parser.parseSource(data);
            this.declaration = parsed.declarations[0];
            this.imports = parsed.imports;
            this.declaration.ctor.parameters.forEach(param => {
                this.injectors.push({name: param.name, type: param.type})
            });
            this.functionNames = this.declaration.methods.filter(method => (method.visibility !== 0 && method.visibility !== 1)).map(method => (method.name));

            this.injectors.forEach(injector => {
                const {name, type} = injector;
                this.uses[name] = {calls: [], type};
                let index = data.indexOf(`this.${name}`);
                while (index > 0) {
                    const newCall = data.substring(index + `this.${name}.`.length).split('\(')[0];
                    if (!this.uses[name].calls.find(call => call === newCall)) {
                        this.uses[name].calls.push(newCall);
                    }
                    index = data.indexOf(`this.${name}`, index + 1);
                }
            });
            return this.buildFile();
        } catch (e) {
            console.log(e);
        }
    }

}