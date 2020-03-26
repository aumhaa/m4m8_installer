autowatch = 1;
outlets = 2;

var script = this;
script._name = 'package_test';

//utility functions from aumhaa framework
function protoarrayfromargs(args){
	return Array.prototype.slice.call(args, 0);
}

Debug = function(){
	var args = protoarrayfromargs(arguments);
	for(var i in args){
		if(args[i] instanceof Array){
			args[i] = args[i].join(' ');
		}
	}
	post(args, '\n');
}

Forceload = function(script){
	post('FORCELOAD!!!!!!!\n');
	script.init(1);
}

var FORCELOAD = false;
var DEBUG = false;
var DEBUG_NODE = false;

debug = DEBUG ? Debug : function(){};
forceload = FORCELOAD ? Forceload : function(){};

//script variables
var alive = false;
var os = this.max.os;
var liveApiApp;
var live_version = false;
var node_script;
var nodescript_running;
var jweb;
var jweb_path;
// var regexp = {pythoncheck:new RegExp(/(Directories: Python Remote Scripts: Check)/), python:new RegExp(/(Directories: Python Remote Scripts: )/)}
var regexp = {
	pythoncheck:new RegExp(/(Directories: Python Remote Scripts: Check)/),
	python:new RegExp(/(Directories: Python Remote Scripts: )/),
	docscheck:new RegExp(/(Directories: Documents: Check)/),
	docs:new RegExp(/(Directories: Documents: )/),
	docsremove:new RegExp(/(LegalAndDocs\/Docs\/)/)
};
var statusDict = new Dict("status");
var pathsDict = new Dict("paths");
var conformedPaths = {
	absolute:{
		rootPath:'',
		appPath:'',
		userPath:'',
		logPath:'',
		packagePath:'',
		amxdPath:'',
		localFolderPath:'',
		livePath:''
	},
	boot:{
		rootPath:'',
		appPath:'',
		userPath:'',
		logPath:'',
		packagePath:'',
		amxdPath:'',
		localFolderPath:'',
		livePath:''
	}
};

//populate pathsDict with conformedPaths contents
for(var type in conformedPaths){
	for(path in conformedPaths[type]){
		pathsDict.replace(type+'::'+path, conformedPaths[type][path]);
	}
}

//a check to make sure node.script is actually running before we send messages to it
function nodeIsRunning(){
	//var node = this.patcher.getnamed('node_script');
	var running = this.patcher.getnamed('node_script').getattr('running') ? true : false;
	debug('nodeIsRunning:', running);
	jweb_dict.set('status', running ? 'running' : 'stopped');
	jwebRefreshTask.schedule(3000);
	return running;
}

//catch non-handled requests
function anything(){
	debug('anything:', mesagename, arguments);
}

//called when live.thisdevice fires on patch load.
function init(){
	debug('init!');
	alive = true;
	package_button = this.patcher.getnamed('package_button');
	scripts_button = this.patcher.getnamed('scripts_button');
	m4m8_node_button = this.patcher.getnamed('m4m8_node_button');
	logs_button = this.patcher.getnamed('logs_button');
	oji_package_button = this.patcher.getnamed('oji_package_button');
	oji_scripts_button = this.patcher.getnamed('oji_scripts_button');
	oji_node_button = this.patcher.getnamed('oji_node_button');
	package_button.message('active', 0);
	scripts_button.message('active', 0);
	m4m8_node_button.message('active', 0);
	oji_package_button.message('active', 0);
	oji_scripts_button.message('active', 0);
	oji_node_button.message('active', 0);
	logs_button.message('active', 0);
	node_script = this.patcher.getnamed('node_script');
	nodescript_running = this.patcher.getnamed('nodescript_running');
	jweb_dict = new Dict('jweb_dict');
	jweb = this.patcher.getnamed('jweb');
	jweb.message('readfile', 'm4m8_installer.html');
	//refreshJweb();
	jwebRefreshTask = new Task(refreshJweb, this);
	//jwebRefreshTask.interval = 1000;
	jwebRefreshTask.schedule(3000);
	// jwebRefreshTask.repeat(5)
	node_debug = this.patcher.getnamed('node_debug');
	DEBUG&&node_debug.front();
	resolve_paths();
	//DEBUG&&list_paths();
	//jweb.message('read', conformedPaths.absolute.localFolderPath + '/webpage.html');
	//node_script.message('script', 'npm', 'install');
	initialize_nodescript();

}

function initialize_nodescript(){
	var running = nodeIsRunning();
	debug('nodeIsRunning', running);
	// node_script.message('script', 'npm', 'install');
	node_script.message('script', 'start');
}

