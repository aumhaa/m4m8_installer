//aumhaa 072217 aumhaa@gmail.com
//some of this code was borrowed from n4m examples (n4m-downloader.js)

const maxApi = require('max-api');
const { exec } = require("child_process");
const { basename, join } = require("path");
const { promisify } = require("util");
const fs = require('fs');
const { existsSync, lstat, mkdir, readdir, rmdir, unlink, rename, ensureDir, pathExists, copy, writeFile, move } = require("fs-extra");
const github = require('download-git-repo');

function arrayfromargs(){
	return Array.prototype.slice.call(arguments, 0);
}

Debug = function(){
	var args = arrayfromargs.apply(this, arguments);
	for(var i in args){
		if(args[i] instanceof Array){
			args[i] = args[i].join(' ');
		}
	}
	//args = args.join(' ');
	maxApi.post(args + '\n');
}

const DEBUG = true;
const debug = DEBUG&&Debug?Debug:function(){}

const githubAsync = promisify(github);
const execAsync = promisify(exec);
const lstatAsync = promisify(lstat);
const mkdirAsync = promisify(mkdir);
const readdirAsync = promisify(readdir);
const renameAsync = promisify(rename);
const rmdirAsync = promisify(rmdir);
const unlinkAsync = promisify(unlink);
const ensureDirAsync = promisify(ensureDir);
const pathExistsAsync = promisify(pathExists);
const copyAsync = promisify(copy);
const writeFileAsync = promisify(writeFile);
const moveAsync = promisify(move);

const M4M8_URL = 'aumhaa/m4m8';
const MOD_PACKAGE_DIR_NAME = '/m4m8';

const OJI_URL = 'aumhaa/OJI';
const OJI_PACKAGE_DIR_NAME = '/OJI';

const DIRS_TO_BACKUP = ['m4m8', 'm4m8-master'];
const OJI_DIRS_TO_BACKUP = ['OJI', 'OJI-master'];

const BACKUP_DEST = '/Packages (removed)/m4m8_backup_';
const OJI_BACKUP_DEST = '/Packages (removed)/OJI_backup_';

let inProgress = false;

let pathsDict = undefined;

let jwebDictId = "jweb_dict";
try {
  const jweb_dict = maxApi.getDict(jwebDictId);
	//debug('library dict init handled');
}
catch (err) {
	debug('jweb dict init error', err);
}

const update_paths = () => {
	debug('update_paths');
	maxApi.getDict("paths").then((dict) => {
		pathsDict = dict;
	}).catch((err) => {
		debug('get_path error:', err);
	})
}

maxApi.addHandler("update_paths", async () => {
	update_paths();
});

const doDownload = (url, targetPath) => {
	return githubAsync(url, targetPath)//, function (err) {debug(err ? 'Error' : 'Success')});
}

const removeDir = async (dir) => {
	if (!existsSync(dir)) return;

	const files = await readdirAsync(dir);

	for (let i = 0, il = files.length; i < il; i++) {

		// Pass on "." and ".."
		if (files[i] === "." || files[i] === "..") continue;

		const filePath = join(dir, files[i]);
		const fileInfo = await lstatAsync(filePath);

		if (fileInfo.isDirectory()) {
			await removeDir(filePath);
		} else {
			await unlinkAsync(filePath)
		}
	}
	// remove the now empty directory
	await rmdirAsync(dir);
};

const backupDir = async (dir_to_move, destination) => {
	debug('backupDir', dir_to_move, destination)
	if (!existsSync(dir_to_move)) return;
	await moveAsync(dir_to_move, destination, {overwrite: true}, err => {
		if (err) debug(err)
	})
}

const createBackupPath = (dir) => {
	//let date = (new Date()).toJSON().slice(0, 19).replace(/[-T]/g, '').replace(/[/]/g, '');
	let date = new Date();
	let timeStamp = ((date.getFullYear().toString()) + (date.getMonth().toString()) + (date.getDate().toString()) + (date.getHours().toString()) + (date.getMinutes().toString()) + (date.getSeconds().toString())).toString();
	let new_dir = (dir+timeStamp).toString();
	debug('date_backup:', new_dir);
	return new_dir;
}
maxApi.addHandler("installPackage", async () => {
	m4m8Path = join(pathsDict.boot.packagePath, MOD_PACKAGE_DIR_NAME);
	debug('m4m8 path is:', m4m8Path);
	try {
		await ensureDirAsync(pathsDict.boot.packagePath);
		for(var dir in DIRS_TO_BACKUP){
			var path_to_backup = join(pathsDict.boot.packagePath, DIRS_TO_BACKUP[dir]);
			if( (fs.existsSync(path_to_backup)) && (fs.lstatSync(path_to_backup).isDirectory()) ){
				backupDir(path_to_backup, join(pathsDict.boot.maxPath, BACKUP_DEST));
			}
		}
	}
	catch (err) {
		debug(err);
		debug("Error", maxApi.POST_LEVELS.ERROR);
		debug(err.message, maxApi.POST_LEVELS.ERROR);
	}
	try {
		if (inProgress) throw new Error("m4m8 download is already in progress. Please wait.");

		inProgress = true;

		await ensureDirAsync(pathsDict.boot.packagePath);

		await doDownload(M4M8_URL, m4m8Path);

		debug("Success!");
		maxApi.outlet(['package_installed']);
	}
	catch (err) {
		debug(err);
		debug("Error", maxApi.POST_LEVELS.ERROR);
		debug(err.message, maxApi.POST_LEVELS.ERROR);
	}
	finally {
		inProgress = false;
	}


});

