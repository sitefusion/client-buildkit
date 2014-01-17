
var SiteFusion, Ci = Components.interfaces, Cc = Components.classes;
var PromptService = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
var SFStringBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
var SFStringBundleObj = SFStringBundleService.createBundle('chrome://sitefusion/locale/sitefusion.properties');
		
SiteFusionPopup = {

	openProxySettings: function() {
		window.openDialog("chrome://sitefusion/content/connection.xul", "modifyProxyDialog", "resizable,dialog,centerscreen,modal", this);
		//force reloading settings
		SiteFusion.Init();	
	},
	
	openExtensionManager: function() {
		window.open("chrome://mozapps/content/extensions/extensions.xul", "sfExtensions", "chrome,menubar,extra-chrome,toolbar,dialog=no,resizable");
	},
	
	openAboutInfo: function() {
		try {
			SiteFusion.ChromeToPath("chrome://branding/content/about.xhtml");
		}
		catch (e) {
			PromptService.alert( window, 'Error', "No branding registered.");
			return;
		}
		window.open("chrome://branding/content/about.xhtml", "sfinfoWindow", "chrome,centerscreen");
	},
	
	openAboutConfig: function() {
		window.open("chrome://global/content/config.xul", "sfAboutConfigWindow", "chrome,centerscreen");
	},
	
	openErrorConsole: function() {
		window.open("chrome://global/content/console.xul", "sfErrorConsole", "chrome,menubar,extra-chrome,toolbar,dialog=no,resizable");
	},
	
	openAboutSupport: function() {
		window.openDialog("about:support", "sfAboutSupportWindow", "chrome,centerscreen,width=500,height=800");
	},
	
	openAboutCrashes: function() {
		window.openDialog("about:crashes", "sfAboutCrashesWindow", "chrome,centerscreen,width=500,height=300");
	},
	
	openAboutMemory: function() {
		window.openDialog("about:memory", "sfAboutMemoryWindow", "chrome,centerscreen,width=500,height=800");
	},
	
	openAboutPlugins: function() {
		window.openDialog("about:plugins", "sfAboutPluginsWindow", "chrome,centerscreen,width=500,height=800");
	},
	
	
	openUpdates: function() {
		var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
		
		if (!prefs.getBoolPref( "app.update.enabled")) {
			var targetWindow = window;
	        winUtils = targetWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);

	        try {
		        if (winUtils && !winUtils.isParentWindowMainWidgetVisible) {
		            targetWindow = null;
		        }
	    	}
	    	catch (e) {
	    		targetWindow = null;
	    	}
			PromptService.alert( targetWindow, SFStringBundleObj.GetStringFromName('error'), SFStringBundleObj.GetStringFromName('updates_disabled'));
			return false;
		} 
	    var um = Cc["@mozilla.org/updates/update-manager;1"].getService(Ci.nsIUpdateManager);
	    var prompter = Cc["@mozilla.org/updates/update-prompt;1"].createInstance(Ci.nsIUpdatePrompt);
	
	    // If there's an update ready to be applied, show the "Update Downloaded"
	    // UI instead and let the user know they have to restart the browser for
	    // the changes to be applied. 
	    if (um.activeUpdate && um.activeUpdate.state == "pending")
	      prompter.showUpdateDownloaded(um.activeUpdate);
	    else
	      prompter.checkForUpdates();

	 	return true;
	}
};