function refreshJweb(){
	//jweb.message('refreshDict');
	outlet(1, 'refreshDict');
	// jweb.message('reload');
	//jweb.message('readfile', 'm4m8_installer.html');
	debug('refreshJweb');
	//jweb.message('rendermode', 1);
	//jweb.message('rendermode', 0);
}

//collect all dump output from node.script, start node.script when npm install finishes.
function nodeLog(){
	var args = arrayfromargs(arguments);
	var keys = statusDict.getkeys();
	//debug('keys:', keys);
	// if(DEBUG_NODE){
	// 	debug('NODE:', args);
	// 	for(var i in keys){
	// 		var item = statusDict.get(keys[i]);
	// 		if(typeof(item)=='object'){
	// 			for(var j in item){
	// 				debug('NODE:', keys[i], j, ':', item[j]);
	// 			}
	// 		}
	// 		else{
	// 			debug('NODE:', keys[i], ':', item);
	// 		}
	// 	}
	// }
	//debug('args in keys:', 'args' in keys);
	//debug('status in keys:', 'status' in keys);
	// if((args[0] == 'npm')&&(args[1] == 'success')&&(statusDict.get('args')[0] == 'install')&&(statusDict.get('status') == 'completed')){
	// 	debug('starting script');
	// 	//outlet(0, 'script', 'start');
	// 	node_script.message('script', 'start');
	// }
	var status = dict_to_jsobj(statusDict);
	//debug('statusDict:', status);
	for(var i in status){
		debug('NODE status.'+i, status[i]);
	}
	if(('args' in status)&&(status.args[0]=='install'))
	{
		if(status.status=='started'){
			jweb_dict.set('status', 'node modules installing');
			refreshJweb();
		}
		if(status.status=='completed'){
			// jweb_dict.set('status', 'node script starting');
			// refreshJweb();
			node_script.message('script', 'start');
		}
	}
}

//received when node.script starts
function node_script_started(){
	debug('running');
	//jweb_dict.set('status', 'running');
	//refreshJweb();
	nodeIsRunning();
	node_script.message('update_paths');
	package_button.message('active', 1);
	oji_package_button.message('active', 1);
	logs_button.message('active', 1);
}

//resolve all used paths and store in dict for access across max
function resolve_paths(){
	getConformedPath('maxPath', 'Usermax');
	getConformedPath('userPath', 'Usermax');
	getConformedPath('userPath', conformedPaths.boot.userPath.replace('/Documents/Max 8/', ''));
	detect_live_preferences_path(conformedPaths.absolute.userPath);
	getConformedPath('packagePath', 'Usermax:/Packages');
	getConformedPath('pythonPath', livePath);
	getConformedPath('logPath', logPath);
	getConformedPath('desktopPath', 'Desktop');
	getConformedPath('amxdPath', this.patcher.filepath);
	getConformedPath('localFolderPath', this.patcher.filepath.substring(0, conformedPaths.boot.amxdPath.lastIndexOf("/")));
	getConformedPath('jwebPath', (conformedPaths.boot.localFolderPath + '/webpage.html'));
	getConformedPath('appPath', this.max.apppath);
	getConformedPath('rootPath', this.max.apppath.split('/')[0]);
	//if(nodeIsRunning()){node_script.message('update_paths');}
}

function list_paths(){
	for(var i in conformedPaths){
		debug(i, '--------');
		for(var j in conformedPaths[i]){
			debug(j, conformedPaths[i][j]);
		}
	}
}

//parse the Maxuser path to find the correct preferences/ableton/log.txt
function detect_live_preferences_path(Userpath){
	liveApiApp = new LiveAPI(function(){}, 'live_app');
 	var major=liveApiApp.call("get_major_version");
	var minor=liveApiApp.call('get_minor_version');
	var bugfix=liveApiApp.call('get_bugfix_version');
	//on non-incrementals, ableton doesn't add the sub version to the log file path
	live_version = (major+'.'+minor+(bugfix?('.'+bugfix):''));
	debug('Live version:', live_version);
	parse_live_log();
}

