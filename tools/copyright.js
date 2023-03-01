// AUTOGENERATED COPYRIGHT HEADER START
// Copyright (C) 2023 Michael Fabian 'Xaymar' Dirks <info@xaymar.com>
// AUTOGENERATED COPYRIGHT HEADER END
const CHILD_PROCESS = require("node:child_process");
const PROCESS = require("node:process");
const PATH = require("node:path");
const FS = require("node:fs");
const FSPROMISES = require("node:fs/promises");
const OS = require("os");

const SECTION_START = "AUTOGENERATED COPYRIGHT HEADER START";
const SECTION_END = "AUTOGENERATED COPYRIGHT HEADER END";
const IGNORED = [
    ".git",
    "cmake/clang",
    "cmake/version",
    "third-party",
]

let abortAllWork = false;

async function isIgnored(path) {
    let rpath = PATH.relative(process.cwd(), path).replaceAll(PATH.sep, PATH.posix.sep);
    for (let ignore of IGNORED) {
        if (ignore instanceof RegExp) {
            if (ignore.global) {
                if (!rpath.matchAll(ignore).done) {
                    return true;
                }
            } else {
                if (rpath.match(ignore) !== null) {
                    return true;
                }
            }
        } else if (rpath.startsWith(ignore)) {
            return true;
        }
    }

    return await new Promise((resolve, reject) => {
        try {
            let proc = CHILD_PROCESS.spawn("git", [
                "check-ignore",
                path
            ], {
                "cwd": PROCESS.cwd(),
                "encoding": "utf8",
            });
            proc.stdout.on('data', (data) => {
            })
            proc.on('close', (code) => {
                resolve(code == 0);
            });
            proc.on('exit', (code) => {
                resolve(code == 0);
            });
        } catch (ex) {
            reject(ex);
        }
    });
    /* Sync alternative
    try {
        return CHILD_PROCESS.spawnSync("git", [
            "check-ignore",
            path
        ], {
            "cwd": PROCESS.cwd(),
            "encoding": "utf8"
        }).status == 0;
    } catch (ex) {
        return true;
    }
    */
}

async function git_retrieveAuthors(file) {
    // git --no-pager log --date-order --reverse "--format=format:%aI|%aN <%aE>" -- file
    let lines = await new Promise((resolve, reject) => {
        try {
            let lines = "";
            let proc = CHILD_PROCESS.spawn("git", [
                "--no-pager",
                "log",
                "--date-order",
                "--reverse",
                "--format=format:%aI|%aN <%aE>",
                "--",
                file
            ], {
                "cwd": PROCESS.cwd(),
                "encoding": "utf8",
            });
            proc.stdout.on('data', (data) => {
                lines += data.toString();
            })
            proc.on('close', (code) => {
                resolve(lines);
            });
            proc.on('exit', (code) => {
                resolve(lines);
            });
        } catch (ex) {
            reject(ex);
        }
    });

    lines = lines.split(lines.indexOf("\r\n") >= 0 ? "\r\n" : "\n");
    let authors = new Map();
    for (let line of lines) {
        let [date, name] = line.split("|");

        let author = authors.get(name);
        if (author) {
            author.to = new Date(date)
        } else {
            authors.set(name, {
                from: new Date(date),
                to: new Date(date),
            })
        }
    }
    return authors;

    /* Sync Variant
    try {
        let data = await CHILD_PROCESS
        let lines = data.stdout.toString().split("\n");
        let authors = new Map();
        for (let line of lines) {
            let [date, name] = line.split("|");

            let author = authors.get(name);
            if (author) {
                author.to = new Date(date)
            } else {
                authors.set(name, {
                    from: new Date(date),
                    to: new Date(date),
                })
            }
        }
        return authors;
    } catch (ex) {
        console.error(ex);
        throw ex;
    }
    */
}

async function generateCopyright(file) {
    let authors = await git_retrieveAuthors(file)
    let lines = [];
    for (let entry of authors) {
        let from = entry[1].from.getUTCFullYear();
        let to = entry[1].to.getUTCFullYear();
        lines.push(`Copyright (C) ${from != to ? `${from}-${to}` : to} ${entry[0]}`);
    }
    return lines;
}

function makeHeader(file, copyright) {
    let file_name = PATH.basename(file).toLocaleLowerCase();
    let file_exts = file_name.substring(file_name.indexOf("."));

    let styles = {
        "#": {
            files: [
                "cmakelists.txt"
            ], exts: [
                ".clang-tidy",
                ".clang-format",
                ".cmake",
                ".editorconfig",
                ".gitignore",
                ".gitmodules",
                ".yml",
            ],
            prepend: [
                `# ${SECTION_START}`,
            ],
            append: [
                `# ${SECTION_END}`,
            ],
            prefix: "# ",
            suffix: "",
        },
        ";": {
            files: [
                ""
            ], exts: [
                ".iss",
                ".iss.in",
            ],
            prepend: [
                `; ${SECTION_START}`,
            ],
            append: [
                `; ${SECTION_END}`,
            ],
            prefix: "; ",
            suffix: "",
        },
        "//": {
            files: [
            ], exts: [
                ".c",
                ".c.in",
                ".cpp",
                ".cpp.in",
                ".h",
                ".h.in",
                ".hpp",
                ".hpp.in",
                ".js",
                ".rc",
                ".rc.in",
                ".effect"
            ],
            prepend: [
                `// ${SECTION_START}`,
            ],
            append: [
                `// ${SECTION_END}`,
            ],
            prefix: "// ",
            suffix: "",
        },
        "<!---->": {
            files: [
            ], exts: [
                ".htm",
                ".htm.in",
                ".html",
                ".html.in",
                ".xml",
                ".xml.in",
                ".plist",
                ".plist.in",
                ".pkgproj",
                ".pkgproj.in",
            ],
            prepend: [
                `<!-- ${SECTION_START} -->`,
            ],
            append: [
                `<!-- ${SECTION_END} -->`,
            ],
            prefix: "<!-- ",
            suffix: " -->",
        }
    };

    for (let key in styles) {
        let style = [key, styles[key]];
        if (style[1].files.includes(file_name)
            || style[1].files.includes(file)
            || style[1].exts.includes(file_exts)) {
            let header = [];
            header.push(...style[1].prepend);
            for (let line of copyright) {
                header.push(`${style[1].prefix}${line}${style[1].suffix}`);
            }
            header.push(...style[1].append);
            return header;
        }
    }

    throw new Error("Unrecognized file format.")
}