SiteFusion = {
	Address: null,
	Application: null,
	Arguments: null,
	Username: null,
	Ident: null,
	SID: null,
	
	ClientID: null,
	Errors: {},
	FatalErrorOccurred: false,

	RemoteLibraries: [],
	LibraryContent: [],
	
	RootWindow: null,
	
	OnLoadRootWindow: function() {
		SiteFusion.Address = opener.SiteFusion.Address;
		SiteFusion.Application = opener.SiteFusion.Application;
		SiteFusion.Arguments = opener.SiteFusion.Arguments;
		SiteFusion.Username = opener.SiteFusion.Username;
		SiteFusion.Ident = opener.SiteFusion.Ident;
		SiteFusion.SID = opener.SiteFusion.SID;
		SiteFusion.RemoteLibraries = opener.SiteFusion.RemoteLibraries;
		SiteFusion.LibraryContent = opener.SiteFusion.LibraryContent;
		SiteFusion.ClientID = opener.SiteFusion.ClientID;
		SiteFusion.Errors = opener.SiteFusion.Errors;
		SiteFusion.Version = opener.SiteFusion.Version;
		 
		opener.close();
		
		SiteFusion.LoadLibraries();
		
		SiteFusion.Initialize();
		
		
		// Because of a problem with the linux xulrunner downloaded updates are not applied
		// but discarded, so they need to be applied by running the updater manually
		if( Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime).OS.match( /linux/i ) ) {
			var obsService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
			var observer = {
				observe: function( subject, topic, data ) {
					var procDir = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get('CurProcD', Ci.nsIFile);
					var file = procDir.clone();
					file.append( 'updates' );
					file.append( '0' );
					file.append( 'update.mar' );
					
					if( file.exists() ) {
						var updater = procDir.clone();
						updater.append( 'updater' );

						var process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
						process.init( updater );
						process.run( true, [ './updates/0', './' ], 2 );
					}
				}
			};

			obsService.addObserver( observer, "quit-application-requested", false);
		}
	},
	
	LoadLibraries: function() {
		try {
			var baseFile = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
			baseFile.append( 'sf_lib_cache' );
			if( baseFile.exists() )
				baseFile.remove(true);
			
			baseFile.create( Ci.nsIFile.DIRECTORY_TYPE, 0777 );
			
			var ioService = Components.classes["@mozilla.org/network/io-service;1"]
	                          .getService(Components.interfaces.nsIIOService);
			var resProt = ioService.getProtocolHandler("resource")
			                       .QueryInterface(Components.interfaces.nsIResProtocolHandler);
			
			var aliasFile = Components.classes["@mozilla.org/file/local;1"]
			                          .createInstance(Components.interfaces.nsILocalFile);
			aliasFile.initWithFile( baseFile );
			
			var aliasURI = ioService.newFileURI(aliasFile);
			resProt.setSubstitution("sflibcache", aliasURI);
			
			var subscriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
	                      .getService(Components.interfaces.mozIJSSubScriptLoader);
			
			for( var n = 0; n < this.LibraryContent.length; n++ ) {
				var relPath = this.LibraryContent[n][0].split('/');
				var fileName = relPath.pop();
				var content = this.LibraryContent[n][1];
				
				var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
				file.initWithFile(baseFile);
				
				for( var p = 0; p < relPath.length; p++ ) {
					file.append( relPath[p] );
					if( ! file.exists() )
						file.create( Ci.nsIFile.DIRECTORY_TYPE, 0777 );
				}
				
				file.append( fileName );
				file.create( Ci.nsIFile.NORMAL_FILE_TYPE, 0666 );
				
				var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
				                         createInstance(Components.interfaces.nsIFileOutputStream);
				
				foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
				var converter = Cc["@mozilla.org/intl/converter-output-stream;1"].createInstance(Ci.nsIConverterOutputStream);
				converter.init(foStream, "UTF-8", 0, 0);
				converter.writeString(content);
				converter.close();
				
				subscriptLoader.loadSubScript( "resource://sflibcache/"+relPath.join('/')+'/'+fileName+'?cycle='+(new Date()).getTime() );
			}
			
			baseFile.remove(true);
		}
		catch ( ex ) {
			for( var n = 0; n < this.LibraryContent.length; n++ ) {
				this.Execute( this.LibraryContent[n][1], this.LibraryContent[n][0] );
			}
		}
	},
	
	GetRandomQuery: function() {
		var chars = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
		var str = '';

		while( str.length < 20 ) {
			str += chars[Math.round(Math.random()*25)];
		}

		return str;
	},
	
	Execute: function( code ) {
		var R = this.Registry;
		var C = this.Classes;
		var CM = this.Comm;
		
		try {
			eval( code );
		}
		catch ( e ) {
			SiteFusion.HandleError( { error: true, type: 'js_error', message: e + "\n\n" + code } );
		}
	},
	
	HandleError: function( error ) {
		var message;
		var check = false;
		var debug = (location.search.substr(1).split('&').indexOf('-sfdebug=true') != -1);
		
		if( typeof(error.message) != undefined && error.message )
			SiteFusion.ServerError( error.message+'' );
		
		//the care the errors that are likely to be cascaded, and should therefor be filtered conditionally
		var suppressedErrors = ['empty_error','input_error','session_error','php_error','js_error'];

		for (var i = 0; i < suppressedErrors.length; i++) {
        	if (suppressedErrors[i] === error.type) {
            	if (this.IsErrorConsoleOpen() || this.FatalErrorOccurred) return;
        	}
    	}
		
		if (error.type == 'session_error' || error.type == 'php_error') {
			//session errors and php errors are considered fatal since they indicate the start of an error cascade
			this.FatalErrorOccurred = true;
		}

		if( error.error) {
			if (typeof SiteFusion.Errors[error.type] != "undefined") {
				message = SiteFusion.Errors[error.type].message;
				check = SiteFusion.Errors[error.type].errorConsoleOption;
			}
			else {
				message = SFStringBundleObj.GetStringFromName('error_unspecified_error') + ': ' + error.type;
			}
			var targetWindow = window;
	        winUtils = targetWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);

	        try {
		        if (winUtils && !winUtils.isParentWindowMainWidgetVisible) {
		            targetWindow = null;
		        }
	    	}
	    	catch (e) {
	    		targetWindow = null;
	    	}

			if( message ) {
				if (check) {
					var checkState = { value: debug };
					PromptService.alertCheck( targetWindow, SFStringBundleObj.GetStringFromName('error'), message, SFStringBundleObj.GetStringFromName('openErrorConsole'), checkState );
					if( checkState.value )
						SiteFusion.OpenErrorConsole();
				}
				else {
					var checkState = { value: debug };
					PromptService.alert( targetWindow, SFStringBundleObj.GetStringFromName('error'), message);
				}
			}
			else {
					//unspecified errors should always show checkbox
					var checkState = { value: debug };
					PromptService.alertCheck( targetWindow, SFStringBundleObj.GetStringFromName('error'), message, SFStringBundleObj.GetStringFromName('openErrorConsole'), checkState );
			}
		}
		else if( debug )
			SiteFusion.OpenErrorConsole();
	},
	
	ServerError: function( text ) {
		var extendedMsg = null;
		var consoleService = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
		
		if( text.match( /\n\n/ ) ) {
			var parts = text.split( "\n\n" );
			text = parts[0];
			extendedMsg = parts[1];
		}
		
		var re = /^(.+) in (.+) on line (\d+)/i;
		var error = text.match( re );
		if( error ) {
			var scriptError = Cc["@mozilla.org/scripterror;1"].createInstance(Ci.nsIScriptError);
			scriptError.init( error[1], error[2], null, parseInt(error[3]), 0, 0, "PHP" );
			consoleService.logMessage( scriptError );
		}
		else Components.utils.reportError( text );
		
		if( extendedMsg ) {
			consoleService.logStringMessage( extendedMsg );
		}
	},
	IsErrorConsoleOpen: function() {
		var windowManager = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
		var windowEnum = windowManager.getEnumerator(null);
		while( windowEnum.hasMoreElements() ) {
			var win = windowEnum.getNext();
			if( win.location == "chrome://global/content/console.xul" ) {
				win.focus();
				return true;
			}
		}
		return false;
	},
	OpenErrorConsole: function() {
		if (this.IsErrorConsoleOpen()) {
			return;
		}
		
		window.openDialog( "chrome://global/content/console.xul", '', "chrome,menubar,extra-chrome,toolbar,dialog=no,resizable" );
	},
	
	Error: function( text ) {
		PromptService.alert( window, 'Error', text );
		if( SiteFusion.RootWindow )
			SiteFusion.RootWindow.close();
		else
			close();
	},
	
	ImportErrors: function() {
		
		SiteFusion.Errors['invalid_login'] = { 
			message: SFStringBundleObj.GetStringFromName('invalid_login'),
			errorConsoleOption: false
		};
		SiteFusion.Errors['invalid_app'] = { 
			message: SFStringBundleObj.GetStringFromName('invalid_app'),
			errorConsoleOption: false
		};
		SiteFusion.Errors['no_auth_func'] = { 
			message: SFStringBundleObj.GetStringFromName('no_auth_func'),
			errorConsoleOption: false
		};
		SiteFusion.Errors['server_offline'] = { 
			message: SFStringBundleObj.GetStringFromName('server_offline'),
			errorConsoleOption: true
		};
		SiteFusion.Errors['server_invalid'] = { 
			message: SFStringBundleObj.GetStringFromName('server_invalid'),
			errorConsoleOption: true
		};
		SiteFusion.Errors['unspecified_error'] = { 
			message: SFStringBundleObj.GetStringFromName('unspecified_error'),
			errorConsoleOption: true
		};
		SiteFusion.Errors['js_error'] = { 
			message: SFStringBundleObj.GetStringFromName('js_error'),
			errorConsoleOption: true
		};
		SiteFusion.Errors['php_error'] = { 
			message: SFStringBundleObj.GetStringFromName('php_error'),
			errorConsoleOption: true
		};
		SiteFusion.Errors['session_error'] = { 
			message: SFStringBundleObj.GetStringFromName('session_error'),
			errorConsoleOption: true
		};
		SiteFusion.Errors['input_error'] = { 
			message: SFStringBundleObj.GetStringFromName('input_error'),
			errorConsoleOption: true
		};
		SiteFusion.Errors['empty_error'] = { 
			message: SFStringBundleObj.GetStringFromName('empty_error'),
			errorConsoleOption: true
		};
	},
	
	ParseUri: function (str) {
		var	o   = SiteFusion.ParseUriOptions,
			m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
			uri = {},
			i   = 14;
	
		while (i--) uri[o.key[i]] = m[i] || "";
	
		uri[o.q.name] = {};
		uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
			if ($1) uri[o.q.name][$1] = $2;
		});
	
		return uri;
	},

	ParseUriOptions: {
		strictMode: false,
		key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
		q:   {
			name:   "queryKey",
			parser: /(?:^|&)([^&=]*)=?([^&]*)/g
		},
		parser: {
			strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
			loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
		}
	},

	ChromeToPath: function(aPath) {
		if (!aPath || !(/^chrome:/.test(aPath)))
			return; //not a chrome url
		var rv;

		var ios = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces["nsIIOService"]);
		var uri = ios.newURI(aPath, "UTF-8", null);
		var cr = Components.classes['@mozilla.org/chrome/chrome-registry;1'].getService(Components.interfaces["nsIChromeRegistry"]);
		rv = cr.convertChromeURL(uri).spec;

		if (/^file:/.test(rv))
		rv = this.UrlToPath(rv);
		else
		rv = this.UrlToPath("file://"+rv);

		return rv;
	},

	UrlToPath: function(aPath) {
	    if (!aPath || !/^file:/.test(aPath))
	      return ;
	    var rv;
		var ph = Components.classes["@mozilla.org/network/protocol;1?name=file"]
	        .createInstance(Components.interfaces.nsIFileProtocolHandler);
	    rv = ph.getFileFromURLSpec(aPath).path;
	    return rv;
	}
};