//parse the live prefs directory to find the correct log.txt to parse
function parse_live_log(){
	var prefsPath;
	var found_log = false;
	var m = new Folder(conformedPaths.absolute.userPath+'/Library/Preferences/Ableton');
	//debug('looking for log @:', m.pathname);
	var version = live_version;
	while((!m.end)&&(found_log==false)){
		while((!m.end)&&(found_log==false)){
			//debug(m.filename);
			if(m.filename == ('Live '+version)){
				//debug('log in ', m.filename);
				prefsPath = m.pathname+'/'+m.filename;
				found_log=true;
				break;
			}
			m.next();
		}
	}
	if((found_log == true)&&(prefsPath != undefined)){
		var n = new Folder(prefsPath);
		while(!n.end){
			if(n.filename == 'Log.txt'){
				var log_path = n.pathname+'/'+n.filename;
				debug('found log file, reading file locations...');
				read_live_log(log_path);
				break;
			}
			n.next();
		}
	}
	if(found_log == false){
		debug('Installer could not find Live\'s log file.\n');
	}
}

//read each line in the log.txt to find the MIDI Remote Scripts dir
function read_live_log(path){
	debug('Reading Live\'s log.txt...');
	var lineinc = 0;
	logPath = path;
	var log_file = new File(path);
	//debug('log file @:', log_file.filename);
	while(log_file.position < log_file.eof){
		//debug('reading line:', lineinc);
		lineinc += 1;
		var line = log_file.readline(200);
		var a = line.split('info: ');
		if(regexp.docscheck.test(a[1])==1){
			//debug('checking...');
			//this buffer is getting overrun, need to do smaller chunk?
			line = log_file.readline(200);
			var b = line.split('info:');
			if(regexp.docs.test(b[1])==1){
				var new_path = b[1].replace(regexp.docs, '');
				new_path = new_path.slice(1);
				//livePath = conformedPaths.absolute.rootPath+new_path;
				new_path = new_path.replace(regexp.docsremove, '');
				livePath = new_path + 'App-Resources/MIDI Remote Scripts/';
			}
		}
	}
	log_file.close();
	debug('livePath:', livePath);
	getConformedPath('livePath', livePath);
}

//request m4m8 package to be downloaded from github to "~/DocumentsMax 8/Packages" from node.script
function install_package(){
	//if(nodeIsRunning()){node_script.message('installPackage');}
	node_script.message('installPackage');
}

//request m4m8 Python Scripts to be copied to "Ableton/Contents/App-Resources/MIDI Remote Scripts" by node.script
function install_python_scripts(){
	//if(nodeIsRunning()){node_script.message('install_python_scripts');}
	node_script.message('install_python_scripts');
}

function install_OJI(){
	//if(nodeIsRunning()){node_script.message('installPackage');}
	node_script.message('installOJI');
}

function install_OJI_scripts(){
	//if(nodeIsRunning()){node_script.message('installPackage');}
	node_script.message('install_OJI_Scripts');
}

//request log.txt and maxConsole be zipped to "~/Desktop" by node.script
function write_log(){
	//if(nodeIsRunning()){node_script.message('write_log');}
	node_script.message('write_log');
}

//send out
function getConformedPath(type, path){
	outlet(0, type, path);
}

function returnConformedPath(type, path_boot, path_absolute){
	//debug('returnConformedPath', type, path_boot, path_absolute);
	conformedPaths.boot[type] = path_boot;
	conformedPaths.absolute[type] = path_absolute;
	pathsDict.set('boot::'+type, conformedPaths.boot[type]);
	pathsDict.set('absolute::'+type, conformedPaths.absolute[type]);
}

function package_installed(){
	install_m4m8_node_dependencies();
	m4m8_node_button.message('active', 1);
	scripts_button.message('active', 1);
}

function oji_package_installed(){
	install_OJI_node_dependencies();
	oji_node_button.message('active', 1);
	oji_scripts_button.message('active', 1);
}


function install_m4m8_node_dependencies(){
	script.m4m8_node_installer = this.patcher.newdefault(450, 489, 'node.script', 'm4m8_node_installer.js');
	m4m8_node_installer.message('script', 'npm', 'install');
}

function install_OJI_node_dependencies(){
	script.OJI_node_installer = this.patcher.newdefault(508, 489, 'node.script', 'OJI_node_installer.js');
	OJI_node_installer.message('script', 'npm', 'install');
}

forceload(this);


function dict_to_jsobj(dict) {
	if (dict == null) return null;
	var o = new Object();
	var keys = dict.getkeys();
	if (keys == null || keys.length == 0) return null;

	if (keys instanceof Array) {
		for (var i = 0; i < keys.length; i++)
		{
			var value = dict.get(keys[i]);

			if (value && value instanceof Dict) {
				value = dict_to_jsobj(value);
			}
			o[keys[i]] = value;
		}
	} else {
		var value = dict.get(keys);

		if (value && value instanceof Dict) {
			value = dict_to_jsobj(value);
		}
		o[keys] = value;
	}

	return o;
}
