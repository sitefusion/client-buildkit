Components.utils.import("resource://gre/modules/AddonManager.jsm");

var System = {
	needRestart: false,
	restartAfterInstall: false,
	installationsInProgress: [],
	consoleService: null,
	query: '',

	Restart: function() {
		// Notify all windows that an application quit has been requested.
		var os = Components.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService);
		var cancelQuit = Components.classes["@mozilla.org/supports-PRBool;1"]
			.createInstance(Components.interfaces.nsISupportsPRBool);
		os.notifyObservers(cancelQuit, "quit-application-requested", "restart");

		// Something aborted the quit process.
		if (cancelQuit.data)
			return;
		var flags = 0;
		if( navigator.platform.match(/mac/i)) {
			var SFStringBundleObj = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService).createBundle('chrome://sitefusion/locale/sitefusion.properties');
			var PromptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
			PromptService.alert( null, SFStringBundleObj.GetStringFromName('restart'), SFStringBundleObj.GetStringFromName('appRequiredManualRestart'));

			flags = Components.interfaces.nsIAppStartup.eAttemptQuit;
		}
		else {
			flags = Components.interfaces.nsIAppStartup.eRestart | Components.interfaces.nsIAppStartup.eAttemptQuit;
		}

		Components.classes["@mozilla.org/toolkit/app-startup;1"]
			.getService(Components.interfaces.nsIAppStartup)
			.quit(flags);
	},

	Shutdown: function() {
		// Notify all windows that an application quit has been requested.
		var os = Components.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService);
		var cancelQuit = Components.classes["@mozilla.org/supports-PRBool;1"]
			.createInstance(Components.interfaces.nsISupportsPRBool);
		os.notifyObservers(cancelQuit, "quit-application-requested", "restart");

		// Something aborted the quit process.
		if (cancelQuit.data)
			return;

		Components.classes["@mozilla.org/toolkit/app-startup;1"]
			.getService(Components.interfaces.nsIAppStartup)
			.quit(Components.interfaces.nsIAppStartup.eAttemptQuit);
	},

	InstallExtension: function(xpiPath, deleteAfterwards) {
		var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(xpiPath);
		if( file.exists() == false ) {
			return false;
		}

		var oThis = this;
		this.installationsInProgress.push(file.path);
		AddonManager.getInstallForFile(file, function(aInstall) {
  		if (deleteAfterwards)
  			aInstall.addListener({'onInstallEnded': function(bInstall, bAddon) {bInstall.file.remove(false);}});
  		aInstall.addListener({'onInstallEnded': function(bInstall, bAddon) {
  			for(var i=0; i<oThis.installationsInProgress.length; i++) {
        	if(oThis.installationsInProgress[i] == bInstall.file.path) {
            oThis.installationsInProgress.splice(i, 1);
            break;
        	}
      	}

  		}});
  		aInstall.install();
		}, "application/x-xpinstall");

		this.needRestart = true;
		return true;
	},

	GetExtensionInstallDirectories: function() {

		var extDirs = [];

		var profD = Components.classes["@mozilla.org/file/directory_service;1"]
			.getService(Components.interfaces.nsIProperties)
			.get("ProfD", Components.interfaces.nsIFile);

		var extDir = profD.parent;
		extDir = extDir.parent;
		extDir.append('sitefusion-install-extensions');
		extDirs.push(extDir);

		var appD = Components.classes["@mozilla.org/file/directory_service;1"]
			.getService(Components.interfaces.nsIProperties)
			.get("CurProcD", Components.interfaces.nsIFile);

		var exDirApp = appD;
		exDirApp.append('sitefusion-install-extensions');

		extDirs.push(exDirApp);

		return extDirs;
	},

	StartupInit: function() {

		if( window.arguments && window.arguments[0] ) {
			var startDebugger = false;
			var cmdline = window.arguments[0].QueryInterface(Components.interfaces.nsICommandLine);

			for( var n = 0; n < cmdline.length; n++ ) {
				var arg = cmdline.getArgument(n);
				if (arg == "chrome://browser/content/devtools/framework/toolbox-process-window.xul") {
					startDebugger = true;
				}
				if( arg.substr(0,1) == '-' && cmdline.length-1 > n ) {
					var name = arg.replace(/^\-+/,'');
					this.query += (this.query == ''?'':'&')+escape(name)+'='+escape(cmdline.getArgument(n+1));
					n++;
				}
				else
					this.query += (this.query == ''?'':'&')+escape(arg)+'=true';
			}
			if (startDebugger) {
				var ret = window.open("chrome://browser/content/devtools/framework/toolbox-process-window.xul",'sitefusion-window','chrome,extra-chrome,centerscreen');
				window.close();
				return;
			}
		}

		this.needRestart = false;
		this.restartAfterInstall = false;

		var parts = this.query.split('&');
		for (var i=0; i < parts.length; i++) {
			var subparts = parts[i].split("=");
			if (subparts.length == 2 && subparts[0] == "installextension" && subparts[1].length > 0) {
				System.InstallExtension(unescape(subparts[1], false));
			}
			if (parts[i] == "restart=true") {
				this.restartAfterInstall = true;
			}
		}

		this.checkForNewExtensions();
	},

	checkForNewExtensions: function () {
		var extDirs = System.GetExtensionInstallDirectories();

		for (var n =0; n < extDirs.length; n++) {
			var extDir = extDirs[n];
			if( extDir.exists() ) {
				var entries = extDir.directoryEntries;
				var array = [];
				while(entries.hasMoreElements()) {
					var entry = entries.getNext();
					entry.QueryInterface(Components.interfaces.nsIFile);
					array.push(entry);
				}

				for( var i = 0; i < array.length; i++ ) {
					if( array[i].path.substr(-4) == '.xpi' ) {
						System.InstallExtension(array[i].path, true);
					}
					this.restartAfterInstall = true;
				}
			}
		}
		var oThis = this;

		if (this.installationsInProgress.length) {
			var oThis = this;
			setTimeout(function() {oThis.waitForInstalling(oThis);},100);
		}
		else {
				oThis.openLoginWindow();
		}
	},

	waitForInstalling: function(oThis) {

			if (oThis.installationsInProgress.length) {
				setTimeout(function() {oThis.waitForInstalling(oThis );},100);
			}
			else {
				if (oThis.needRestart) {
					if (oThis.restartAfterInstall) {
						System.Restart();
					}
					else
						System.Shutdown();
					return;
				}
				oThis.openLoginWindow();
			}
	},

	openLoginWindow: function() {
		var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

		if( prefs.getPrefType("sitefusion.defaultLoginWindowURI") != prefs.PREF_STRING ) {
			prefs.setCharPref( "sitefusion.defaultLoginWindowURI", "chrome://sitefusion/content/login.xul" );
		}
		if( prefs.getPrefType("sitefusion.defaultRootWindowURI") != prefs.PREF_STRING ) {
			prefs.setCharPref( "sitefusion.defaultRootWindowURI", "chrome://sitefusion/content/rootwindow.xul" );
		}
		if( prefs.getPrefType("sitefusion.defaultChildWindowURI") != prefs.PREF_STRING ) {
			prefs.setCharPref( "sitefusion.defaultChildWindowURI", "chrome://sitefusion/content/childwindow.xul" );
		}
		if( prefs.getPrefType("sitefusion.defaultPrefWindowURI") != prefs.PREF_STRING ) {
			prefs.setCharPref( "sitefusion.defaultPrefWindowURI", "chrome://sitefusion/content/prefwindow.xul" );
		}
		if( prefs.getPrefType("sitefusion.defaultDialogURI") != prefs.PREF_STRING ) {
			prefs.setCharPref( "sitefusion.defaultDialogURI", "chrome://sitefusion/content/dialog.xul" );
		}
		var ret = window.open(prefs.getCharPref( "sitefusion.defaultLoginWindowURI") + '?'+this.query,'sitefusion-window','chrome,extra-chrome,centerscreen');
		if( !navigator.platform.match(/mac/i)) {
			window.close();
		}
		return ret;
	}
}