maxApi.addHandler("installOJI", async () => {

	OJIPath = join(pathsDict.boot.packagePath, OJI_PACKAGE_DIR_NAME);
	debug('OJIPath path is:', OJIPath);
	for(var dir in OJI_DIRS_TO_BACKUP){
		try {
			await ensureDirAsync(pathsDict.boot.packagePath);
			let path_to_backup = join(pathsDict.boot.packagePath, OJI_DIRS_TO_BACKUP[dir]);
			debug('path_to_backup:', path_to_backup);
			let exists = fs.existsSync(path_to_backup);
			let isDir = fs.lstatSync(path_to_backup).isDirectory();
			if( (fs.existsSync(path_to_backup)) && (fs.lstatSync(path_to_backup).isDirectory()) ){
				let destination_path = join(pathsDict.boot.maxPath, OJI_BACKUP_DEST);
				destination_path = createBackupPath(destination_path);
				debug('backing up:', destination_path)
				backupDir(path_to_backup, destination_path);
			}
		}
		catch (err) {
			debug(err);
			// debug("Error", maxApi.POST_LEVELS.ERROR);
			// debug(err.message, maxApi.POST_LEVELS.ERROR);
		}
	}
	try {
		if (inProgress) throw new Error("OJI download is already in progress. Please wait.");

		inProgress = true;

		await ensureDirAsync(pathsDict.boot.packagePath);

		await doDownload(OJI_URL, OJIPath);

		debug("Success!");
		maxApi.outlet(['oji_package_installed']);
	}
	catch (err) {
		debug(err);
		debug("Error", maxApi.POST_LEVELS.ERROR);
		debug(err.message, maxApi.POST_LEVELS.ERROR);
	}
	finally {
		inProgress = false;
	}


});

maxApi.addHandler("install_python_scripts", async () => {

	debug('install python scripts via node...');
	let PythonPath = pathsDict.absolute.pythonPath;
	if(PythonPath.endsWith('/')){
		PythonPath = PythonPath.replace(/\/$/, '');
	}
	PythonPath = PythonPath.split(':')[1];
	//debug('PythonPath:', PythonPath);
	let python_path_exists = await pathExistsAsync(PythonPath);
	//debug('PythonPath exists...');
	let user_python_path = join(m4m8Path, 'Python Scripts');
	let user_livid_path = join(m4m8Path, 'Livid Python Scripts');
	let user_python_path_exists = await pathExistsAsync(user_python_path);
	let user_livid_path_exists = await pathExistsAsync(user_livid_path);
	if((python_path_exists)&&(user_python_path_exists)){
		debug('copying...');
		await copy(user_python_path, PythonPath);
	}
	debug('Python Scripts finished copying.');
	if((python_path_exists)&&(user_livid_path_exists)){
		debug('copying...');
		await copy(user_livid_path, PythonPath);
	}
	debug('Livid Python Scripts finished copying.');
});

maxApi.addHandler("install_OJI_Scripts", async () => {

	debug('install OJI python scripts via node...');
	let PythonPath = pathsDict.absolute.pythonPath;
	if(PythonPath.endsWith('/')){
		PythonPath = PythonPath.replace(/\/$/, '');
	}
	PythonPath = PythonPath.split(':')[1];
	//debug('PythonPath:', PythonPath);
	let python_path_exists = await pathExistsAsync(PythonPath);
	//debug('PythonPath exists...');
	let user_python_path = join(OJIPath, 'Python Scripts');
	let user_python_path_exists = await pathExistsAsync(user_python_path);
	if((python_path_exists)&&(user_python_path_exists)){
		debug('copying...');
		await copy(user_python_path, PythonPath);
	}
	debug('Python Scripts finished copying.');
});

maxApi.addHandler('write_log', async() => {
	debug('write_log');
	let desktopPath = pathsDict.boot.desktopPath;
	let logtxtPath = pathsDict.boot.logPath;
	debug('ensure:', join(desktopPath, 'modLog'));
	await ensureDirAsync(join(desktopPath, 'modLog'));
	maxApi.outlet(['writeLog', 'write', join(desktopPath, 'modLog/maxConsole.txt')]);
	debug('finished writing maxConsole');
	await copy(logtxtPath, join(desktopPath, 'modLog/log.txt'));
	debug('finished writing logtxt');
	await execAsync(`zip -r ${join(desktopPath, 'modLog')} *`, {
		cwd: join(desktopPath, 'modLog')
	});
	debug('finished zipping modLog');
	removeDir(join(desktopPath, 'modLog'));
	debug('finished removing modLog');
});

maxApi.post('starting script...');

// for(var i in pathsDict){
// 	debug('pathsDict', i);
// 	for(var path in pathsDict[i]){
// 		path, pathsDict[i][path];
// 	}
// }

update_paths();

maxApi.outlet(['node_script_started']);

//Not used.
/*

const archiveOldInstall = async (dir) => {
	if (!existsSync(dir)) return;

	const files = await readdirAsync(dir);
}

*/
