const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir_promise = promisify(fs.readdir);
const stat_promise = promisify(fs.stat);
const readfile_promise = promisify(fs.readFile);
const writeFile_promise = promisify(fs.writeFile);

function readFilesAsync(dir) {
  return readdir_promise(dir, { encoding: 'utf8' })
    .then((filenames) => {
      const files = getFiles(dir, filenames);

      return Promise.all(files);
    })
    .catch((err) => console.error(err));
}

function getFiles(dir, filenames) {
  return filenames.map((filename) => {
    const name = path.parse(filename).name;
    const ext = path.parse(filename).ext;
    const filepath = path.resolve(dir, filename);

    return stat({ name, ext, filepath });
  });
}

function stat({ name, ext, filepath }) {
  return stat_promise(filepath)
    .then((stat) => {
      const isFile = stat.isFile();

      return readFile({ name, ext, filepath, stat, isFile });
    })
    .catch((err) => console.error(err));
}

function readFile({ name, ext, filepath, stat, isFile }) {
  if (!isFile) return { name, ext, filepath, stat, isFile };
  return readfile_promise(filepath, 'utf-8')
    .then((content) => {
      return { name, ext, filepath, stat, isFile, content };
    })
    .catch((err) => console.error(err));
}

readFilesAsync('./Evergreen/')
  .then((files) => {
    const notes = [];
    for (const { name, ext, filepath, stat, isFile, content } of files) {
      if (ext !== '.md') continue;
      const tagsLine = content.split('\n')[0];
      const tags = tagsLine.split(' ').map((tag) => tag.substring(2, tag.length - 2));
      notes.push({ name, tags });
    }
    return notes;
  })
  .then((notes) => {
    const tagsMap = {};
    for (const { name, tags } of notes) {
      for (const tag of tags) {
        if (tagsMap[tag]) {
          tagsMap[tag].push(name);
        } else {
          tagsMap[tag] = [name];
        }
      }
    }
    return tagsMap;
  })
  .then(async (tagsMap) => {
    console.log(tagsMap);
    for (const tag of Object.keys(tagsMap)) {
      console.log(tag);
      const fileName = `./Evergreen/tags/${tag}.md`;
      const content = `# ${tag}\n${tagsMap[tag]
        .map((note) => `- [[${note}]](../${note}.md)`)
        .join('\n')}`;
      await writeFile_promise(fileName, content);
    }
  })
  .catch((err) => console.log(err));
