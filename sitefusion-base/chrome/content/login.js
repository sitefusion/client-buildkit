Components.utils.import("resource://gre/modules/AddonManager.jsm");

SiteFusion.Login = {
	Fields: [
		'address',
		'application',
		'arguments',
		'username',
		'password'
	],
	
	Listeners: [],
	DownloadExtensions: [],
	
	SetListener: function( listener ) {
		this.Listeners.push( listener );
	},
	
	extensionInfo: {},
	
	Init: function() {
		SiteFusion.ImportErrors();
		var oThis = this;
		AddonManager.getAllAddons(function(aAddons) {
			
			var details = {};
			
			aAddons.forEach(function(addon) {
				
				oThis.extensionInfo[addon.id] = {
					name: addon.name,
					version: addon.version,
					userDisabled: addon.userDisabled,
					enabled: ((!addon.userDisabled && !addon.appDisabled) ? true : false),
					isActive: addon.isActive,
					isCompatible: addon.isCompatible,
					installLocationKey: addon.scope,
					isPlatformCompatible: addon.isPlatformCompatible,
					providesUpdatesSecurely: addon.providesUpdatesSecurely,
					scope: addon.scope,
					type: addon.type,
					userDisabled: addon.userDisabled,
					aboutURL: addon.aboutURL,
					description: addon.description,
					homepageURL: addon.homepageURL,
					iconURL: addon.iconURL,
					installDate: addon.installDate.toString(),
					optionsURL: addon.optionsURL,
					size: addon.size,
					sourceURI: (addon.sourceURI) ? addon.sourceURI.spec : '',
					updateDate: addon.updateDate.toString()
				};
				//this has to be done after loading the extensionlist, because it depends on it
				
				var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
				var autoLogin = true;
				var focusElement = null;
				
				for( var n = 0; n < oThis.Fields.length; n++ ) {
					var field = oThis.Fields[n];
					var value = null;
					var forced = false;
					
					if( prefs.getPrefType("sitefusion.forceLogin."+field) == prefs.PREF_STRING ) {
						value = prefs.getCharPref( "sitefusion.forceLogin."+field );
						forced = true;
					}
					else if( prefs.getPrefType("sitefusion.lastLogin."+field) == prefs.PREF_STRING ) {
						value = prefs.getCharPref( "sitefusion.lastLogin."+field );
						forced = false;
					}
					
					details[field] = { 'value': value, 'forced': forced };
				}
				
				setTimeout(function() {
					if(prefs.getPrefType("sitefusion.autoLogin.enabled") == prefs.PREF_BOOL && prefs.getBoolPref("sitefusion.autoLogin.enabled") ) {
						prefs.setBoolPref( "sitefusion.autoLogin.enabled", false );
						var address = prefs.getCharPref( "sitefusion.autoLogin.address" );
						prefs.setCharPref( "sitefusion.autoLogin.address", "" );
						var application = prefs.getCharPref( "sitefusion.autoLogin.application" );
						prefs.setCharPref( "sitefusion.autoLogin.application", "" );
						var arguments = prefs.getCharPref( "sitefusion.autoLogin.arguments" );
						prefs.setCharPref( "sitefusion.autoLogin.arguments", "" );
						var username = prefs.getCharPref( "sitefusion.autoLogin.username" );
						prefs.setCharPref( "sitefusion.autoLogin.username", "" );
						var password = prefs.getCharPref( "sitefusion.autoLogin.password" );
						prefs.setCharPref( "sitefusion.autoLogin.password", "" );
						
						SiteFusion.Login.OnLogin( address, application, arguments, username, password, false );
					}
				},500);
			});
			
			for( var n = 0; n < oThis.Listeners.length; n++ ) {
					oThis.Listeners[n].onInit( details );
			}
				
		});
	},
	
	OnClose: function(keepLoginDetails) {
		if (!keepLoginDetails) {
			this.ForgetLoginDetails();
		}
		window.close();
	},
	
	ForgetLoginDetails: function() {
		var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
		//don't save details? Clean them up!
		prefs.setCharPref( "sitefusion.lastLogin.username",  '' );
		prefs.setCharPref( "sitefusion.lastLogin.password", '' );
	},
	
	OnLogin: function( address, application, arguments, username, password, rememberDetails ) {
		for( var n = 0; n < this.Listeners.length; n++ ) {
			this.Listeners[n].onLogin( { 'address': address, 'application': application, 'arguments': arguments, 'username': username, 'password': password } );
		}
		
		if( rememberDetails ) {
			var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
			
			prefs.setCharPref( "sitefusion.lastLogin.address", address + '' );
			prefs.setCharPref( "sitefusion.lastLogin.application", application + '' );
			prefs.setCharPref( "sitefusion.lastLogin.arguments", arguments + '' );
			prefs.setCharPref( "sitefusion.lastLogin.username", username + '' );
			prefs.setCharPref( "sitefusion.lastLogin.password", password + '' );
		}
		else {
			this.ForgetLoginDetails();
		}
		
		SiteFusion.ClientID = SiteFusion.GetRandomQuery();
        
        var serverAddressParts = SiteFusion.parseUri(address);
		var serverHost = serverAddressParts.host;
        
        var DNSResolver = Components.classes["@mozilla.org/network/dns-service;1"].getService(Components.interfaces.nsIDNSService );
		
		for( var n = 0; n < this.Listeners.length; n++ ) {
			this.Listeners[n].onProgress( SiteFusion.Login.ProgressListener.STAGE_NSLOOKUP_START, null, null, SFStringBundleObj.GetStringFromName('resolvingServerAddress') + ": " + serverHost );
		}
		
        try {
            var dns = DNSResolver.resolve(serverHost,4);
            var serverIp = dns.getNextAddrAsString();
        }
        catch (e) {
        	for( var n = 0; n < this.Listeners.length; n++ ) {
				this.Listeners[n].onFinish( false, SiteFusion.Login.ProgressListener.ERROR_NSLOOKUP_FAILED, SFStringBundleObj.GetStringFromName("short_cantConnect") );
			}
			SiteFusion.HandleError( { 'error': true, 'type': 'server_offline', 'message': 'Cant resolve hostaddress ' + serverHost  } );
			return false;
        }
		
		for( var n = 0; n < this.Listeners.length; n++ ) {
			this.Listeners[n].onProgress( SiteFusion.Login.ProgressListener.STAGE_NSLOOKUP_COMPLETE, null, null, SFStringBundleObj.GetStringFromName("serverAdressResolved") + ": " + serverIp );
		}
		
		var x = new XMLHttpRequest;
		try {
			for( var n = 0; n < this.Listeners.length; n++ ) {
				this.Listeners[n].onProgress( SiteFusion.Login.ProgressListener.STAGE_CONNECT_START, null, null, SFStringBundleObj.GetStringFromName("connectingTo") + ": " + address );
			}

			var platformInfo = {
				appCodeName: navigator.appCodeName,
				appName: navigator.appName,
				appVersion: navigator.appVersion,
				buildID: navigator.buildID,
				language: navigator.language,
				oscpu: navigator.oscpu,
				platform: navigator.platform,
				vendor: navigator.vendor,
				vendorSub: navigator.vendorSub
			};

			var appInfoObj = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
			var appInfo = {
				vendor: appInfoObj.vendor,
				name: appInfoObj.name,
				ID: appInfoObj.ID,
				version: appInfoObj.version,
				appBuildID: appInfoObj.appBuildID,
				platformVersion: appInfoObj.platformVersion,
				platformBuildID: appInfoObj.platformBuildID
			};
			
			SiteFusion.Version = appInfo.version;

			var cmdlineArgs = {};
			var query = location.search.substr(1);

			if( query.length ) {
				var cmdline = query.split('&');
				for( var n = 0; n < cmdline.length; n++ ) {
					var arg = cmdline[n].split('=');
					cmdlineArgs[arg[0]] = (arg[1] == 'true' ? true:arg[1]);
				}
			}
			
			x.open( 'POST', address + '/login.php?app=' + application + '&args=' + arguments + '&clientid=' + SiteFusion.ClientID, false );
			x.setRequestHeader( 'Content-Type', 'sitefusion/login' );
			x.send( Object.toJSON( {
				'username': username,
				'password': password,
				'appInfo': appInfo,
				'platformInfo': platformInfo,
				'extensionInfo': SiteFusion.Login.extensionInfo,
				'cmdlineArgs': cmdlineArgs
			} ) );
		}
		catch(e) {
			for( var n = 0; n < this.Listeners.length; n++ ) {
				this.Listeners[n].onFinish( false, SiteFusion.Login.ProgressListener.ERROR_SERVER_DOWN, SFStringBundleObj.GetStringFromName("short_cantConnect") );
			}
			
			SiteFusion.HandleError( { 'error': true, 'type': 'server_offline', 'message': e } );
			return false;
		}
		
		if( x.status != 200 ) {
			for( var n = 0; n < this.Listeners.length; n++ ) {
				this.Listeners[n].onFinish( false, SiteFusion.Login.ProgressListener.ERROR_SERVER_DOWN, SFStringBundleObj.GetStringFromName("short_cantConnect") );
			}
			
			SiteFusion.HandleError( { 'error': true, 'type': 'server_offline', 'message': 'Server returned response code ' + x.status } );
			return false;
		}
		
		var result, login;
		if( result = x.getResponseHeader('Content-Type').match( /sitefusion\/(result|error)/ ) ) {
			if( result[1] == 'error' ) {
				for( var n = 0; n < this.Listeners.length; n++ ) {
					this.Listeners[n].onFinish( false, SiteFusion.Login.ProgressListener.ERROR_LOGIN_INVALID, SFStringBundleObj.GetStringFromName("short_cantConnect") );
				}
			
				SiteFusion.HandleError( eval( '(' + x.responseText + ')' ) );
				
				return false;
			}
			
			login = eval( '(' + x.responseText + ')' );
		}
		else {
			for( var n = 0; n < this.Listeners.length; n++ ) {
				this.Listeners[n].onFinish( false, SiteFusion.Login.ProgressListener.ERROR_SERVER_INVALID, SFStringBundleObj.GetStringFromName("short_cantConnect") );
			}
			
			SiteFusion.HandleError( { 'error': true, 'type': 'server_invalid', 'message': x.responseText } );
			return false;
		}
		
		for( var n = 0; n < this.Listeners.length; n++ ) {
			this.Listeners[n].onProgress( SiteFusion.Login.ProgressListener.STAGE_CONNECT_COMPLETE, null, null, null );
		}
		
		SiteFusion.Address = address;
		SiteFusion.Application = application;
		SiteFusion.Arguments = arguments;
		SiteFusion.Username = username;
		SiteFusion.Ident = login.ident;
		SiteFusion.SID = login.sid;
		SiteFusion.RemoteLibraries = login.includeJs.split(',');
		SiteFusion.ExtensionPolicy = login.extensionPolicy ? login.extensionPolicy : {};
		
		
		for( var n = 0; n < this.Listeners.length; n++ ) {
			this.Listeners[n].onProgress( SiteFusion.Login.ProgressListener.STAGE_LOADING_START, 0, null, null );
		}
		
		var restartRequired = false;
		if (login.extensionPolicy.length) {
			for ( var n = 0; n < login.extensionPolicy.length; n++ ) {
				var id = login.extensionPolicy[n][0];
				var action = login.extensionPolicy[n][1];
				
				switch ( action ) {
					case 'enable':
						if( SiteFusion.Login.extensionInfo[id].userDisabled ) {
							restartRequired = true;
							AddonManager.getAddonByID(
							  id,
							  function(addon) {
							  	addon.userDisabled = false;
							  	delete login.extensionPolicy.shift();
							  	if (!login.extensionPolicy.length) {
							  		SiteFusion.Login.StoreCredentialsAndRestart(address, application, SiteFusion.Arguments, username, password);
							  	}
							  }
							);
						}
					break;
					case 'disable':
						if( !SiteFusion.Login.extensionInfo[id].userDisabled ) {
							restartRequired = true;
							AddonManager.getAddonByID(
						  	  id,
						  	  function(addon) {
								addon.userDisabled = true;
								login.extensionPolicy.shift();
								
							  	if (!login.extensionPolicy.length) {
							  		SiteFusion.Login.StoreCredentialsAndRestart(address, application, SiteFusion.Arguments, username, password);
						  		}
							  }
							);
							
						}
					break;
					case 'get':
						if( SiteFusion.Login.extensionInfo[id] == undefined) {
							SiteFusion.Login.DownloadExtensions.push( login.extensionPolicy[n][2] );
							login.extensionPolicy.shift();
						}
					break;
				}
			}
			
			if( SiteFusion.Login.DownloadExtensions.length ) {
				this.StoreCredentialsAndRestart(address, application, SiteFusion.Arguments, username, password);
				return;
			}	
			else if (restartRequired) return;
		}
		
		SiteFusion.Login.GetLibraries();
		
		for( var n = 0; n < this.Listeners.length; n++ ) {
			SiteFusion.Login.Listeners[n].onProgress( SiteFusion.Login.ProgressListener.STAGE_LOADING_COMPLETE, null, null, null );
		}
		
		var flags = 'chrome';
		if( login.alwaysLowered )
			flags += ',alwaysLowered';
		if( login.alwaysRaised )
			flags += ',alwaysRaised';
		if( login.centerscreen )
			flags += ',centerscreen';
		if( login.resizable )
			flags += ',resizable';
		if( login.width )
			flags += ',width='+login.width;
		if( login.height )
			flags += ',height='+login.height;
		
		SiteFusion.Login.OpenRootWindow(flags);
		
		for( var n = 0; n < this.Listeners.length; n++ ) {
			SiteFusion.Login.Listeners[n].onFinish( true, null, null );
		}
	},
	
	StoreCredentialsAndRestart: function (address, application, args, username, password) {
		var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
			prefs.setBoolPref( "sitefusion.autoLogin.enabled", true );
			prefs.setCharPref( "sitefusion.autoLogin.address", address + '' );
			prefs.setCharPref( "sitefusion.autoLogin.application", application + '' );
			prefs.setCharPref( "sitefusion.autoLogin.arguments", args + '' );
			prefs.setCharPref( "sitefusion.autoLogin.username", username + '' );
			prefs.setCharPref( "sitefusion.autoLogin.password", password + '' );
			
			
			if( SiteFusion.Login.DownloadExtensions.length ) {
				var fileName = SiteFusion.Login.DownloadExtensions.shift();
				var destPath = SiteFusion.Login.GetDownloadLocation( fileName );
				SiteFusion.Login.DownloadExtension( fileName, destPath );
			}
			else {
				SiteFusion.Login.RestartApp();
			}	
	},
	
	OnExtensionDownloadProgress: function( listener, id, progress ) {
		if( listener.done ) {
			if( SiteFusion.Login.DownloadExtensions.length ) {
				var id = SiteFusion.Login.DownloadExtensions.shift();
				var file = SiteFusion.Login.GetDownloadLocation( id );
				SiteFusion.Login.DownloadExtension( id, file );
				return;
			}
			else {
				SiteFusion.Login.RestartApp();
			}
		}
		
		for( var l = 0; l < SiteFusion.Login.Listeners.length; l++ ) {
			SiteFusion.Login.Listeners[l].onProgress( SiteFusion.Login.ProgressListener.STAGE_LOADING, progress * 100, id, SFStringBundleObj.GetStringFromName("loadingLibrary") + ': ' + id );
		}
	},
	
	GetDownloadLocation: function( file ) {
		var profD = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
		
		var extDir = profD.parent;
		extDir = extDir.parent;
		extDir.append('sitefusion-install-extensions');
		if( !extDir.exists() || !extDir.isDirectory() ) {
			extDir.create(Ci.nsIFile.DIRECTORY_TYPE, 0755);
		}
		extDir.append(file);
		return extDir;
	},
	
	DownloadExtension: function( id, path ) {
		var progressListener = {
			stateIsRequest:false,
			done: false,
	        QueryInterface : function(aIID) {
	            if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
	                aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
	                aIID.equals(Components.interfaces.nsISupports))
	                    return this;
	            throw Components.results.NS_NOINTERFACE;
	        },
			onStateChange: function( webProgress, request, stateFlags, status ) {},
			onProgressChange: function( webProgress, request, curSelfProgress, maxSelfProgress, curTotalProgress, maxTotalProgress ) {
				if( curSelfProgress == maxSelfProgress )
					this.done = true;
				SiteFusion.Login.OnExtensionDownloadProgress( this, this.extensionId, curSelfProgress/maxSelfProgress );
			},
			onLocationChange: function( webProgress, request, location ) {},
			onStatusChange: function( webProgress, request, status, message ) {},
			onSecurityChange: function( webProgress, request, state ) {}
		};
		
		progressListener.extensionId = id;
		
		var httpLoc = SiteFusion.Address + '/getextension.php?app=' + SiteFusion.Application + '&args=' + SiteFusion.Arguments + '&sid=' + SiteFusion.SID + '&ident=' + SiteFusion.Ident + '&extension=' + escape(id);
		
		try {
			//new obj_URI object
			var url = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService).newURI(httpLoc, null, null);
	
			//if file doesn't exist, create
			if(!path.exists()) {
				path.create(0x00,0644);
			}
			//new persitence object
			var persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Ci.nsIWebBrowserPersist);
			
			//save file to target
			persist.progressListener = progressListener;
			var nsIWBP = Ci.nsIWebBrowserPersist;

			persist.persistFlags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES |
			            nsIWBP.PERSIST_FLAGS_BYPASS_CACHE |
			            nsIWBP.PERSIST_FLAGS_FAIL_ON_BROKEN_LINKS |
			            nsIWBP.PERSIST_FLAGS_CLEANUP_ON_FAILURE;
			
			persist.saveURI(url,null,null,null,null,path);
			return progressListener;
			
		} catch (e) {
			SiteFusion.Error(e);
		}
	},
	
	RestartApp: function() {
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
			.quit(Components.interfaces.nsIAppStartup.eRestart | Components.interfaces.nsIAppStartup.eAttemptQuit);
	},
	
	OpenRootWindow: function(flags) {
		var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

		open( prefs.getCharPref("sitefusion.defaultRootWindowURI")+location.search, '', flags );
	},
	
	GetLibraries: function() {
		var d = new Date();
		
		for( var n = 0; n < SiteFusion.RemoteLibraries.length; n++ ) {
			try {
				var x = new XMLHttpRequest;
				x.open( 'GET', SiteFusion.Address + '/jslibrary.php?name=' + SiteFusion.RemoteLibraries[n] + '&app=' + SiteFusion.Application + '&args=' + SiteFusion.Arguments + '&sid=' + SiteFusion.SID + '&ident=' + SiteFusion.Ident + '&cycle=' + d.getTime(), false );
				x.send(null);

				if( x.status != 200 ) {
					SiteFusion.Error( SFStringBundleObj.GetStringFromName('cantLoadLib') + ": " + SiteFusion.RemoteLibraries[n] );
					break;
				}
			}
			catch( e ) {
				SiteFusion.Error( SFStringBundleObj.GetStringFromName('cantLoadLibCon') + ": " + SiteFusion.RemoteLibraries[n] );
			}
			
			SiteFusion.LibraryContent.push( [ SiteFusion.RemoteLibraries[n] + '.js', x.responseText ] );
			
			for( var l = 0; l < this.Listeners.length; l++ ) {
				this.Listeners[l].onProgress( SiteFusion.Login.ProgressListener.STAGE_LOADING, (99 / SiteFusion.RemoteLibraries.length) * (n+1), SiteFusion.RemoteLibraries[n], SFStringBundleObj.GetStringFromName("loadingLibrary") + ': ' + SiteFusion.RemoteLibraries[n] );
			}
		}
	},
	
	/* This is the default progress listener for the basic login chrome
	   Adjust as nescessary in new brandings
	*/
	
	ProgressListener: {
		STAGE_NSLOOKUP_START: 1,
		STAGE_NSLOOKUP_COMPLETE: 2,
		STAGE_CONNECT_START: 3,
		STAGE_CONNECT_COMPLETE: 4,
		STAGE_LOADING_START: 5,
		STAGE_LOADING: 6,
		STAGE_LOADING_COMPLETE: 7,
		
		ERROR_NSLOOKUP_FAILED: 1,
		ERROR_SERVER_DOWN: 2,
		ERROR_SERVER_INVALID: 3,
		ERROR_LOGIN_INVALID: 4,
		
		onInit: function( savedDetails ) {
			for ( field in savedDetails ) {
				var el = document.getElementById(field);
				el.value = savedDetails[field].value;
				if( savedDetails[field].forced )
					el.hidden = true;
			}
		},
		
		onLogin: function( details ) {
			document.getElementById('button-login').disabled = true;
		},
		
		onProgress: function( stage, percent, currentLib, localizedText ) {
			var pm = document.getElementById( 'loginprogress' );
			var pmInfo = document.getElementById( 'loginprogress-info' );
			
			if( percent !== null ) {
				pm.mode = 'determined';
				pm.value = percent;
			}
			if( localizedText !== null ) {
				pmInfo.value = localizedText;
			}
		},
		
		onFinish: function( success, error, localizedText ) {
			var pmInfo = document.getElementById( 'loginprogress-info' );
			
			if( localizedText !== null ) {
				pmInfo.value = localizedText;
			}
			
			if( ! success )
				document.getElementById('button-login').disabled = false;
		}
	}
};