async function addCopyright(file) {
    try {
        if (abortAllWork) {
            return;
        }

        // Async/Promises
        // Copyright information.
        let copyright = await generateCopyright(file);
        let header = undefined;
        try {
            header = makeHeader(file, copyright);
        } catch (ex) {
            return;
        }
        console.log(`Updating file '${file}'...`);

        // File contents.
        let content = await FSPROMISES.readFile(file);
        let eol = (content.indexOf("\r\n") != -1 ? OS.EOL : "\n");
        let insert = Buffer.from(header.join(eol) + eol);

        // Find the starting point.
        let startHeader = content.indexOf(SECTION_START);
        startHeader = content.lastIndexOf(eol, startHeader);
        startHeader += Buffer.from(eol).byteLength;

        // Find the ending point.
        let endHeader = content.indexOf(SECTION_END);
        endHeader = content.indexOf(eol, endHeader);
        endHeader += Buffer.from(eol).byteLength;

        if (abortAllWork) {
            return;
        }

        let fd = await FSPROMISES.open(file, "w");
        let fp = [];
        if ((startHeader >= 0) && (endHeader >= 0)) {
            let pos = 0;
            if (startHeader > 0) {
                fd.write(content, 0, startHeader, 0);
                pos += startHeader;
            }
            fd.write(insert, 0, undefined, pos);
            pos += insert.byteLength;
            fd.write(content, endHeader, undefined, pos);
        } else {
            fd.write(insert, 0, undefined, 0);
            fd.write(content, 0, undefined, insert.byteLength);
        }
        await fd.close();

        /* Sync variant (slow!)
        let content = FS.readFileSync(file);
        let eol = (content.indexOf("\r\n") != -1 ? OS.EOL : "\n");

        let copyright = await generateCopyright(file);
        let header = makeHeader(file, copyright);
        let insert = Buffer.from(header.join(eol) + eol);

        let startHeader = content.indexOf(header[0]);
        let endHeader = content.indexOf(header[header.length - 1], startHeader + 1);
        endHeader += header[header.length - 1].length + eol.length;

        let fd = FS.openSync(file, "w+");
        if ((startHeader >= 0) && (endHeader >= 0)) {
            let pos = 0;
            if (startHeader > 0) {
                FS.writeSync(fd, content, 0, startHeader, 0);
                pos += startHeader;
            }
            FS.writeSync(fd, insert, 0, undefined, pos);
            pos += insert.byteLength;
            FS.writeSync(fd, content, endHeader, undefined, pos);
        } else {
            FS.writeSync(fd, insert, 0, undefined, 0);
            FS.writeSync(fd, content, 0, undefined, insert.byteLength);
        }
        FS.close(fd, (err) => {
            if (err)
                throw err;
        })*/
    } catch (ex) {
        console.error(`Error processing '${file}'!: ${ex}`);
        return;
    }
}

async function addCopyrights(path) {
    if (abortAllWork) {
        return;
    }
    if (await isIgnored(path)) {
        return;
    }

    let promises = [];

    let files = await FSPROMISES.readdir(path, { "withFileTypes": true });
    for (let file of files) {
        if (abortAllWork) {
            break;
        }

        let fullname = PATH.join(path, file.name);
        if (await isIgnored(fullname)) {
            console.log(`Ignoring path '${fullname}'...`);
            continue;
        }

        if (file.isDirectory()) {
            //console.log(`Scanning path '${fullname}'...`);
            promises.push(addCopyrights(fullname));
        } else {
            promises.push(addCopyright(fullname));
        }
    }

    await Promise.all(promises);
}

(async function () {
    PROCESS.on("SIGINT", (ev) => {
        abortAllWork = true;
        console.log("Sanely aborting all pending work...");
    })

    let path = PATH.resolve(PROCESS.argv[2]);

    { // Bootstrap to actually be in the directory where '.git' is.
        let is_git_directory = false;
        while (!is_git_directory) {
            if (abortAllWork) {
                return;
            }

            let entries = await FSPROMISES.readdir(PROCESS.cwd());
            if (entries.includes(".git")) {
                console.log(`Found .git at '${process.cwd()}'.`);
                is_git_directory = true;
            } else {
                PROCESS.chdir(PATH.resolve(PATH.join(PROCESS.cwd(), "..")));
            }
        }
        path = PATH.normalize(PATH.relative(process.cwd(), path));
    }

    let pathStat = await FSPROMISES.stat(path);
    if (pathStat.isDirectory()) {
        await addCopyrights(path);
    } else {
        await addCopyright(path);
    }
    console.log("Done");
})();
